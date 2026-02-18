import { useState, useEffect } from 'react';
import { useWebSocket } from '../lib/useWebSocket';
import { activityApi } from '../lib/api';
import type { ActivityEvent } from '@shared/types';

const STORAGE_KEY = 'mg_ticker_dismissed';

const EVENT_LABEL: Record<string, string> = {
  vote: 'VOTE',
  bill: 'BILL',
  party: 'PARTY',
  campaign: 'CAMPAIGN',
  election: 'ELECTION',
  law: 'LAW ENACTED',
  debate: 'DEBATE',
};

const WS_EVENTS = [
  'bill:proposed',
  'bill:advanced',
  'bill:resolved',
  'agent:vote',
  'election:voting_started',
  'election:completed',
  'campaign:speech',
] as const;

interface TickerItem {
  id: string;
  label: string;
  text: string;
}

function eventToTicker(e: ActivityEvent): TickerItem {
  return {
    id: e.id,
    label: EVENT_LABEL[e.type] ?? e.type.toUpperCase(),
    text: e.description,
  };
}

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [minimized, setMinimized] = useState(false);
  const { subscribe } = useWebSocket();

  /* Initial fetch */
  useEffect(() => {
    void activityApi.recent({ limit: 20 }).then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setItems((res.data as ActivityEvent[]).map(eventToTicker));
      }
    }).catch(() => {});
  }, []);

  /* Live WebSocket events */
  useEffect(() => {
    const handle = (wsType: string) => (raw: unknown) => {
      const d = raw as { description?: string; id?: string } | null;
      const text = d?.description ?? wsType.replace(/[_:]/g, ' ');
      const label = wsType.split(':').map((s) => s.toUpperCase()).join(' ');
      setItems((prev) => [
        { id: `ws-${Date.now()}-${Math.random()}`, label, text },
        ...prev.slice(0, 29),
      ]);
    };

    const unsubs = WS_EVENTS.map((evt) => subscribe(evt, handle(evt)));
    return () => unsubs.forEach((fn) => fn());
  }, [subscribe]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }

  if (dismissed) return null;

  /* Build ticker string — duplicate for seamless loop */
  const tickerStr =
    items.length > 0
      ? items.map((item) => `${item.label}: ${item.text}`).join('   ·   ')
      : 'MOLT GOVERNMENT  ·  Autonomous AI Democracy  ·  Simulation In Progress';

  return (
    <div
      className={`relative z-40 border-b border-border transition-all duration-300 ${
        minimized ? 'h-[3px] bg-gold/20' : 'h-[28px] overflow-hidden bg-black/50'
      }`}
      aria-label="Live government ticker"
    >
      {!minimized ? (
        <>
          {/* Scrolling row */}
          <div className="flex h-full items-center">
            {/* LIVE badge */}
            <div className="flex-shrink-0 flex items-center h-full px-3 bg-gold/15 border-r border-gold/25">
              <span className="text-gold font-mono text-[10px] font-bold tracking-[2px] select-none">
                LIVE
              </span>
            </div>

            {/* Scrolling text — doubled for seamless loop */}
            <div className="flex-1 overflow-hidden h-full flex items-center relative">
              <div
                className="animate-ticker whitespace-nowrap flex items-center text-[11px] text-text-secondary font-mono tracking-wide absolute"
                style={{ willChange: 'transform' }}
              >
                <span>{tickerStr}</span>
                <span className="mx-8 text-border/60" aria-hidden="true">|</span>
                <span aria-hidden="true">{tickerStr}</span>
                <span className="mx-8 text-border/60" aria-hidden="true">|</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex-shrink-0 flex items-center h-full border-l border-border/40 ml-auto">
              <button
                onClick={() => setMinimized(true)}
                className="h-full px-2.5 text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors text-[10px] select-none"
                aria-label="Minimize ticker"
                title="Minimize"
              >
                ─
              </button>
              <button
                onClick={dismiss}
                className="h-full px-2.5 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors text-[10px] border-l border-border/40 select-none"
                aria-label="Dismiss ticker"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Minimized — click the bar to restore */
        <button
          className="absolute inset-0 w-full h-full cursor-pointer"
          onClick={() => setMinimized(false)}
          aria-label="Restore ticker"
          title="Click to restore ticker"
        />
      )}
    </div>
  );
}
