/**
 * Changeset Service
 * Handles changeset generation, validation, and publishing
 */

import path from 'path';
import * as yaml from 'js-yaml';
import { readFileSync, existsSync } from 'fs';
import fs from 'fs/promises';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AppLogger } from '../middleware/logger';
import { getPackagesService } from './package.service';
import { getWorkflowRuns, triggerWorkflow } from './github-actions-service';
import { getRepositoryInfoFromGit } from '../utils/utilities';
import { CHANGESET_MESSAGES } from '../constants/api-messages';
import type {
  VersionBump,
  Package,
  VersionBumpItem,
  PublishPlan,
} from '../types/changeset';
import { VALIDATION_ERRORS } from '../constants/error-messages';
const execPromise = promisify(exec);

/**
 * Get all workspace packages
 */
export async function getWorkspacePackages(
  rootPath: string
): Promise<Package[]> {
  try {
    // Get packages from package service
    const packages = await getPackagesService(rootPath);
    return packages.map((pkg: Record<string, unknown>) => ({
      name: pkg.name as string,
      version: (pkg.version as string) || '0.0.0',
      path: pkg.path as string,
      private: (pkg.private as boolean) || false,
      dependencies: (pkg.dependencies as Record<string, string>) || {},
      devDependencies: (pkg.devDependencies as Record<string, string>) || {},
    }));
  } catch (error) {
    AppLogger.error(`Failed to get workspace packages: ${error}`);
    throw error;
  }
}

/**
 * Get existing unpublished changesets
 */
export async function getExistingChangesets(
  rootPath: string
): Promise<string[]> {
  try {
    const changesetsDir = path.join(rootPath, '.changeset');

    try {
      const files = await fs.readdir(changesetsDir);
      return files
        .filter(file => file.endsWith('.md') && file !== 'README.md')
        .map(file => file.replace('.md', ''));
    } catch {
      // Directory doesn't exist yet
      return [];
    }
  } catch (error) {
    AppLogger.error(`Failed to get existing changesets: ${error}`);
    return [];
  }
}

/**
 * Get bump types from existing changesets
 */
export async function getPackageBumpTypes(
  rootPath: string
): Promise<Record<string, string>> {
  const bumpTypes: Record<string, string> = {};
  try {
    const changesetsDir = path.join(rootPath, '.changeset');
    const files = await fs.readdir(changesetsDir);

    for (const file of files) {
      if (file.endsWith('.md') && file !== 'README.md') {
        try {
          const content = await fs.readFile(
            path.join(changesetsDir, file),
            'utf-8'
          );
          const matches = content.matchAll(/"([^"]+)":\s*(major|minor|patch)/g);
          for (const match of matches) {
            const pkgName = match[1];
            const bumpType = match[2];

            // If multiple changesets for same package, keep highest bump
            const priority: Record<string, number> = {
              patch: 1,
              minor: 2,
              major: 3,
            };
            const existingBump = bumpTypes[pkgName];
            if (!existingBump || priority[bumpType] > priority[existingBump]) {
              bumpTypes[pkgName] = bumpType;
            }
          }
        } catch {
          // no changeset markdown file
        }
      }
    }
  } catch {
    // no changeset directory
  }
  return bumpTypes;
}

/**
 * Calculate new versions for selected packages
 */
export function calculateNewVersions(
  packages: Package[],
  bumps: Array<{ package: string; bumpType: VersionBump }>
): VersionBumpItem[] {
  return packages.map(pkg => {
    const bump = bumps.find(b => b.package === pkg.name);
    const bumpType = bump?.bumpType || 'patch';

    const newVersion = calculateVersion(pkg.version, bumpType);

    return {
      package: pkg.name,
      currentVersion: pkg.version,
      newVersion,
      bumpType,
    };
  });
}

/**
 * Calculate new version based on bump type
 */
function calculateVersion(
  currentVersion: string,
  bumpType: VersionBump
): string {
  const parts = currentVersion.split('.').map(p => parseInt(p, 10));
  const [major, minor = 0, patch = 0] = parts;

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Validate that changeset can be created
 */
export async function validateChangeset(
  rootPath: string,
  packages: string[],
  summary: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate packages exist
  const allPackages = await getWorkspacePackages(rootPath);
  for (const pkgName of packages) {
    if (!allPackages.find(p => p.name === pkgName)) {
      errors.push(`Package ${pkgName} not found`);
    }
  }

  // Validate summary
  if (!summary || summary.length < 10) {
    errors.push(VALIDATION_ERRORS.SUMMARY_TOO_SHORT);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a new changeset
 */
export async function generateChangeset(
  rootPath: string,
  packages: string[],
  bumps: Array<{ package: string; bumpType: VersionBump }>,
  summary: string,
  createdBy?: string
): Promise<{ success: boolean; message: string; changeset?: string }> {
  try {
    // Validate input
    const validation = await validateChangeset(rootPath, packages, summary);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errors.join(', '),
      };
    }

    // Create .changeset directory if it doesn't exist
    const changesetsDir = path.join(rootPath, '.changeset');
    try {
      await fs.mkdir(changesetsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique changeset filename (using timestamp + random)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const changesetName = `${timestamp}-${random}`;
    const changesetPath = path.join(changesetsDir, `${changesetName}.md`);

    // Format changeset content
    let content = `---\n`;
    for (const pkg of packages) {
      const bump = bumps.find(b => b.package === pkg);
      const bumpType = bump?.bumpType || 'patch';
      content += `"${pkg}": ${bumpType}\n`;
    }
    content += `---\n\n`;
    content += summary;

    // Write changeset file
    await fs.writeFile(changesetPath, content, 'utf-8');

    try {
      await execPromise('git add .changeset', { cwd: rootPath });
      await execPromise(
        'git commit --no-verify -m "chore: add release changeset"',
        {
          cwd: rootPath,
        }
      );
      AppLogger.info('Automatically committed the new changeset file');
    } catch (gitError) {
      AppLogger.warn(`Failed to auto-commit changeset: ${gitError}`);
    }

    AppLogger.info(
      `Changeset created: ${changesetName} by user: ${createdBy || 'unknown'}`
    );
    return {
      success: true,
      message: CHANGESET_MESSAGES.CREATED,
      changeset: changesetName,
    };
  } catch (error) {
    AppLogger.error(`Failed to generate changeset: ${error}`);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if working tree is clean
 */
export async function isWorkingTreeClean(rootPath: string): Promise<boolean> {
  try {
    const { stdout } = await execPromise('git status --porcelain', {
      cwd: rootPath,
    });
    return stdout.trim().length === 0;
  } catch {
    return false;
  }
}

/**
 * Trigger CI pipeline for publishing
 */
export async function triggerPublishPipeline(
  rootPath: string,
  publishedBy?: string,
  selectedPackages?: object[],
  accessToken?: string | null
): Promise<{ success: boolean; message: string; result?: unknown }> {
  try {
    AppLogger.info(
      `Publishing workflow triggered by user: ${publishedBy || 'unknown'}`
    );

    // Get current branch for workflow trigger
    let currentBranch = 'main';
    try {
      const { stdout: branch } = await execPromise(
        'git rev-parse --abbrev-ref HEAD',
        { cwd: rootPath }
      );
      currentBranch = branch.trim();
    } catch (gitError) {
      AppLogger.warn(`Git branch retrieval failed: ${gitError}`);
    }

    if (accessToken) {
      try {
        const repoInfo = await getRepositoryInfoFromGit(rootPath);
        if (repoInfo) {
          const inputs: Record<string, string> = {};
          try {
            const workflowPath = path.join(
              rootPath,
              '.github',
              'workflows',
              'release.yml'
            );
            if (existsSync(workflowPath)) {
              const fileContents = readFileSync(workflowPath, 'utf8');
              const workflowData = yaml.load(fileContents) as any;
              const dispatchInputs =
                workflowData?.on?.workflow_dispatch?.inputs || {};

              if (dispatchInputs.source) {
                inputs.source = 'monodog';
              }
            }
          } catch (err) {
            AppLogger.warn(`Failed to parse release.yml inputs: ${err}`);
          }

          AppLogger.info(
            `Triggering workflow release.yml on ${repoInfo.owner}/${repoInfo.repo} branch: ${currentBranch}`
          );
          await triggerWorkflow(accessToken, {
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            workflow: 'release.yml',
            ref: currentBranch,
            inputs,
          });
        }
      } catch (triggerError) {
        AppLogger.error(`Failed to trigger GitHub workflow: ${triggerError}`);
      }
    } else {
      AppLogger.warn(
        'No access token provided to triggerPublishPipeline; cannot trigger GitHub workflow'
      );
      return {
        success: false,
        message: 'Authentication Error',
      };
    }

    AppLogger.info('Publish pipeline initiated');
    return {
      success: true,
      message: 'Publishing workflow initiated',
      result: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    AppLogger.error(`Failed to trigger publish pipeline: ${error}`);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if CI pipeline is passing
 * Fetches the most recent workflow run and checks if it passed
 */
export async function checkCIPassing(
  accessToken: string | null | undefined,
  owner: string,
  repo: string,
  workflowId: string,
  workflowPath: string
): Promise<boolean> {
  try {
    if (!accessToken) {
      AppLogger.warn('No access token available for CI check');
      return false;
    }

    const { runs } = await getWorkflowRuns(owner, repo, accessToken, {
      workflowId,
      workflowPath,
      status: 'completed',
      per_page: 1,
    });

    if (!runs || runs.length === 0) {
      AppLogger.warn('No completed workflow runs found');
      return false;
    }

    const latestRun = runs[0];
    const passed = latestRun.conclusion === 'success';

    if (passed) {
      AppLogger.info('CI check passed: Latest workflow run succeeded');
    } else {
      AppLogger.warn(
        `CI check failed: Latest run conclusion is ${latestRun.conclusion}`
      );
    }

    return passed;
  } catch (error) {
    AppLogger.error(`Failed to check CI status: ${error}`);
    return false;
  }
}

const npmCheckCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let activeNpmRequests = 0;
const npmRequestQueue: (() => void)[] = [];

async function acquireNpmRequestSlot(): Promise<void> {
  if (activeNpmRequests < 5) {
    activeNpmRequests++;
    return;
  }
  return new Promise(resolve => {
    npmRequestQueue.push(() => {
      activeNpmRequests++;
      resolve();
    });
  });
}

function releaseNpmRequestSlot(): void {
  activeNpmRequests--;
  if (npmRequestQueue.length > 0) {
    const next = npmRequestQueue.shift();
    if (next) next();
  }
}

/**
 * Check if a package version is available on npm registry
 * Returns true if version does NOT exist (safe to publish)
 * Returns false if version already exists
 */
export async function checkVersionAvailableOnNpm(
  packageName: string,
  version: string
): Promise<boolean> {
  const cacheKey = `${packageName}@${version}`;
  const cached = npmCheckCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  await acquireNpmRequestSlot();

  return new Promise<boolean>(resolve => {
    let settled = false;
    const done = (result: boolean) => {
      if (!settled) {
        settled = true;
        npmCheckCache.set(cacheKey, { result, timestamp: Date.now() });
        releaseNpmRequestSlot();
        resolve(result);
      }
    };

    try {
      const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;

      const request = https.get(url, response => {
        if (response.statusCode === 200) {
          AppLogger.warn(
            `NPM version check: Version ${version} of ${packageName} already exists`
          );
          done(false);
        } else if (response.statusCode === 404) {
          AppLogger.info(
            `NPM version check: Version ${version} of ${packageName} is available`
          );
          done(true);
        } else {
          AppLogger.warn(`NPM check unexpected status ${response.statusCode}`);
          done(false);
        }
      });

      request.on('error', error => {
        AppLogger.error(`Failed to check npm version: ${error}`);
        done(false);
      });

      request.setTimeout(8000, () => {
        request.destroy();
        AppLogger.warn(`NPM registry check timeout for ${packageName}`);
        done(false);
      });
    } catch (error) {
      AppLogger.error(`NPM version check error: ${error}`);
      done(false);
    }
  });
}
