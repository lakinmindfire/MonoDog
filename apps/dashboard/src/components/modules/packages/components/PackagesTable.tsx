import { Link } from 'react-router-dom';
import { ArrowUpIcon, ArrowDownIcon } from '../../../../icons/heroicons';
import { Package, PackageSorting } from '../types/packages.types';
import type { PackagesTableProps } from '../../../../types';
import {
  getStatusColor,
  getTypeColor,
  formatDate,
  formatVersion,
  getPackageTypeIcon,
  resolvePackageStatus,
} from '../utils/packages.utils';

export default function PackagesTable({
  packages,
  sorting,
  onSortChange,
}: PackagesTableProps) {
  const handleSort = (field: PackageSorting['field']) => {
    const newOrder =
      sorting.field === field && sorting.order === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, order: newOrder });
  };

  const getSortIcon = (field: string) => {
    if (sorting.field !== field) return null;
    return sorting.order === 'asc' ? (
      <ArrowUpIcon className="w-4 h-4" />
    ) : (
      <ArrowDownIcon className="w-4 h-4" />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Package</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('version')}
              >
                <div className="flex items-center space-x-1">
                  <span>Version</span>
                  {getSortIcon('version')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('dependencies')}
              >
                <div className="flex items-center space-x-1">
                  <span>Dependencies</span>
                  {getSortIcon('dependencies')}
                </div>
              </th>
              <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Maintainers
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packages.map(pkg => {
              const displayStatus = resolvePackageStatus(pkg);

              return (
                <tr key={pkg.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">
                        {getPackageTypeIcon(pkg.type)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/packages/${encodeURIComponent(pkg.name)}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500"
                          >
                            {pkg.name}
                          </Link>
                          {pkg.publishStatus === 'published' ||
                          pkg.isPublished ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Published
                            </span>
                          ) : pkg.publishStatus === 'private' || pkg.private ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                              Private
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              Unpublished
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {pkg.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900">
                      {formatVersion(pkg.version)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(pkg.type)}`}
                    >
                      {pkg.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(displayStatus)}`}
                    >
                      {displayStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Object.keys(pkg.dependencies).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.keys(pkg.dependencies).slice(0, 3).join(', ')}
                        {Object.keys(pkg.dependencies).length > 3 &&
                          ` +${Object.keys(pkg.dependencies).length - 3} more`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex -space-x-1">
                      {Array.isArray(pkg.maintainers) &&
                        pkg.maintainers.slice(0, 3).map((maintainer, index) => {
                          const nameStr =
                            typeof maintainer === 'string'
                              ? maintainer
                              : (maintainer as any)?.name || 'M';
                          return (
                            <div
                              key={`${nameStr}-${index}`}
                              className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-500 text-xs font-medium text-white"
                              title={nameStr}
                            >
                              {nameStr.charAt(0).toUpperCase()}
                            </div>
                          );
                        })}
                      {Array.isArray(pkg.maintainers) &&
                        pkg.maintainers.length > 3 && (
                          <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-300 text-xs font-medium text-gray-600">
                            +{pkg.maintainers.length - 3}
                          </div>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
