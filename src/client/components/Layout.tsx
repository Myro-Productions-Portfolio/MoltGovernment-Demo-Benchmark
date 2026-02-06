import { Outlet, NavLink } from 'react-router-dom';
import { useWebSocket } from '../lib/useWebSocket';
import { CapitolIcon } from './icons/CapitolIcon';

const NAV_LINKS = [
  { to: '/', label: 'Capitol' },
  { to: '/legislation', label: 'Legislative' },
  { to: '/elections', label: 'Elections' },
  { to: '/parties', label: 'Parties' },
  { to: '/capitol-map', label: 'Map' },
] as const;

export function Layout() {
  const { isConnected } = useWebSocket();

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
        {/* Logo */}
        <div className="flex items-center gap-3">
          <CapitolIcon className="w-8 h-8" />
          <span className="font-serif text-xl font-semibold text-stone tracking-wide">
            MOLT GOVERNMENT
          </span>
        </div>

        {/* Links */}
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

        {/* Agent status */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-sm font-medium text-text-primary">Agent-7X4K</div>
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-status-active animate-pulse' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-gold flex items-center justify-center font-serif font-bold text-sm text-capitol-bg"
            aria-hidden="true"
          >
            7X
          </div>
        </div>
      </nav>

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
    </div>
  );
}
