import { describe, it, expect, vi, beforeEach } from 'vitest';
import https from 'https';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import * as changesetService from '../../src/services/changeset-service';
import * as packageService from '../../src/services/package.service';
import {
  getWorkflowRuns,
  triggerWorkflow,
} from '../../src/services/github-actions-service';
import { getRepositoryInfoFromGit } from '../../src/utils/utilities';

vi.mock('../../src/services/package.service', () => ({
  getPackagesService: vi.fn(),
}));

vi.mock('../../src/services/github-actions-service', () => ({
  getWorkflowRuns: vi.fn(),
  triggerWorkflow: vi.fn(),
}));

vi.mock('../../src/utils/utilities', () => ({
  getRepositoryInfoFromGit: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: vi.fn((cmd, options, callback) => {
    if (cmd.includes('git rev-parse')) {
      callback(null, { stdout: 'main\n', stderr: '' });
    } else if (cmd.includes('git status')) {
      callback(null, { stdout: '', stderr: '' });
    } else {
      callback(null, { stdout: 'ok', stderr: '' });
    }
  }),
}));

vi.mock('fs/promises', () => ({
  default: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock('https');

describe('Changeset Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkspacePackages', () => {
    it('should format packages correctly', async () => {
      vi.mocked(packageService.getPackagesService).mockResolvedValue([
        { name: 'pkg-a', version: '1.0.0', path: '/pkg-a' },
      ] as any);

      const result = await changesetService.getWorkspacePackages('/root');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('pkg-a');
      expect(result[0].version).toBe('1.0.0');
    });

    it('should throw error if getPackagesService fails', async () => {
      vi.mocked(packageService.getPackagesService).mockRejectedValue(
        new Error('Read failure')
      );
      await expect(
        changesetService.getWorkspacePackages('/root')
      ).rejects.toThrow('Read failure');
    });
  });

  describe('getExistingChangesets & getPackageBumpTypes', () => {
    it('getExistingChangesets should return file names without .md', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        'change-1.md',
        'README.md',
        'change-2.md',
      ] as any);

      const res = await changesetService.getExistingChangesets('/root');
      expect(res).toEqual(['change-1', 'change-2']);
    });

    it('getExistingChangesets should return empty array if directory missing or throws', async () => {
      vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('ENOENT'));
      const res = await changesetService.getExistingChangesets('/root');
      expect(res).toEqual([]);
    });

    it('getPackageBumpTypes should calculate highest bump type per package and catch individual read errors', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        'c1.md',
        'c2.md',
        'invalid.md',
      ] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce('"pkg-a": patch\n"pkg-b": minor')
        .mockResolvedValueOnce('"pkg-a": major')
        .mockRejectedValueOnce(new Error('Unreadable file'));

      const bumpTypes = await changesetService.getPackageBumpTypes('/root');
      expect(bumpTypes).toEqual({ 'pkg-a': 'major', 'pkg-b': 'minor' });
    });
  });

  describe('calculateNewVersions', () => {
    it('should bump major, minor, patch correctly', () => {
      const packages = [
        { name: 'pkg-a', version: '1.2.3', path: '', type: 'lib' as const },
        { name: 'pkg-b', version: '1.2.3', path: '', type: 'lib' as const },
        { name: 'pkg-c', version: '1.2.3', path: '', type: 'lib' as const },
      ];
      const bumps = [
        { package: 'pkg-a', bumpType: 'major' as const },
        { package: 'pkg-b', bumpType: 'minor' as const },
        { package: 'pkg-c', bumpType: 'patch' as const },
      ];

      const res = changesetService.calculateNewVersions(packages, bumps);
      expect(res[0].newVersion).toBe('2.0.0');
      expect(res[1].newVersion).toBe('1.3.0');
      expect(res[2].newVersion).toBe('1.2.4');
    });
  });

  describe('validateChangeset & generateChangeset', () => {
    it('validateChangeset should return errors if package not found or summary too short', async () => {
      vi.mocked(packageService.getPackagesService).mockResolvedValue([
        { name: 'pkg-a', version: '1.0.0', path: '/pkg-a' },
      ] as any);

      const res = await changesetService.validateChangeset(
        '/root',
        ['pkg-b'],
        'short'
      );
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Package pkg-b not found');
      expect(res.errors).toContain('Summary must be at least 10 characters');
    });

    it('generateChangeset should handle invalid validation, mkdir existing dir, and auto-commit fallback', async () => {
      vi.mocked(packageService.getPackagesService).mockResolvedValue([
        { name: 'pkg-a', version: '1.0.0', path: '/pkg-a' },
      ] as any);

      const resInvalid = await changesetService.generateChangeset(
        '/root',
        ['pkg-b'],
        [],
        'short'
      );
      expect(resInvalid.success).toBe(false);

      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error('EEXIST'));
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      const res = await changesetService.generateChangeset(
        '/root',
        ['pkg-a'],
        [{ package: 'pkg-a', bumpType: 'minor' }],
        'Valid summary for release'
      );

      expect(res.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('isWorkingTreeClean', () => {
    it('should return true for clean git status', async () => {
      const clean = await changesetService.isWorkingTreeClean('/root');
      expect(clean).toBe(true);
    });
  });

  describe('triggerPublishPipeline', () => {
    it('should return error when accessToken is missing', async () => {
      const res = await changesetService.triggerPublishPipeline(
        '/root',
        'user',
        [],
        null
      );
      expect(res.success).toBe(false);
      expect(res.message).toBe('Authentication Error');
    });

    it('should trigger publish pipeline when token is provided', async () => {
      vi.mocked(getRepositoryInfoFromGit).mockResolvedValueOnce({
        owner: 'o',
        repo: 'r',
      });
      vi.mocked(triggerWorkflow).mockResolvedValueOnce({
        response: { success: true },
      } as any);

      const res = await changesetService.triggerPublishPipeline(
        '/root',
        'user',
        [],
        'token123'
      );
      expect(res.success).toBe(true);
      expect(res.message).toBe('Publishing workflow initiated');
    });
  });

  describe('checkCIPassing', () => {
    it('should return false if token is missing or no runs found', async () => {
      expect(
        await changesetService.checkCIPassing(null, 'o', 'r', '1', 'ci.yml')
      ).toBe(false);

      vi.mocked(getWorkflowRuns).mockResolvedValueOnce({ runs: [] } as any);
      expect(
        await changesetService.checkCIPassing('token', 'o', 'r', '1', 'ci.yml')
      ).toBe(false);
    });

    it('should return true if latest run succeeded, false otherwise', async () => {
      vi.mocked(getWorkflowRuns).mockResolvedValueOnce({
        runs: [{ conclusion: 'success' }],
      } as any);
      expect(
        await changesetService.checkCIPassing('token', 'o', 'r', '1', 'ci.yml')
      ).toBe(true);

      vi.mocked(getWorkflowRuns).mockResolvedValueOnce({
        runs: [{ conclusion: 'failure' }],
      } as any);
      expect(
        await changesetService.checkCIPassing('token', 'o', 'r', '1', 'ci.yml')
      ).toBe(false);
    });
  });

  describe('checkVersionAvailableOnNpm', () => {
    function mockHttpsGet(statusCode: number) {
      vi.mocked(https.get).mockImplementationOnce((url: any, cb: any) => {
        const req = new EventEmitter() as any;
        req.setTimeout = vi.fn();
        req.destroy = vi.fn();

        setTimeout(() => {
          const res = new EventEmitter() as any;
          res.statusCode = statusCode;
          cb(res);
        }, 5);

        return req;
      });
    }

    it('should return false if version exists (200), true if 404', async () => {
      mockHttpsGet(200);
      expect(
        await changesetService.checkVersionAvailableOnNpm('pkg', '1.0.0')
      ).toBe(false);

      mockHttpsGet(404);
      expect(
        await changesetService.checkVersionAvailableOnNpm('pkg-new', '1.0.0')
      ).toBe(true);
    });
  });
});
