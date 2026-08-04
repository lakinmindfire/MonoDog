import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BeakerIcon,
  ArrowUpIcon,
} from '../../../icons/heroicons';
import { CubeIcon } from '../../../icons/heroicons';
import { monorepoService } from '../../../services/monorepoService';
import { DASHBOARD_ERROR_MESSAGES } from '../../../constants/messages';

export default function HealthStatus() {
  // const [selectedMetric, setSelectedMetric] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setLoading(true);
        const data = await monorepoService.getHealthStatus();

        setHealthData(data);
        setError(null);
      } catch (err) {
        setError(DASHBOARD_ERROR_MESSAGES.UNKNOWN_ERROR);
        console.error('Error fetching health data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, [refreshKey]);

  const [jobProgress, setJobProgress] = useState<{
    status: 'idle' | 'processing' | 'completed' | 'failed';
    progress: number;
    currentStep?: string;
    currentPackage?: string;
    error?: string;
  } | null>(null);

  const refreshData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Trigger async job (returns 202 Accepted immediately)
      await monorepoService.refreshHealthStatus();

      // Poll progress every 1.5s
      const pollInterval = setInterval(async () => {
        try {
          const status = await monorepoService.getHealthRefreshStatus();
          setJobProgress(status);

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setRefreshing(false);
            setJobProgress(null);
            setRefreshKey(prev => prev + 1);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setRefreshing(false);
            setJobProgress(null);
            setError(status.error || 'Health scan failed');
          }
        } catch (err) {
          console.error('Error polling health refresh status:', err);
        }
      }, 1500);
    } catch (err) {
      setError(DASHBOARD_ERROR_MESSAGES.UNKNOWN_ERROR);
      console.error('Error starting health refresh:', err);
      setRefreshing(false);
    }
  };

  const syncNPMData = async () => {
    setSyncing(true);
    try {
      await monorepoService.syncNpmData();
    } catch (err) {
      console.error('Error starting NPM sync:', err);
    } finally {
      setSyncing(false);
    }
  };

  const retryFetchData = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Get status color and icon
  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
      case 'pass':
      case 'up-to-date':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'warn':
      case 'outdated':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
      case 'failed':
      case 'fail':
      case 'vulnerable':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return (
          <ArrowPathIcon className="h-4 w-4 text-green-500 transform rotate-90" />
        );
      case 'down':
        return (
          <ArrowPathIcon className="h-4 w-4 text-red-500 transform -rotate-90" />
        );
      default:
        return <ArrowPathIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBuildStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'building':
        return (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        );
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // Calculate overall health
  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
          <button
            onClick={retryFetchData}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overallHealth = healthData ? healthData.summary?.averageScore : 0;

  const healthyPackages = healthData
    ? healthData?.packages?.filter(pkg => pkg.health.overallScore >= 70).length
    : 0;
  const warningPackages = healthData
    ? healthData?.packages?.filter(
        pkg => pkg.health.overallScore >= 50 && pkg.health.overallScore < 70
      ).length
    : 0;
  const errorPackages = healthData
    ? healthData?.packages?.filter(pkg => pkg.health.overallScore < 50).length
    : 0;

  const packagesHealth = [
    {
      name: 'Package Health',
      value: healthyPackages || 0,
      status: (() => {
        const healthy = healthyPackages || 0;
        const total = healthData?.packages.length || 0;
        if (total === 0) return 'healthy';
        const ratio = healthy / total;
        if (ratio >= 0.8) return 'healthy';
        if (ratio >= 0.6) return 'warning';
        return 'error';
      })(),
      description: `${healthyPackages || 0} healthy packages out of ${healthData?.packages.length || 0}`,
    },
    {
      name: 'Overall Score',
      value: Math.round(overallHealth),
      status:
        Math.round(overallHealth) >= 70
          ? 'healthy'
          : Math.round(overallHealth) >= 50
            ? 'warning'
            : 'error',
      description: `Average health score: ${Math.round(overallHealth)}/100`,
    },
    {
      name: 'Unhealthy Packages',
      value: warningPackages + errorPackages || 0,
      status:
        (warningPackages + errorPackages || 0) === 0
          ? 'healthy'
          : (warningPackages + errorPackages || 0) <= 2
            ? 'warning'
            : 'error',
      description: `${warningPackages + errorPackages || 0} packages need attention`,
    },
  ];

  return (
    <div className="">
      {/* Header */}

      <div className="flex items-center justify-between my-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Status</h1>
          <p className="text-gray-600 mt-1">
            Monitor the health and performance of your monorepo packages
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={syncNPMData}
            disabled={syncing}
            className="btn-outline flex items-center space-x-2 transition-colors"
          >
            {syncing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            ) : (
              <ArrowUpIcon className="w-5 h-5" />
            )}
            <span>{syncing ? 'Syncing NPM...' : 'Sync NPM'}</span>
          </button>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="btn-primary flex items-center space-x-2 transition-colors"
          >
            {refreshing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <ArrowPathIcon className="w-5 h-5" />
            )}
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Show progress modal when scanning */}
      {refreshing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-xl shadow-2xl border border-gray-100 text-center animate-fade-in">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowPathIcon className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Scanning Monorepo Health
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {jobProgress?.currentStep ||
                'Executing background build & security audit...'}
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                <span>Overall Progress</span>
                <span className="text-blue-600 font-bold">
                  {jobProgress?.progress || 7}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${jobProgress?.progress || 10}%` }}
                ></div>
              </div>
            </div>

            {jobProgress?.currentPackage && (
              <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                <span>Active: {jobProgress.currentPackage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overall Health Score */}
      <div className="my-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Overall Monorepo Health</h2>
            <p className="text-blue-100 mt-1">
              Based on all package metrics and recent activity
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {overallHealth?.toFixed(2)}
            </div>
            <div className="text-blue-100">out of 100</div>
          </div>
        </div>
        <div className="mt-4 flex space-x-4">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-300" />
            <span>{healthyPackages} Healthy</span>
          </div>
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-300" />
            <span>{warningPackages} Warnings</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircleIcon className="w-5 h-5 text-red-300" />
            <span>{errorPackages} Errors</span>
          </div>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="my-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packagesHealth.map(metric => (
          <div
            key={metric.name}
            className="bg-white p-6 rounded-lg shadow border"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {metric.name}
              </h3>
              <div
                className={`w-3 h-3 rounded-full ${
                  metric.status === 'healthy'
                    ? 'bg-green-500'
                    : metric.status === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-bold text-gray-900">
                {metric.value}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(metric.status)}`}
              >
                {metric.status}
              </span>
              <span className="text-sm text-gray-500">
                {metric.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Package Health Table */}
      <div className="my-3 bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Package Health Details
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overall Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Build Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Coverage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lint Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Security
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dependencies
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {healthData?.packages?.map(pkg => (
                <tr key={pkg.packageName} className="hover:bg-gray-50">
                  {/* package name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <div className="text-sm">
                          <CubeIcon className="w-6 h-6 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {pkg.packageName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Score: {pkg.health.overallScore}/100
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* overall score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            pkg.health.overallScore >= 70
                              ? 'bg-green-500'
                              : pkg.health.overallScore >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${pkg.health.overallScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {pkg.health.overallScore}
                      </span>
                    </div>
                  </td>

                  {/* build status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          pkg.health.buildStatus === 'success'
                            ? 'bg-green-500'
                            : pkg.health.buildStatus === 'unknown'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      />
                      <span
                        className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          pkg.health.buildStatus === 'success'
                            ? 'healthy'
                            : pkg.health.buildStatus === 'unknown'
                              ? 'warning'
                              : 'error'
                        )}`}
                      >
                        {pkg.health.buildStatus === 'success'
                          ? 'healthy'
                          : pkg.health.buildStatus === 'unknown'
                            ? 'warning'
                            : 'error'}
                      </span>
                    </div>
                  </td>

                  {/* test coverage */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BeakerIcon className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">
                        {pkg.health.testCoverage ?? 0}%
                      </span>
                    </div>
                  </td>

                  {/* lint status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        pkg.health.lintStatus === 'pass'
                          ? 'pass'
                          : pkg.health.lintStatus === 'unknown'
                            ? 'warn'
                            : 'fail'
                      )}`}
                    >
                      {pkg.health.lintStatus === 'pass'
                        ? 'pass'
                        : pkg.health.lintStatus === 'unknown'
                          ? 'warn'
                          : 'fail'}
                    </span>
                  </td>

                  {/* security */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          pkg.health.securityAudit === 'pass'
                            ? 'pass'
                            : pkg.health.securityAudit === 'unknown'
                              ? 'warn'
                              : 'fail'
                        )}`}
                      >
                        {pkg.health.securityAudit === 'pass'
                          ? 'pass'
                          : pkg.health.securityAudit === 'unknown'
                            ? 'warn'
                            : 'fail'}
                      </span>
                    </div>
                  </td>

                  {/* dependencies */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        (pkg.health as any).dependencyStatus === 'outdated'
                          ? 'warn'
                          : 'up-to-date'
                      )}`}
                    >
                      {(pkg.health as any).dependencyStatus || 'up-to-date'}
                    </span>
                  </td>

                  {/* actions */}
                  <td className="hidden px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health Recommendations */}
      <div className="hidden bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Health Recommendations
        </h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Test Coverage Below Target
              </p>
              <p className="text-sm text-yellow-700">
                Consider adding more tests to improve coverage above 90%
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Build Failures Detected
              </p>
              <p className="text-sm text-red-700">
                monorepo-scanner package has build failures that need immediate
                attention
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <ChartBarIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Performance Improvements Available
              </p>
              <p className="text-sm text-blue-700">
                Consider optimizing build times and dependency resolution
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
