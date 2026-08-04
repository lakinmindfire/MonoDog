import {
  Package,
  PackageStats,
  PackageFilters,
  PackageSorting,
} from '../types/packages.types';
import { BuildingLibraryIcon } from '../../../../icons/heroicons';
import { RocketLaunchIcon } from '../../../../icons/heroicons';
import { CubeIcon } from '../../../../icons/heroicons';
export const resolvePackageStatus = (pkg: Package): string => {
  const statusStr = pkg.status as string | undefined;
  if (statusStr && statusStr !== 'unknown' && statusStr !== '') {
    return statusStr;
  }
  const score = pkg.health?.overallScore;
  if (typeof score === 'number') {
    if (score >= 70) return 'healthy';
    if (score >= 50) return 'warning';
    return 'error';
  }
  return 'unscanned';
};

// Calculate package statistics
export const calculatePackageStats = (packages: Package[]): PackageStats => {
  return {
    total: packages.length,
    healthy: packages.filter(p => resolvePackageStatus(p) === 'healthy').length,
    warnings: packages.filter(p => resolvePackageStatus(p) === 'warning')
      .length,
    errors: packages.filter(p => resolvePackageStatus(p) === 'error').length,
  };
};

// Get unique package types
export const getUniquePackageTypes = (packages: Package[]): string[] => {
  return [...new Set(packages.map(pkg => pkg.type))];
};

// Get unique package statuses
export const getUniquePackageStatuses = (packages: Package[]): string[] => {
  return [...new Set(packages.map(pkg => resolvePackageStatus(pkg)))];
};

// Filter packages based on search, type, and status
export const filterPackages = (
  packages: Package[],
  filters: PackageFilters
): Package[] => {
  return packages.filter(pkg => {
    const matchesSearch =
      pkg.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      pkg.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesType = filters.type === 'all' || pkg.type === filters.type;
    const resolvedStatus = resolvePackageStatus(pkg);
    const matchesStatus =
      filters.status === 'all' || resolvedStatus === filters.status;

    return matchesSearch && matchesType && matchesStatus;
  });
};

// Sort packages
export const sortPackages = (
  packages: Package[],
  sorting: PackageSorting
): Package[] => {
  return [...packages].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sorting.field) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'version':
        aValue = a.version;
        bValue = b.version;
        break;
      case 'lastUpdated':
        aValue = new Date(a.lastUpdated);
        bValue = new Date(b.lastUpdated);
        break;
      case 'dependencies':
        aValue = Object.keys(a.dependencies).length;
        bValue = Object.keys(b.dependencies).length;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sorting.order === 'asc' ? -1 : 1;
    if (aValue > bValue) return sorting.order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Get status color classes
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 text-green-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'building':
      return 'bg-blue-100 text-blue-800';
    case 'unscanned':
    case 'unknown':
      return 'bg-gray-100 text-gray-700 border border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get type color classes
export const getTypeColor = (type: string): string => {
  switch (type) {
    case 'app':
      return 'bg-blue-100 text-blue-800';
    case 'lib':
      return 'bg-purple-100 text-purple-800';
    case 'tool':
      return 'bg-orange-100 text-orange-800';
    case 'service':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get dependency status color classes
export const getDependencyStatusColor = (status: string): string => {
  switch (status) {
    case 'up-to-date':
      return 'bg-green-100 text-green-800';
    case 'outdated':
      return 'bg-yellow-100 text-yellow-800';
    case 'major-update':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get commit type color classes
export const getCommitTypeColor = (type: string): string => {
  switch (type) {
    case 'feature':
      return 'bg-blue-100 text-blue-800';
    case 'fix':
      return 'bg-green-100 text-green-800';
    case 'chore':
      return 'bg-gray-100 text-gray-800';
    case 'breaking':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format version for display
export const formatVersion = (version: string): string => {
  return version.startsWith('v') ? version : `v${version}`;
};

// Get package type icon
export const getPackageTypeIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'app':
      return <RocketLaunchIcon className="w-6 h-6 text-primary-600" />;
    case 'lib':
      return <BuildingLibraryIcon className="w-6 h-6 text-primary-600" />;
    case 'tool':
      return '🔧';
    case 'service':
      return '🌐';
    default:
      return <CubeIcon className="w-6 h-6 text-primary-600" />;
  }
};
