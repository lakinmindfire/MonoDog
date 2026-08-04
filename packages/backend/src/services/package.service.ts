import path from 'path';
import fs from 'fs';
import { prisma } from '../db/prisma';
import { scanMonorepo } from '@mindfiredigital/utils';
import { storePackage } from '../utils/helpers';
import { MonorepoScanner } from '@mindfiredigital/monorepo-scanner';
import { PackageRepository } from '../repositories';
import { AppLogger } from '../middleware';
import type { PackageModel } from '../types/database';
import {
  getPackageBumpTypes,
  checkVersionAvailableOnNpm,
} from './changeset-service';

export const transformPackage = (pkg: any) => {
  const rawHealth = pkg.packageHealth || pkg.health;
  const overallScore: number | null =
    rawHealth?.packageOverallScore ??
    rawHealth?.overallScore ??
    (typeof pkg.overallScore === 'number' ? pkg.overallScore : null);

  const hasScan = typeof overallScore === 'number';

  const isHealthy: boolean | null = hasScan
    ? (rawHealth?.isHealthy ?? overallScore! >= 70)
    : null;

  const status =
    pkg.status && pkg.status !== 'unknown' && pkg.status !== ''
      ? pkg.status
      : hasScan
        ? overallScore! >= 70
          ? 'healthy'
          : overallScore! >= 50
            ? 'warning'
            : 'error'
        : 'unscanned';

  const commitsCount = Array.isArray(pkg.commits)
    ? pkg.commits.length
    : typeof pkg.commits === 'number'
      ? pkg.commits
      : pkg._count?.commits || 0;

  const healthObj = {
    overallScore,
    isHealthy,
    buildStatus:
      rawHealth?.packageBuildStatus || rawHealth?.buildStatus || 'unknown',
    coverageScore:
      rawHealth?.packageTestCoverage ?? rawHealth?.coverageScore ?? 0,
    lintScore:
      rawHealth?.packageLintStatus || rawHealth?.lintScore || 'unknown',
    securityScore:
      rawHealth?.packageSecurity || rawHealth?.securityScore || 'unknown',
    dependenciesScore:
      rawHealth?.packageDependencies ||
      rawHealth?.dependenciesScore ||
      'unknown',
  };

  return {
    ...pkg,
    status,
    commitsCount,
    commits: Array.isArray(pkg.commits)
      ? pkg.commits
      : pkg._count?.commits || 0,
    health: healthObj,
    maintainers: pkg.maintainers
      ? typeof pkg.maintainers === 'string'
        ? JSON.parse(pkg.maintainers)
        : pkg.maintainers
      : [],
    scripts: pkg.scripts
      ? typeof pkg.scripts === 'string'
        ? JSON.parse(pkg.scripts)
        : pkg.scripts
      : {},
    repository: pkg.repository
      ? typeof pkg.repository === 'string'
        ? JSON.parse(pkg.repository)
        : pkg.repository
      : {},
    dependencies: pkg.dependencies
      ? typeof pkg.dependencies === 'string'
        ? JSON.parse(pkg.dependencies)
        : pkg.dependencies
      : [],
    devDependencies: pkg.devDependencies
      ? typeof pkg.devDependencies === 'string'
        ? JSON.parse(pkg.devDependencies)
        : pkg.devDependencies
      : [],
    peerDependencies: pkg.peerDependencies
      ? typeof pkg.peerDependencies === 'string'
        ? JSON.parse(pkg.peerDependencies)
        : pkg.peerDependencies
      : [],
  };
};

export const enhanceWithPublishStatus = async (pkg: any) => {
  const transformed = transformPackage(pkg);
  const isPrivate = Boolean(pkg.private);

  if (isPrivate) {
    return {
      ...transformed,
      isPublished: false,
      publishStatus: 'private',
    };
  }

  try {
    const isAvailable = await checkVersionAvailableOnNpm(pkg.name, pkg.version);
    const isPublished = !isAvailable;
    return {
      ...transformed,
      isPublished,
      publishStatus: isPublished ? 'published' : 'unpublished',
    };
  } catch (error) {
    return {
      ...transformed,
      isPublished: false,
      publishStatus: 'unpublished',
    };
  }
};

export const getAllPackages = async (rootPath?: string) => {
  const resolvedRootPath = rootPath || process.cwd();
  const rootDir = path.resolve(resolvedRootPath);

  let dbPackages = await prisma.package.findMany({
    include: {
      _count: { select: { commits: true } },
      dependenciesInfo: true,
      packageHealth: true,
    },
  });

  if (!dbPackages || dbPackages.length === 0) {
    try {
      const packages = await scanMonorepo(rootDir);
      for (const pkg of packages) {
        try {
          await storePackage(pkg);
        } catch (err) {
          AppLogger.warn(
            `Failed to store package ${pkg?.name || 'unknown'}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    } catch (err) {
      AppLogger.error('Error syncing monorepo packages:', err as Error);
    }

    dbPackages = await prisma.package.findMany({
      include: {
        _count: { select: { commits: true } },
        dependenciesInfo: true,
        packageHealth: true,
      },
    });
  }

  const bumpTypes = await getPackageBumpTypes(resolvedRootPath);

  return Promise.all(
    dbPackages.map(async (pkg: any) => {
      const enhanced = await enhanceWithPublishStatus(pkg);
      return {
        ...enhanced,
        publishType: bumpTypes[pkg.name] || 'patch',
      };
    })
  );
};

export const getPackagesService = async (rootPath: string) => {
  const rootDir = rootPath || process.cwd();
  let dbPackages = await PackageRepository.findAll();

  if (!dbPackages || dbPackages.length === 0) {
    try {
      const packages = await scanMonorepo(rootDir);
      for (const pkg of packages) {
        try {
          await storePackage(pkg);
        } catch (err) {
          AppLogger.warn(
            `Failed to store package ${pkg?.name || 'unknown'}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
      dbPackages = await PackageRepository.findAll();
    } catch (error) {
      throw new Error('Error ' + error);
    }
  }

  const transformedPackages = dbPackages.map((pkg: any) =>
    transformPackage(pkg)
  );

  const bumpTypes = await getPackageBumpTypes(rootPath);

  return transformedPackages.map((pkg: any) => ({
    ...pkg,
    publishType: bumpTypes[pkg.name] || 'patch',
  }));
};

export const refreshAllPackages = async (rootPath?: string) => {
  const resolvedRootPath = rootPath || process.cwd();
  const rootDir = path.resolve(resolvedRootPath);

  const packages = await scanMonorepo(rootDir);
  const packageNames = packages.map(p => p.name);

  const packagesToDelete = await prisma.package.findMany({
    where: {
      name: { notIn: packageNames },
    },
    select: { name: true },
  });

  const packageNamesToDelete = packagesToDelete.map(
    (p: { name: string }) => p.name
  );

  if (packageNamesToDelete.length > 0) {
    // Manually delete related records that lack onDelete: Cascade in the schema
    await prisma.dependencyInfo.deleteMany({
      where: { packageName: { in: packageNamesToDelete } },
    });

    await prisma.commit.deleteMany({
      where: { packageName: { in: packageNamesToDelete } },
    });

    await prisma.packageHealth.deleteMany({
      where: { packageName: { in: packageNamesToDelete } },
    });

    // Clean up old packages that belong to previous repositories or deleted folders
    await prisma.package.deleteMany({
      where: {
        name: { in: packageNamesToDelete },
      },
    });
  }

  for (const pkg of packages) {
    await storePackage(pkg);
  }

  return packages;
};

export const getPackageByName = async (name: string) => {
  const pkg = await prisma.package.findUnique({
    where: {
      name,
    },
    include: {
      dependenciesInfo: true,
      commits: true,
      packageHealth: true,
    },
  });

  if (!pkg) {
    throw new Error('Package not found');
  }

  const transformedPkg = await enhanceWithPublishStatus(pkg);

  let packageReport = null;
  const rootPath = process.env.MONODOG_TARGET_ROOT || process.cwd();
  const allPackages = await scanMonorepo(rootPath);
  const pkgInfo = allPackages.find(p => p.name === name);

  if (pkgInfo) {
    const localScanner = new MonorepoScanner() as unknown as any;
    packageReport = await localScanner.generatePackageReport(pkgInfo);
  }

  return {
    ...transformedPkg,
    report: packageReport,
  };
};

export const updatePackageConfig = async (
  packageName: string,
  config: string,
  packagePath: string
) => {
  if (!packageName || !config || !packagePath) {
    throw new Error(
      'Package name, configuration, and package path are required'
    );
  }

  let newConfig;

  try {
    newConfig = JSON.parse(config);
  } catch (error) {
    throw new Error(
      `JSON parsing error: ${
        error instanceof Error ? error.message : 'Invalid format'
      }`
    );
  }

  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packagePath)) {
    throw new Error('Package directory not found');
  }

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found in the specified directory');
  }

  const existingContent = await fs.promises.readFile(packageJsonPath, 'utf8');

  let existingConfig;

  try {
    existingConfig = JSON.parse(existingContent);
  } catch (error) {
    throw new Error(
      `Error parsing existing package.json: ${
        error instanceof Error ? error.message : 'Invalid JSON'
      }`
    );
  }

  const mergedConfig = {
    ...existingConfig,
    name: newConfig.name || existingConfig.name,
    version: newConfig.version || existingConfig.version,
    description:
      newConfig.description !== undefined
        ? newConfig.description
        : existingConfig.description,
    license:
      newConfig.license !== undefined
        ? newConfig.license
        : existingConfig.license,
    repository: newConfig.repository || existingConfig.repository,
    scripts: newConfig.scripts || existingConfig.scripts,
    dependencies: newConfig.dependencies || existingConfig.dependencies,
    devDependencies:
      newConfig.devDependencies || existingConfig.devDependencies,
    peerDependencies:
      newConfig.peerDependencies || existingConfig.peerDependencies,
  };

  const formattedConfig = JSON.stringify(mergedConfig, null, 2);

  await fs.promises.writeFile(packageJsonPath, formattedConfig, 'utf8');

  const updateData: any = {
    lastUpdated: new Date(),
  };

  if (newConfig.version) {
    updateData.version = newConfig.version;
  }

  if (newConfig.description !== undefined) {
    updateData.description = newConfig.description || '';
  }

  if (newConfig.license !== undefined) {
    updateData.license = newConfig.license || '';
  }

  if (newConfig.scripts) {
    updateData.scripts = JSON.stringify(newConfig.scripts);
  }

  if (newConfig.repository) {
    updateData.repository = JSON.stringify(newConfig.repository);
  }

  if (newConfig.dependencies) {
    updateData.dependencies = JSON.stringify(newConfig.dependencies);
  }

  if (newConfig.devDependencies) {
    updateData.devDependencies = JSON.stringify(newConfig.devDependencies);
  }

  if (newConfig.peerDependencies) {
    updateData.peerDependencies = JSON.stringify(newConfig.peerDependencies);
  }

  const updatedPackage = await prisma.package.update({
    where: {
      name: packageName,
    },
    data: updateData,
  });

  return {
    success: true,
    message: 'Package configuration updated successfully',
    package: transformPackage(updatedPackage),
    preservedFields: true,
  };
};
