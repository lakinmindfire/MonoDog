import {
  HealthMetric,
  PackageHealth,
  HealthAlert,
  HealthTrend,
} from '../types/health.types';
import { CubeIcon } from '../../../../icons/heroicons';
// Get status color classes
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'healthy':
    case 'success':
    case 'pass':
    case 'up-to-date':
      return 'bg-green-100 text-green-800';
    case 'warning':
    case 'warn':
    case 'outdated':
      return 'bg-yellow-100 text-yellow-800';
    case 'error':
    case 'failed':
    case 'fail':
    case 'vulnerable':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get health score color
export const getHealthScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

// Get health score background color
export const getHealthScoreBgColor = (score: number): string => {
  if (score >= 90) return 'bg-green-100';
  if (score >= 70) return 'bg-yellow-100';
  return 'bg-red-100';
};

// Calculate overall health from metrics
export const calculateOverallHealth = (metrics: HealthMetric[]): number => {
  if (metrics.length === 0) return 0;

  const totalScore = metrics.reduce((sum, metric) => {
    // Convert percentage values to score (0-100)
    let score = metric.value;
    if (metric.unit === '%') {
      score = metric.value;
    } else if (metric.unit === '/100') {
      score = metric.value;
    }
    return sum + score;
  }, 0);

  return Math.round(totalScore / metrics.length);
};

// Get trending metrics
export const getTrendingMetrics = (
  metrics: HealthMetric[]
): { improving: number; declining: number; stable: number } => {
  const trends = metrics.reduce(
    (acc, metric) => {
      if (metric.trend === 'up') acc.improving++;
      else if (metric.trend === 'down') acc.declining++;
      else acc.stable++;
      return acc;
    },
    { improving: 0, declining: 0, stable: 0 }
  );

  return trends;
};

// Filter packages by health status
export const filterPackagesByHealth = (
  packages: PackageHealth[],
  threshold: number = 70
): {
  healthy: PackageHealth[];
  needsAttention: PackageHealth[];
  critical: PackageHealth[];
} => {
  return packages.reduce(
    (acc, pkg) => {
      const score = pkg.overallScore;
      if (typeof score === 'number') {
        if (score >= threshold) {
          acc.healthy.push(pkg);
        } else if (score >= 50) {
          acc.needsAttention.push(pkg);
        } else {
          acc.critical.push(pkg);
        }
      }
      return acc;
    },
    {
      healthy: [] as PackageHealth[],
      needsAttention: [] as PackageHealth[],
      critical: [] as PackageHealth[],
    }
  );
};

// Generate health alerts from package data
export const generateHealthAlerts = (
  packages: PackageHealth[]
): HealthAlert[] => {
  const alerts: HealthAlert[] = [];

  packages.forEach(pkg => {
    // Build failures
    if (pkg.buildStatus === 'failed') {
      alerts.push({
        id: `build-${pkg.name}`,
        type: 'error',
        title: 'Build Failed',
        message: `Build failed for package ${pkg.name}`,
        packageName: pkg.name,
        timestamp: pkg.lastBuild,
      });
    }

    // Low test coverage
    if (pkg.testCoverage < 70) {
      alerts.push({
        id: `coverage-${pkg.name}`,
        type: 'warning',
        title: 'Low Test Coverage',
        message: `Test coverage is ${pkg.testCoverage}% for package ${pkg.name}`,
        packageName: pkg.name,
        timestamp: pkg.lastTest,
      });
    }

    // Security issues
    if (pkg.securityAudit === 'fail') {
      alerts.push({
        id: `security-${pkg.name}`,
        type: 'error',
        title: 'Security Issues',
        message: `Security audit failed for package ${pkg.name}`,
        packageName: pkg.name,
      });
    }

    // Vulnerable dependencies
    if (pkg.dependencies === 'vulnerable') {
      alerts.push({
        id: `deps-${pkg.name}`,
        type: 'error',
        title: 'Vulnerable Dependencies',
        message: `Package ${pkg.name} has vulnerable dependencies`,
        packageName: pkg.name,
      });
    }

    // Low overall score
    if (typeof pkg.overallScore === 'number' && pkg.overallScore < 60) {
      alerts.push({
        id: `score-${pkg.name}`,
        type: 'warning',
        title: 'Low Health Score',
        message: `Package ${pkg.name} has a low health score of ${pkg.overallScore}%`,
        packageName: pkg.name,
      });
    }
  });

  return alerts.sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });
};

// Format time ago
export const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return 'Not Audited';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Not Audited';

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
};

// Get metric icon
export const getMetricIcon = (metricName: string): React.ReactNode => {
  const name = metricName.toLowerCase();
  if (name.includes('build')) return '🏗️';
  if (name.includes('test') || name.includes('coverage')) return '🧪';
  if (name.includes('lint')) return '✨';
  if (name.includes('security')) return '🔒';
  if (name.includes('dependency') || name.includes('dependencies'))
    return <CubeIcon className="w-6 h-6 text-primary-600 inline-block" />;
  if (name.includes('performance')) return '⚡';
  return '📊';
};

// Sort packages by health score
export const sortPackagesByHealth = (
  packages: PackageHealth[],
  ascending: boolean = false
): PackageHealth[] => {
  return [...packages].sort((a, b) => {
    const scoreA = a.overallScore ?? 0;
    const scoreB = b.overallScore ?? 0;
    return ascending ? scoreA - scoreB : scoreB - scoreA;
  });
};
