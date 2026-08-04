// Shared types for packages module components

import type { DependencyInfo } from '@/services/monorepoService';
import type { PackageHealth } from '../../health-status/types/health.types';

export interface PackageHealthMetrics {
  overallScore: number | null;
  isHealthy: boolean | null;
  buildStatus?: string;
  coverageScore?: number;
  lintScore?: string;
  securityScore?: string;
  dependenciesScore?: string;
}

export interface Package {
  name: string;
  version: string;
  type: 'app' | 'lib' | 'tool' | 'service';
  status: 'healthy' | 'warning' | 'error' | 'building' | 'unscanned';
  lastUpdated: string;
  dependencies: string[];
  maintainers: string[];
  tags: string[];
  description: string;
  path: string;
  private?: boolean;
  isPublished?: boolean;
  publishStatus?: 'published' | 'unpublished' | 'private';
  scripts?: Record<string, string>;
  peerDependencies?: string[];
  devDependencies?: string[];
  dependents: string[];
  packageHealth?: PackageHealth;
  health?: PackageHealthMetrics;
  commitsCount?: number;
}

export interface Dependency {
  name: string;
  version: string;
  latest: string;
  status: 'up-to-date' | 'outdated' | 'major-update';
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
  type: 'feat' | 'fix' | 'chore' | 'breaking';
}

export interface PackageDetail {
  name: string;
  version: string;
  type: 'app' | 'lib' | 'tool';
  status: 'healthy' | 'warning' | 'error';
  description: string;
  lastUpdated: string;
  dependencies: Dependency[];
  devDependencies: Dependency[];
  peerDependencies: Dependency[];
  maintainers: string[];
  tags: string[];
  repository: string;
  license: string;
  scripts: Record<string, string>;
  commits: Commit[];
  packageHealth?: PackageHealth;
  health?: PackageHealthMetrics;
  buildStatus: 'success' | 'failed' | 'running' | 'unknown';
  testCoverage: number;
  lintStatus: 'pass' | 'fail' | 'warning';
  dependenciesInfo: DependencyInfo[];
  path: string;
  isPublished?: boolean;
  publishStatus?: 'published' | 'unpublished' | 'private';
  commitsCount?: number;
}

export interface PackageStats {
  total: number;
  healthy: number;
  warnings: number;
  errors: number;
}

export interface PackageFilters {
  search: string;
  type: string;
  status: string;
}

export interface PackageSorting {
  field: 'name' | 'version' | 'lastUpdated' | 'dependencies';
  order: 'asc' | 'desc';
}

export type PackageDetailTab =
  | 'overview'
  | 'dependencies'
  | 'commits'
  | 'health'
  | 'config';

export interface PackageDetailTabsProps {
  activeTab: PackageDetailTab;
  onTabChange: (tab: PackageDetailTab) => void;
}

export interface LoadingStateProps {
  message?: string;
}

export interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}
