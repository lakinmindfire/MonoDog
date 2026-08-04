import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '../../../../icons/heroicons';
import { PackageDetail } from '../types/packages.types';

interface HealthMetricsTabProps {
  packageData: PackageDetail;
}

export default function HealthMetricsTab({
  packageData,
}: HealthMetricsTabProps) {
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getBuildStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'running':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBuildStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLintStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const score = packageData.health?.overallScore;
  const buildStatus =
    packageData.health?.buildStatus ||
    packageData.packageHealth?.buildStatus ||
    'unknown';
  const coverageScore =
    packageData.health?.coverageScore ??
    packageData.packageHealth?.testCoverage ??
    0;
  const lintStatus =
    packageData.health?.lintScore ||
    packageData.packageHealth?.lintStatus ||
    'unknown';

  if (typeof score !== 'number') {
    return (
      <div className="py-6">
        <div className="bg-gray-50 border rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Not Audited
          </h3>
          <p className="text-sm text-gray-500">
            Health score has not been calculated for this package yet.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="py-6">
      {/* Health Score Overview */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Health Score</h3>
          <div className={`text-3xl font-bold ${getHealthScoreColor(score)}`}>
            {score}%
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              score >= 70
                ? 'bg-green-500'
                : score >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{
              width: `${score}%`,
            }}
          />
        </div>

        <p className="text-sm text-gray-600">
          {score >= 70 && 'Excellent health - package is in great condition'}
          {score >= 50 && score < 70 && 'Good health - minor issues detected'}
          {score < 50 && 'Needs attention - several issues require fixing'}
        </p>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Build Status */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">Build Status</h4>
            {getBuildStatusIcon(buildStatus)}
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBuildStatusColor(buildStatus)}`}
            >
              {buildStatus}
            </span>
          </div>
        </div>

        {/* Test Coverage */}
        <div className="hidden bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">Test Coverage</h4>
            <div
              className={`text-lg font-semibold ${
                coverageScore >= 80
                  ? 'text-green-600'
                  : coverageScore >= 60
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {coverageScore}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                coverageScore >= 80
                  ? 'bg-green-500'
                  : coverageScore >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{
                width: `${coverageScore}%`,
              }}
            />
          </div>
        </div>

        {/* Lint Status */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">Lint Status</h4>
            {lintStatus === 'pass' && (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            )}
            {lintStatus === 'fail' && (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
            {lintStatus === 'warning' && (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLintStatusColor(lintStatus)}`}
            >
              {lintStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Detailed Metrics
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">
              Dependencies
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Dependencies:</span>
                <span className="font-medium">
                  {Object.keys(packageData.dependenciesInfo).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Outdated:</span>
                <span className="font-medium text-yellow-600">
                  {
                    packageData.dependenciesInfo.filter(
                      d => d.status === 'outdated'
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Major Updates Available:</span>
                <span className="font-medium text-red-600">
                  {
                    packageData.dependenciesInfo.filter(
                      d => d.status === 'major-update'
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">
              Code Quality
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Build Status:</span>
                <span
                  className={`font-medium ${
                    buildStatus === 'success' || buildStatus === 'pass'
                      ? 'text-green-600'
                      : buildStatus === 'failed' || buildStatus === 'fail'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}
                >
                  {buildStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lint Status:</span>
                <span
                  className={`font-medium ${
                    lintStatus === 'pass'
                      ? 'text-green-600'
                      : lintStatus === 'fail'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}
                >
                  {lintStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
