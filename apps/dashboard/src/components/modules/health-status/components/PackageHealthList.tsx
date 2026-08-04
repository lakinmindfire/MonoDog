import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  BeakerIcon,
  ShieldCheckIcon,
} from '../../../../icons/heroicons';
import { CubeIcon } from '../../../../icons/heroicons';
import { PackageHealthListProps } from '../types/health.types';
import {
  getStatusColor,
  getHealthScoreColor,
  formatTimeAgo,
} from '../utils/health.utils';

export default function PackageHealthList({
  packages,
  onPackageSelect,
}: PackageHealthListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'pass':
      case 'up-to-date':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warn':
      case 'outdated':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
      case 'fail':
      case 'vulnerable':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'building':
        return (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        );
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBuildStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'building':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Package Health Overview
      </h3>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Health Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Build Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Coverage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Security
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dependencies
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Build
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packages.map(pkg => (
                <tr
                  key={pkg.name}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onPackageSelect?.(pkg.name)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">
                        <CubeIcon className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {pkg.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`text-lg font-semibold ${getHealthScoreColor(pkg.overallScore)}`}
                      >
                        {pkg.overallScore}%
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            pkg.overallScore >= 70
                              ? 'bg-green-500'
                              : pkg.overallScore >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${pkg.overallScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(pkg.buildStatus)}
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBuildStatusColor(pkg.buildStatus)}`}
                      >
                        {pkg.buildStatus}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <BeakerIcon className="h-4 w-4 text-gray-400" />
                      <span
                        className={`text-sm font-medium ${
                          pkg.testCoverage >= 80
                            ? 'text-green-600'
                            : pkg.testCoverage >= 60
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {pkg.testCoverage}%
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pkg.securityAudit)}`}
                      >
                        {pkg.securityAudit}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pkg.dependencies)}`}
                    >
                      {pkg.dependencies}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTimeAgo(pkg.lastBuild)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {packages.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">
            <CubeIcon className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-gray-500">No package health data available</p>
        </div>
      )}
    </div>
  );
}
