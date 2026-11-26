import { useState } from 'react';
import { LayoutDashboard, LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { NAV_ITEMS, RoutePath } from '../seo/routes';

interface NavbarProps {
  currentPath: RoutePath;
  onNavigate: (path: RoutePath) => void;
  onPrimaryAction: () => void;
}

export function Navbar({ currentPath, onNavigate, onPrimaryAction }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, authReady, logout } = useAuth();

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: RoutePath
  ) => {
    e.preventDefault();
    setMobileOpen(false);
    onNavigate(path);
  };

  const handleLogoutClick = async () => {
    setMobileOpen(false);
    await logout();
    onNavigate('/');
  };

  const displayName =
    profile?.fullName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Account';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:gap-6">
        {/* Zone 1: Brand mark & wordmark */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 rounded"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-blue-600 text-white shadow-xs">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <rect x="3" y="9" width="2.4" height="6" rx="1.2" fill="currentColor" opacity="0.85" />
              <rect x="7.5" y="5" width="2.4" height="14" rx="1.2" fill="currentColor" />
              <rect x="12" y="3" width="2.4" height="18" rx="1.2" fill="currentColor" />
              <rect x="16.5" y="6.5" width="2.4" height="11" rx="1.2" fill="currentColor" />
              <rect x="21" y="9.5" width="2.4" height="5" rx="1.2" fill="currentColor" opacity="0.85" />
            </svg>
          </span>
          <span>VoxNexa</span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-5 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                  isActive
                    ? 'border-blue-700 text-slate-950 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-950 hover:border-slate-300'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Auth actions + mobile menu button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {authReady && !user && (
            <div className="hidden sm:flex items-center gap-2.5">
              <a
                href="/login"
                onClick={(e) => handleLinkClick(e, '/login')}
                aria-current={currentPath === '/login' ? 'page' : undefined}
                className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  currentPath === '/login'
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                Login
              </a>
              <a
                href="/register"
                onClick={(e) => handleLinkClick(e, '/register')}
                aria-current={currentPath === '/register' ? 'page' : undefined}
                className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap shrink-0"
              >
                Create Account
              </a>
            </div>
          )}

          {authReady && user && (
            <div className="hidden sm:flex items-center gap-2">
              <a
                href="/dashboard"
                onClick={(e) => handleLinkClick(e, '/dashboard')}
                title={displayName}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <UserIcon
                  className="h-4 w-4 shrink-0 text-blue-700"
                  aria-hidden="true"
                />
                <span className="max-w-[120px] truncate">{displayName}</span>
              </a>

              <a
                href="/dashboard"
                onClick={(e) => handleLinkClick(e, '/dashboard')}
                aria-current={currentPath === '/dashboard' ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  currentPath === '/dashboard'
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </a>

              <button
                type="button"
                onClick={handleLogoutClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex lg:hidden items-center justify-center rounded-lg border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700 min-h-[44px] min-w-[44px] cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Responsive mobile & tablet navigation drawer */}
      {mobileOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="lg:hidden border-t border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleLinkClick(e, item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px] ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}

            <div className="mt-2 border-t border-slate-200 pt-3 flex flex-col gap-2">
              {authReady && !user && (
                <>
                  <a
                    href="/login"
                    onClick={(e) => handleLinkClick(e, '/login')}
                    className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px]"
                  >
                    Login
                  </a>
                  <a
                    href="/register"
                    onClick={(e) => handleLinkClick(e, '/register')}
                    className="flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 min-h-[44px]"
                  >
                    Create Account
                  </a>
                </>
              )}

              {authReady && user && (
                <>
                  <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900">
                    <UserIcon
                      className="h-4 w-4 shrink-0 text-blue-700"
                      aria-hidden="true"
                    />
                    <span className="truncate">{displayName}</span>
                  </div>
                  <a
                    href="/dashboard"
                    onClick={(e) => handleLinkClick(e, '/dashboard')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 min-h-[44px]"
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </a>
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px] cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Logout
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onPrimaryAction();
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 min-h-[44px] cursor-pointer"
              >
                {currentPath === '/' ? 'Try Demo' : 'Open Studio'}
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
