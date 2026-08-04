import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getAllPackages,
  getPackagesService,
  refreshAllPackages,
  getPackageByName,
  updatePackageConfig,
  transformPackage,
} from '../../src/services/package.service';
import { scanMonorepo } from '@mindfiredigital/utils';
import { prisma } from '../../src/db/prisma';
import { PackageRepository } from '../../src/repositories';

vi.mock('../../src/db/prisma', () => ({
  prisma: {
    package: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    dependencyInfo: {
      deleteMany: vi.fn(),
    },
    commit: {
      deleteMany: vi.fn(),
    },
    packageHealth: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/repositories', () => ({
  PackageRepository: {
    findAll: vi.fn(),
  },
}));

vi.mock('../../src/utils/helpers', () => ({
  storePackage: vi.fn(),
}));

vi.mock('@mindfiredigital/utils', () => ({
  scanMonorepo: vi.fn().mockResolvedValue([]),
}));

vi.mock('@mindfiredigital/monorepo-scanner', () => {
  return {
    MonorepoScanner: class {
      generatePackageReport = vi.fn().mockResolvedValue({ score: 100 });
    },
    generateReports: vi.fn().mockResolvedValue([]),
  };
});

describe('Package Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transformPackage helper', () => {
    it('should transform falsy fields to default arrays and objects', () => {
      const res = transformPackage({
        name: 'pkg',
        commits: [{ hash: '1' }],
        maintainers: null,
        scripts: null,
        repository: null,
        dependencies: null,
        devDependencies: null,
        peerDependencies: null,
      });

      expect(res.commits).toEqual([{ hash: '1' }]);
      expect(res.maintainers).toEqual([]);
      expect(res.scripts).toEqual({});
      expect(res.repository).toEqual({});
      expect(res.dependencies).toEqual([]);
      expect(res.devDependencies).toEqual([]);
      expect(res.peerDependencies).toEqual([]);
      expect(res.status).toBe('unscanned');
      expect(res.health).toBeDefined();
      expect(res.health.overallScore).toBeNull();
      expect(res.health.isHealthy).toBeNull();
    });
  });

  describe('getAllPackages', () => {
    it('should return packages from db if available', async () => {
      const mockDbPackages = [
        {
          name: 'ui',
          version: '1.0.0',
          maintainers: '["Alice"]',
          scripts: '{"build":"tsc"}',
          repository: '{"url":"http"}',
        },
        { name: 'api', version: '2.0.0', maintainers: '' },
      ];
      vi.mocked(prisma.package.findMany).mockResolvedValue(
        mockDbPackages as any
      );

      const packages = await getAllPackages('root');
      expect(prisma.package.findMany).toHaveBeenCalledTimes(1);
      expect(scanMonorepo).not.toHaveBeenCalled();
      expect(packages.length).toBe(2);
      expect(packages[0].name).toBe('ui');
      expect(packages[0].maintainers).toEqual(['Alice']);
    });

    it('should scan and store if db is empty', async () => {
      vi.mocked(prisma.package.findMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ name: 'ui', version: '1.0.0' }] as any);

      vi.mocked(scanMonorepo).mockResolvedValue([
        { name: 'ui', version: '1.0.0' },
      ] as any);

      const packages = await getAllPackages();
      expect(scanMonorepo).toHaveBeenCalled();
      expect(packages.length).toBe(1);
      expect(packages[0].name).toBe('ui');
    });
  });

  describe('getPackagesService', () => {
    it('should fetch from PackageRepository and transform fields', async () => {
      vi.mocked(PackageRepository.findAll).mockResolvedValueOnce([
        {
          name: 'pkg-a',
          version: '1.0.0',
          maintainers: '["Bob"]',
          scripts: '{"start":"node index.js"}',
          repository: '{"type":"git"}',
          dependencies: '["react"]',
          devDependencies: '["typescript"]',
          peerDependencies: '[]',
          _count: { commits: 5 },
        } as any,
        {
          name: 'pkg-b',
          maintainers: '',
          scripts: '',
          repository: '',
          dependencies: '',
          devDependencies: '',
          peerDependencies: '',
        } as any,
      ]);

      const res = await getPackagesService('/root');
      expect(res).toHaveLength(2);
      expect(res[0].name).toBe('pkg-a');
      expect(res[0].maintainers).toEqual(['Bob']);
      expect(res[0].commits).toBe(5);
      expect(res[1].maintainers).toEqual([]);
    });

    it('should scan monorepo if db returns empty and re-query', async () => {
      vi.mocked(PackageRepository.findAll)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ name: 'pkg-b', maintainers: '' }] as any);
      vi.mocked(scanMonorepo).mockResolvedValueOnce([{ name: 'pkg-b' }] as any);

      const res = await getPackagesService('/root');
      expect(scanMonorepo).toHaveBeenCalledWith('/root');
      expect(res).toHaveLength(1);
    });

    it('should throw error if scan fails in getPackagesService', async () => {
      vi.mocked(PackageRepository.findAll).mockResolvedValueOnce([]);
      vi.mocked(scanMonorepo).mockRejectedValueOnce(
        new Error('Directory unreadable')
      );

      await expect(getPackagesService('/invalid')).rejects.toThrow(
        'Error Error: Directory unreadable'
      );
    });
  });

  describe('refreshAllPackages', () => {
    it('should scan monorepo, clean deleted packages from DB, and re-store', async () => {
      vi.mocked(scanMonorepo).mockResolvedValueOnce([
        { name: 'active-pkg' },
      ] as any);
      vi.mocked(prisma.package.findMany).mockResolvedValueOnce([
        { name: 'old-pkg' },
      ] as any);
      vi.mocked(prisma.dependencyInfo.deleteMany).mockResolvedValueOnce({
        count: 1,
      });
      vi.mocked(prisma.commit.deleteMany).mockResolvedValueOnce({ count: 1 });
      vi.mocked(prisma.packageHealth.deleteMany).mockResolvedValueOnce({
        count: 1,
      });
      vi.mocked(prisma.package.deleteMany).mockResolvedValueOnce({ count: 1 });

      const res = await refreshAllPackages('/root');
      expect(res).toHaveLength(1);
      expect(prisma.package.deleteMany).toHaveBeenCalledWith({
        where: { name: { in: ['old-pkg'] } },
      });
    });
  });

  describe('getPackageByName', () => {
    it('should return package and generate report if pkgInfo is found', async () => {
      const mockPkg = { name: 'api', version: '2.0.0', maintainers: '[]' };
      vi.mocked(prisma.package.findUnique).mockResolvedValue(mockPkg as any);
      vi.mocked(scanMonorepo).mockResolvedValueOnce([
        { name: 'api', path: '/pkg/api' },
      ] as any);

      const pkg = await getPackageByName('api');
      expect(pkg).toBeDefined();
      expect(pkg.report).toEqual({ score: 100 });
    });

    it('should throw error if package not found', async () => {
      vi.mocked(prisma.package.findUnique).mockResolvedValue(null as any);
      await expect(getPackageByName('nonexistent')).rejects.toThrow(
        'Package not found'
      );
    });
  });

  describe('updatePackageConfig', () => {
    it('should throw error if arguments are missing', async () => {
      await expect(updatePackageConfig('', '{}', '/path')).rejects.toThrow(
        'Package name, configuration, and package path are required'
      );
    });

    it('should throw error if new config JSON is invalid', async () => {
      await expect(
        updatePackageConfig('pkg', 'invalid-json', '/path')
      ).rejects.toThrow('JSON parsing error: Unexpected token');
    });

    it('should throw error if package directory or package.json does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      await expect(
        updatePackageConfig('pkg', '{}', '/nonexistent')
      ).rejects.toThrow('Package directory not found');
      vi.restoreAllMocks();
    });

    it('should update package.json file and database record on valid input', async () => {
      const tempDir = path.resolve(__dirname, 'mock_pkg_dir_' + Date.now());
      fs.mkdirSync(tempDir, { recursive: true });
      const pkgJsonPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(
        pkgJsonPath,
        JSON.stringify({ name: 'pkg-a', version: '1.0.0' })
      );

      vi.mocked(prisma.package.update).mockResolvedValueOnce({
        name: 'pkg-a',
        version: '1.0.1',
        description: 'New desc',
        license: 'MIT',
        scripts: '{"build":"tsc"}',
        repository: '{"type":"git"}',
        dependencies: '{"react":"18"}',
        devDependencies: '{"vitest":"1"}',
        peerDependencies: '{}',
      } as any);

      const res = await updatePackageConfig(
        'pkg-a',
        JSON.stringify({
          version: '1.0.1',
          description: 'New desc',
          license: 'MIT',
          scripts: { build: 'tsc' },
          repository: { type: 'git' },
          dependencies: { react: '18' },
          devDependencies: { vitest: '1' },
          peerDependencies: {},
        }),
        tempDir
      );

      expect(res.success).toBe(true);
      const fileContent = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      expect(fileContent.version).toBe('1.0.1');

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
