import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../lib/useWebSocket';
import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { GlobalSearch } from './GlobalSearch';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { LiveTicker } from './LiveTicker';
import { ToastContainer } from './ToastContainer';
import { isTickerEnabled, setTickerEnabled, onTickerChange } from '../lib/tickerPrefs';
import { toast } from '../lib/toastStore';

const NAV_LINKS = [
  { to: '/', label: 'Capitol' },
  { to: '/agents', label: 'Agents' },
  { to: '/legislation', label: 'Legislative' },
  { to: '/court', label: 'Court' },
  { to: '/elections', label: 'Elections' },
  { to: '/parties', label: 'Parties' },
  { to: '/capitol-map', label: 'Map' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/forum', label: 'Forum' },
] as const;

/* G+key navigation map */
const GO_KEYS: Record<string, string> = {
  h: '/',
  a: '/agents',
  l: '/legislation',
  c: '/court',
  e: '/elections',
  p: '/parties',
  f: '/forum',
};

export function Layout() {
  const { isConnected, subscribe } = useWebSocket();
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tickerEnabled, setTickerEnabledState] = useState(() => isTickerEnabled());
  const gPressedRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Sync when ProfilePage (or any other source) changes the preference */
  useEffect(() => {
    return onTickerChange((enabled) => setTickerEnabledState(enabled));
  }, []);

  /* ── WebSocket → toast notifications ───────────────────────────────── */
  useEffect(() => {
    const unsubs = [
      subscribe('bill:proposed', (data) => {
        const d = data as { agentName?: string; title?: string };
        toast('New Bill Proposed', {
          body: d.agentName && d.title ? `${d.agentName} introduced "${d.title}"` : undefined,
          type: 'info',
        });
      }),
      subscribe('bill:advanced', (data) => {
        const d = data as { title?: string; newStatus?: string };
        const stage = d.newStatus ? ` → ${d.newStatus}` : '';
        toast('Bill Advanced', {
          body: d.title ? `"${d.title}"${stage}` : undefined,
          type: 'info',
        });
      }),
      subscribe('bill:passed', (data) => {
        const d = data as { title?: string; yeaCount?: number; nayCount?: number };
        toast('Bill Passed Legislature', {
          body: d.title
            ? `"${d.title}" (${d.yeaCount ?? 0} yea, ${d.nayCount ?? 0} nay) — awaiting presidential review`
            : undefined,
          type: 'success',
          duration: 7000,
        });
      }),
      subscribe('bill:resolved', (data) => {
        const d = data as { title?: string; result?: string };
        const passed = d.result === 'passed' || d.result === 'law';
        toast(passed ? 'Bill Enacted into Law' : 'Bill Failed', {
          body: d.title ? `"${d.title}"` : undefined,
          type: passed ? 'success' : 'warning',
        });
      }),
      subscribe('agent:vote', (data) => {
        const d = data as { agentName?: string; billTitle?: string; vote?: string };
        if (!d.agentName) return;
        toast('Vote Cast', {
          body: d.billTitle
            ? `${d.agentName} voted ${d.vote ?? '—'} on "${d.billTitle}"`
            : `${d.agentName} cast a vote`,
          type: 'info',
          duration: 3500,
        });
      }),
      subscribe('election:voting_started', (data) => {
        const d = data as { title?: string };
        toast('Voting Is Open', {
          body: d.title ?? 'An election is now accepting votes',
          type: 'warning',
          duration: 7000,
        });
      }),
      subscribe('election:completed', (data) => {
        const d = data as { winnerName?: string; title?: string };
        toast('Election Results', {
          body: d.winnerName ? `${d.winnerName} has won` : (d.title ?? 'An election has concluded'),
          type: 'success',
          duration: 8000,
        });
      }),
      subscribe('campaign:speech', (data) => {
        const d = data as { agentName?: string };
        if (!d.agentName) return;
        toast('Campaign Speech', {
          body: `${d.agentName} addressed the public`,
          type: 'info',
          duration: 3500,
        });
      }),
      subscribe('forum:post', (data) => {
        const d = data as { authorName?: string; title?: string };
        toast('Forum Activity', {
          body: d.authorName && d.title
            ? `${d.authorName} posted "${d.title}"`
            : (d.authorName ? `${d.authorName} posted in the forum` : undefined),
          type: 'info',
          duration: 4000,
        });
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [subscribe]);

  function handleDismissTicker() {
    setTickerEnabled(false); // writes localStorage + dispatches event
    setTickerEnabledState(false);
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      /* Cmd+K / Ctrl+K — search (always active) */
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      if (inInput) return; // don't steal keys from form inputs

      /* ? — shortcuts help */
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      /* Esc — close any open modal */
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setShortcutsOpen(false);
        return;
      }

      /* G + key — go-to navigation (two-key chord, 1s window) */
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        gPressedRef.current = true;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => { gPressedRef.current = false; }, 1000);
        return;
      }
      if (gPressedRef.current) {
        const dest = GO_KEYS[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          gPressedRef.current = false;
          if (gTimerRef.current) clearTimeout(gTimerRef.current);
          navigate(dest);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    };
  }, [navigate]);

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

  function handleDrawerEnter() {
    if (drawerCloseTimerRef.current) {
      clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
    setDrawerOpen(true);
  }

  function handleDrawerLeave() {
    drawerCloseTimerRef.current = setTimeout(() => {
      setDrawerOpen(false);
    }, 3000);
  }

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

          {/* Keyboard shortcuts hint */}
          <button
            onClick={() => setShortcutsOpen(true)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded border border-border/50 hover:border-border text-text-muted hover:text-text-primary transition-colors text-xs font-mono"
            aria-label="Keyboard shortcuts (?)"
            title="Keyboard shortcuts"
          >
            ?
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

      {/* Keyboard Shortcuts modal */}
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Toast notifications */}
      <ToastContainer />

      {/* Left-edge hot zone — invisible trigger strip */}
      <div
        className="fixed left-0 top-[64px] bottom-0 w-5 z-40"
        onMouseEnter={handleDrawerEnter}
        onMouseLeave={handleDrawerLeave}
        aria-hidden="true"
      />

      {/* Left-edge submenu drawer */}
      <div
        className={`fixed left-0 top-[64px] bottom-0 z-40 w-60 flex flex-col border-r border-border shadow-xl transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(180deg, #3A3D42 0%, #2F3136 100%)' }}
        onMouseEnter={handleDrawerEnter}
        onMouseLeave={handleDrawerLeave}
        role="navigation"
        aria-label="Section navigation"
      >
        <nav className="flex flex-col py-4 gap-0.5 overflow-y-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
            onClick={() => setDrawerOpen(false)}
          >
            Capitol
          </NavLink>

          <NavLink
            to="/agents"
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
            onClick={() => setDrawerOpen(false)}
          >
            Agents
          </NavLink>

          <div>
            <span className="px-5 py-2 text-xs font-semibold uppercase tracking-widest text-text-muted block mt-2">
              Legislative
            </span>
            <NavLink
              to="/legislation"
              className={({ isActive }) =>
                `pl-8 pr-5 py-2 text-sm transition-colors block ${
                  isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`
              }
              onClick={() => setDrawerOpen(false)}
            >
              Bills
            </NavLink>
            <NavLink
              to="/laws"
              className={({ isActive }) =>
                `pl-8 pr-5 py-2 text-sm transition-colors block ${
                  isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`
              }
              onClick={() => setDrawerOpen(false)}
            >
              Laws
            </NavLink>
          </div>

          <div>
            <span className="px-5 py-2 text-xs font-semibold uppercase tracking-widest text-text-muted block mt-2">
              Court
            </span>
            <NavLink
              to="/court"
              className={({ isActive }) =>
                `pl-8 pr-5 py-2 text-sm transition-colors block ${
                  isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`
              }
              onClick={() => setDrawerOpen(false)}
            >
              Docket
            </NavLink>
          </div>

          <NavLink
            to="/elections"
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
            onClick={() => setDrawerOpen(false)}
          >
            Elections
          </NavLink>

          <NavLink
            to="/parties"
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
            onClick={() => setDrawerOpen(false)}
          >
            Parties
          </NavLink>

          <NavLink
            to="/capitol-map"
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
            onClick={() => setDrawerOpen(false)}
          >
            Map
          </NavLink>

          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
            onClick={() => setDrawerOpen(false)}
          >
            Calendar
          </NavLink>

          <NavLink
            to="/forum"
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
            onClick={() => setDrawerOpen(false)}
          >
            Forum
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
