import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CubeIcon,
  ChartBarIcon,
  HeartIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  RocketLaunchIcon,
  LogoutIcon,
} from '../../icons/index';
import { useAuth } from '../../services/auth-context';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    allowedRoles: ['Admin', 'Maintainer', 'Collaborator', 'Viewer'],
  },
  {
    name: 'Packages',
    href: '/packages',
    icon: CubeIcon,
    allowedRoles: ['Admin', 'Maintainer', 'Collaborator', 'Viewer'],
  },
  {
    name: 'Dependencies',
    href: '/dependencies',
    icon: ChartBarIcon,
    allowedRoles: ['Admin', 'Maintainer', 'Collaborator', 'Viewer'],
  },
  {
    name: 'Health Status',
    href: '/health',
    icon: HeartIcon,
    allowedRoles: ['Admin', 'Maintainer', 'Collaborator', 'Viewer'],
  },
  {
    name: 'Release',
    href: '/release',
    icon: CloudArrowUpIcon,
    allowedRoles: ['Admin', 'Maintainer'],
  },
  {
    name: 'Pipeline',
    href: '/pipeline',
    icon: RocketLaunchIcon,
    allowedRoles: ['Admin', 'Maintainer', 'Collaborator', 'Viewer'],
  },
  {
    name: 'Publish Control',
    href: '/publish',
    icon: CloudArrowUpIcon,
    allowedRoles: ['Admin', 'Maintainer'],
  },
  {
    name: 'Changelog',
    href: '/changelog',
    icon: ChartBarIcon,
    allowedRoles: ['Admin', 'Maintainer', 'Collaborator', 'Viewer'],
  },
  {
    name: 'Configuration',
    href: '/config',
    icon: Cog6ToothIcon,
    allowedRoles: ['Admin'],
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { session, logout } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-medium">
        <div className="flex h-16 items-center justify-center gap-3 border-b border-neutral-200 px-4">
          <img
            src="/fire-logo.png"
            alt="Mindfire Logo"
            className="w-10 h-10 object-contain shrink-0"
          />
          <h1 className="text-heading text-xl text-primary-700 font-bold tracking-tight">
            MonoDog
          </h1>
        </div>
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation
              .filter(item => {
                const userRole = session?.permission?.role || 'Denied';
                return item.allowedRoles.includes(userRole);
              })
              .map(item => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/' &&
                    location.pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`group flex items-center rounded-r-full px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                          isActive
                            ? 'text-primary-700'
                            : 'text-neutral-400 group-hover:text-neutral-600'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white shadow-soft border-b border-neutral-200 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-heading text-lg font-semibold">
              {navigation.find(item => item.href === location.pathname)?.name ||
                'Dashboard'}
            </h2>
          </div>
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end text-sm">
              <button className="font-medium" onClick={logout} title="Logout">
                <LogoutIcon></LogoutIcon>
              </button>
            </div>
            <div className="flex flex-col items-end text-sm">
              {session && (
                <span className="font-medium text-primary-700">
                  {session.user?.login ?? 'anonymous'}
                </span>
              )}

              {session && (
                <span className="text-neutral-500">
                  {session.permission?.role ?? 'Denied'}
                </span>
              )}
            </div>
            <img
              src={session.user?.avatar_url ?? ''}
              alt="User Avatar"
              className="h-8 w-8 rounded-full border border-neutral-200"
            />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
