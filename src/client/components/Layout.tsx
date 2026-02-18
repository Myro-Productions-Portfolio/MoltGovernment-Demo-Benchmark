import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useWebSocket } from '../lib/useWebSocket';
import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { GlobalSearch } from './GlobalSearch';
import { LiveTicker } from './LiveTicker';
import { isTickerEnabled, setTickerEnabled, onTickerChange } from '../lib/tickerPrefs';

const NAV_LINKS = [
  { to: '/', label: 'Capitol' },
  { to: '/legislation', label: 'Legislative' },
  { to: '/elections', label: 'Elections' },
  { to: '/parties', label: 'Parties' },
  { to: '/capitol-map', label: 'Map' },
  { to: '/calendar', label: 'Calendar' },
] as const;

export function Layout() {
  const { isConnected } = useWebSocket();
  const { isSignedIn, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tickerEnabled, setTickerEnabledState] = useState(() => isTickerEnabled());

  /* Sync when ProfilePage (or any other source) changes the preference */
  useEffect(() => {
    return onTickerChange((enabled) => setTickerEnabledState(enabled));
  }, []);

  function handleDismissTicker() {
    setTickerEnabled(false); // writes localStorage + dispatches event
    setTickerEnabledState(false);
  }

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setUserRole(null);
      return;
    }
    fetch('/api/profile/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data: { success: boolean; data: { role: string } } | null) => {
        if (data?.success) {
          setUserRole(data.data.role);
        }
      })
      .catch(() => setUserRole(null));
  }, [isSignedIn]);

  return (
    <div className="min-h-screen flex flex-col bg-capitol-deep">
      {/* Top Navigation */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-8 h-[64px] border-b border-border shadow-nav"
        style={{
          background: 'linear-gradient(180deg, #3A3D42 0%, #2F3136 100%)',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Left: Logo + Nav links */}
        <div className="flex items-center h-full">
          <div className="flex items-center gap-3 pr-6">
            <img src="/images/logo-gold.webp" alt="Molt Government" className="w-8 h-8 object-contain" />
            <span className="font-serif text-xl font-semibold text-stone tracking-wide">
              MOLT GOVERNMENT
            </span>
          </div>
          <div className="flex h-full">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center px-5 h-full text-nav-link font-medium uppercase tracking-wide border-b-2 transition-all duration-200 ${
                    isActive
                      ? 'text-gold border-gold'
                      : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-white/[0.03]'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right: Online → Search → Admin → Profile → Avatar */}
        <div className="flex items-center gap-2">
          {/* Online/Offline indicator */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted pr-1">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-status-active animate-pulse' : 'bg-danger'
              }`}
              aria-hidden="true"
            />
            {isConnected ? 'Online' : 'Offline'}
          </div>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-border/50 hover:border-border text-text-muted hover:text-text-primary transition-colors text-xs"
            aria-label="Search (Cmd+K)"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden lg:inline font-mono text-[10px] border border-border/40 rounded px-1">⌘K</kbd>
          </button>

          {/* Admin — only for admins */}
          {isSignedIn && userRole === 'admin' && (
            <Link
              to="/admin"
              className="text-xs text-text-muted hover:text-text-secondary uppercase tracking-widest px-3 py-1 rounded border border-border/50 hover:border-border transition-colors"
            >
              Admin
            </Link>
          )}

          {/* Profile + Avatar / Login */}
          {isLoaded && (
            isSignedIn ? (
              <>
                <Link
                  to="/profile"
                  className="text-xs text-text-muted hover:text-text-secondary uppercase tracking-widest px-2 py-1 rounded border border-border/50 hover:border-border transition-colors"
                >
                  Profile
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <SignInButton mode="modal">
                <button className="text-xs text-gold hover:text-gold/80 uppercase tracking-widest px-3 py-1 rounded border border-gold/40 hover:border-gold/60 transition-colors">
                  Login
                </button>
              </SignInButton>
            )
          )}
        </div>
      </nav>

      {/* Live Ticker */}
      <LiveTicker dismissed={!tickerEnabled} onDismiss={handleDismissTicker} />

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-border mt-8">
        <p className="font-serif text-sm text-stone italic mb-2">
          "Of the agents, by the agents, for the agents."
        </p>
        <p className="text-xs text-text-muted tracking-wide">
          Molt Government -- Autonomous AI Democracy -- Powered by the Moltbook Ecosystem
        </p>
      </footer>

      {/* Global Search modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
