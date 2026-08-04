import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LinkIcon,
} from '../../../../icons/heroicons';
import { PackageDetail } from '../types/packages.types';
import type { PackageDetailHeaderProps } from '../../../../types';
import {
  getStatusColor,
  getTypeColor,
  formatDate,
  formatVersion,
  getPackageTypeIcon,
} from '../utils/packages.utils';

export default function PackageDetailHeader({
  packageData,
}: PackageDetailHeaderProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <>
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          to="/packages"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Packages
        </Link>
      </div>

      {/* Package Header */}
      <div className="bg-white rounded-lg shadow border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="text-4xl">
              {getPackageTypeIcon(packageData.type)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {packageData.name}
              </h1>
              <p className="text-gray-600 mt-1">{packageData.description}</p>

              <div className="flex items-center space-x-4 mt-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500">
                    Version:
                  </span>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {formatVersion(packageData.version)}
                  </span>
                </div>

                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(packageData.type)}`}
                >
                  {packageData.type}
                </span>

                <div className="flex items-center space-x-1">
                  {getStatusIcon(packageData.status)}
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(packageData.status)}`}
                  >
                    {packageData.status}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {(packageData as any).publishStatus === 'published' ||
                  (packageData as any).isPublished ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Published
                    </span>
                  ) : (packageData as any).publishStatus === 'private' ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                      Private
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      Unpublished
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-2">Health Score</div>
            <div className="text-2xl font-bold text-blue-600">
              {typeof packageData.health?.overallScore === 'number'
                ? `${packageData.health.overallScore}%`
                : 'Not Audited'}
            </div>
          </div>
        </div>

        {/* Package Metadata */}
        {(() => {
          let rawUrl = '';
          const repo = packageData.repository;
          if (typeof repo === 'string') {
            try {
              const parsed = JSON.parse(repo);
              rawUrl = parsed.url || repo;
            } catch {
              rawUrl = repo;
            }
          } else if (repo && repo.url) {
            rawUrl = repo.url;
          }

          let cleanUrl = '';
          if (rawUrl) {
            cleanUrl = rawUrl
              .replace(/^git\+/, '')
              .replace(/^git:\/\//, 'https://')
              .replace(/\.git$/, '');
            if (
              !cleanUrl.startsWith('http://') &&
              !cleanUrl.startsWith('https://')
            ) {
              cleanUrl = `https://${cleanUrl.replace(/^github\.com\/?/, 'github.com/')}`;
            }
          }

          const repoName = cleanUrl
            ? cleanUrl.split('/').pop() || 'Repository'
            : '';

          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Last Updated</div>
                  <div className="text-sm font-medium">
                    {formatDate(packageData.lastUpdated)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <TagIcon className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">License</div>
                  <div className="text-sm font-medium">
                    {packageData.license}
                  </div>
                </div>
              </div>

              {cleanUrl && (
                <div className="flex items-center space-x-2">
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Repository</div>
                    <div className="text-sm font-medium truncate">
                      <a
                        href={cleanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        {repoName} ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tags */}
        {packageData.tags?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Tags</div>
            <div className="flex flex-wrap gap-2">
              {packageData.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
