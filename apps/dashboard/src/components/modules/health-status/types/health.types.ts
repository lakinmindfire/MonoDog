// Shared types for health status module components

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'error';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface PackageHealth {
  name: string;
  overallScore: number | null;
  buildStatus: 'success' | 'failed' | 'building' | 'unknown';
  testCoverage: number;
  lintStatus: 'pass' | 'warn' | 'fail' | 'unknown';
  securityAudit: 'pass' | 'warn' | 'fail' | 'unknown';
  dependencies: 'up-to-date' | 'outdated' | 'vulnerable' | 'unknown';
  lastBuild?: string;
  lastTest?: string;
}

export interface HealthData {
  overallScore: number;
  metrics: HealthMetric[];
  packageHealth: PackageHealth[];
}

export interface HealthAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  packageName?: string;
  timestamp?: string;
}

export interface HealthTrend {
  metric: string;
  data: Array<{ date: string; value: number }>;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
}

export interface HealthStatusProps {
  selectedMetric: string;
  onMetricSelect: (metric: string) => void;
  onRefresh: () => void;
}

export interface OverallHealthProps {
  score: number;
  trend: 'up' | 'down' | 'stable';
  loading?: boolean;
}

export interface HealthMetricsProps {
  metrics: HealthMetric[];
  selectedMetric: string;
  onMetricSelect: (metric: string) => void;
}

export interface PackageHealthListProps {
  packages: PackageHealth[];
  onPackageSelect?: (packageName: string) => void;
}

export interface HealthAlertsProps {
  alerts: HealthAlert[];
  onAlertDismiss?: (alertId: string) => void;
}

export interface HealthActionsProps {
  onRefresh: () => void;
  onRunAllTests?: () => void;
  onRunSecurityAudit?: () => void;
  onUpdateDependencies?: () => void;
  loading?: boolean;
}
