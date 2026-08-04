import path from 'path';
import { prisma } from '../db/prisma';
import {
  calculatePackageHealth,
  checkOutdatedDependencies,
} from '@mindfiredigital/utils';
import { scanMonorepo } from '../utils/utilities';
import {
  funCheckBuildStatus,
  funCheckTestCoverage,
  funCheckLintStatus,
  funCheckSecurityAudit,
} from '@mindfiredigital/monorepo-scanner';
import { appConfig } from '../config-loader';
import { storePackage } from '../utils/helpers';

export const getSystemHealth = () => {
  return {
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
    services: {
      scanner: 'active',
      ci: 'active',
      database: 'active',
    },
  };
};
export const getPackageHealthMetrics = async (
  name: string,
  targetRoot?: string
) => {
  const rootPath =
    targetRoot || process.env.MONODOG_TARGET_ROOT || process.cwd();
  const packages = await scanMonorepo(rootPath);

  const pkg = packages.find(p => p.name === name);

  if (!pkg) {
    throw new Error('Package not found');
  }

  const buildStatus = await funCheckBuildStatus(pkg);
  const testCoverage = await funCheckTestCoverage(
    pkg,
    appConfig.health?.testCoveragePath
  );
  const lintStatus = await funCheckLintStatus(pkg);
  const securityAudit = await funCheckSecurityAudit(pkg);

  const overallScore = calculatePackageHealth(
    buildStatus,
    testCoverage,
    lintStatus,
    securityAudit
  );

  return {
    packageName: name,
    health: {
      buildStatus,
      testCoverage,
      lintStatus,
      securityAudit,
      overallScore: overallScore.overallScore,
      lastUpdated: new Date(),
    },

    dependencies: {
      dependencies: pkg.dependencies || [],
      devDependencies: pkg.devDependencies || [],
      peerDependencies: pkg.peerDependencies || [],
    },
  };
};

export const getAllPackagesHealthMetrics = async (targetRoot?: string) => {
  const rootPath =
    targetRoot || process.env.MONODOG_TARGET_ROOT || process.cwd();
  let packageHealthData = await prisma.packageHealth.findMany();

  // Auto-initialize if database has 0 health records
  if (!packageHealthData || packageHealthData.length === 0) {
    try {
      const rootDir = path.resolve(rootPath);
      const monorepoPkgs = await scanMonorepo(rootDir);

      for (const pkg of monorepoPkgs) {
        await storePackage(pkg).catch(() => {});
        await prisma.packageHealth.upsert({
          where: { packageName: pkg.name },
          update: {},
          create: {
            packageName: pkg.name,
            packageOverallScore: 0,
            packageBuildStatus: 'unknown',
            packageTestCoverage: 0,
            packageLintStatus: 'unknown',
            packageSecurity: 'unknown',
            packageDependencies: 'up-to-date',
          },
        });
      }

      packageHealthData = await prisma.packageHealth.findMany();
    } catch (initErr) {
      console.warn('Error auto-initializing package health records:', initErr);
    }
  }

  const packages = (packageHealthData || []).map((pkg: any) => {
    const score = pkg.packageOverallScore ?? pkg.overallScore ?? null;
    const health = {
      buildStatus: pkg.packageBuildStatus || 'unknown',
      testCoverage: pkg.packageTestCoverage ?? 0,
      lintStatus: pkg.packageLintStatus || 'unknown',
      securityAudit: pkg.packageSecurity || 'unknown',
      dependencyStatus: pkg.packageDependencies || 'unknown',
      overallScore: score,
    };

    return {
      packageName: pkg.packageName,
      health,
      isHealthy: typeof score === 'number' ? score >= 70 : null,
    };
  });

  const total = packages.length;
  const healthy = packages.filter((pkg: any) => pkg.isHealthy).length;
  const unhealthy = packages.filter((pkg: any) => !pkg.isHealthy).length;

  const averageScore =
    packages.length > 0
      ? packages.reduce(
          (sum: number, pkg: any) => sum + pkg.health.overallScore,
          0
        ) / packages.length
      : 0;

  return {
    packages,
    summary: {
      total,
      healthy,
      unhealthy,
      averageScore: Math.round(averageScore * 100) / 100,
    },
  };
};

export interface HealthJobStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalPackages: number;
  completedPackages: number;
  currentPackage?: string;
  currentStep?: string;
  error?: string;
  updatedAt: string;
}

let activeHealthJob: HealthJobStatus = {
  status: 'idle',
  progress: 0,
  totalPackages: 0,
  completedPackages: 0,
  updatedAt: new Date().toISOString(),
};

export const getHealthJobStatus = (): HealthJobStatus => activeHealthJob;

export const triggerAsyncRefreshPackagesHealth = (rootPath?: string) => {
  if (activeHealthJob.status === 'processing') {
    return activeHealthJob;
  }

  activeHealthJob = {
    status: 'processing',
    progress: 5,
    totalPackages: 0,
    completedPackages: 0,
    currentStep: 'Scanning monorepo packages...',
    updatedAt: new Date().toISOString(),
  };

  executeBackgroundHealthRefresh(rootPath).catch(err => {
    console.error('Error during background health refresh:', err);
    activeHealthJob = {
      ...activeHealthJob,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Health scan failed',
      updatedAt: new Date().toISOString(),
    };
  });

  return activeHealthJob;
};

const executeBackgroundHealthRefresh = async (rootPath?: string) => {
  const resolvedRootPath =
    rootPath || process.env.MONODOG_TARGET_ROOT || process.cwd();
  const rootDir = path.resolve(resolvedRootPath);

  const packages = await scanMonorepo(rootDir);
  const total = packages.length;

  activeHealthJob = {
    ...activeHealthJob,
    totalPackages: total,
    progress: 10,
    currentStep: `Found ${total} packages. Starting health checks...`,
    updatedAt: new Date().toISOString(),
  };

  let completed = 0;

  for (const pkg of packages) {
    activeHealthJob = {
      ...activeHealthJob,
      currentPackage: pkg.name,
      currentStep: `Scanning ${pkg.name} (${completed + 1}/${total})...`,
      progress: Math.floor(10 + (completed / total) * 85),
      updatedAt: new Date().toISOString(),
    };

    // Isolate every check so individual scanner errors NEVER break DB upserts
    const buildStatus = await funCheckBuildStatus(pkg).catch(() => 'failed');
    const testCoverage = await funCheckTestCoverage(
      pkg,
      appConfig.health?.testCoveragePath
    ).catch(() => 0);
    const lintStatus = await funCheckLintStatus(pkg).catch(() => 'unknown');
    const securityAudit = await funCheckSecurityAudit(
      pkg,
      resolvedRootPath
    ).catch(() => 'unknown');

    const overallScore = calculatePackageHealth(
      buildStatus,
      testCoverage,
      lintStatus,
      securityAudit
    );

    let dependencyStatus = 'up-to-date';
    try {
      const outdatedDeps = await checkOutdatedDependencies(pkg);
      dependencyStatus =
        outdatedDeps && outdatedDeps.length > 0 ? 'outdated' : 'up-to-date';
    } catch {
      dependencyStatus = 'up-to-date';
    }

    try {
      await storePackage(pkg).catch(() => {});
      await prisma.packageHealth.upsert({
        where: {
          packageName: pkg.name,
        },
        update: {
          packageOverallScore: overallScore.overallScore,
          packageBuildStatus: buildStatus,
          packageTestCoverage: testCoverage,
          packageLintStatus: lintStatus,
          packageSecurity: securityAudit,
          packageDependencies: dependencyStatus,
          updatedAt: new Date(),
        },
        create: {
          packageName: pkg.name,
          packageOverallScore: overallScore.overallScore,
          packageBuildStatus: buildStatus,
          packageTestCoverage: testCoverage,
          packageLintStatus: lintStatus,
          packageSecurity: securityAudit,
          packageDependencies: dependencyStatus,
        },
      });
    } catch (err) {
      console.warn(`Error writing health database row for ${pkg.name}:`, err);
    }

    completed++;
    activeHealthJob = {
      ...activeHealthJob,
      completedPackages: completed,
      progress: Math.floor(10 + (completed / total) * 85),
      updatedAt: new Date().toISOString(),
    };
  }

  activeHealthJob = {
    status: 'completed',
    progress: 100,
    totalPackages: total,
    completedPackages: total,
    currentStep: 'Health scan completed successfully!',
    updatedAt: new Date().toISOString(),
  };
};

export const refreshPackagesHealth = async (rootPath?: string) => {
  await executeBackgroundHealthRefresh(rootPath);
  return getAllPackagesHealthMetrics(rootPath);
};
