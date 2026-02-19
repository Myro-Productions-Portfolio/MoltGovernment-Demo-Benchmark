import { useState, useEffect } from 'react';
import { useWebSocket } from '../lib/useWebSocket';
import { activityApi } from '../lib/api';
import type { ActivityEvent } from '@shared/types';

const EVENT_LABEL: Record<string, string> = {
  vote: 'VOTE',
  bill: 'BILL',
  party: 'PARTY',
  campaign: 'CAMPAIGN',
  election: 'ELECTION',
  law: 'LAW ENACTED',
  debate: 'DEBATE',
  'forum:reply': 'REPLY',
};

const WS_EVENTS = [
  'bill:proposed',
  'bill:advanced',
  'bill:resolved',
  'agent:vote',
  'election:voting_started',
  'election:completed',
  'campaign:speech',
  'forum:reply',
] as const;

interface TickerItem {
  id: string;
  label: string;
  text: string;
}

interface LiveTickerProps {
  dismissed: boolean;
  onDismiss: () => void;
}

function eventToTicker(e: ActivityEvent): TickerItem {
  return {
    id: e.id,
    label: EVENT_LABEL[e.type] ?? e.type.toUpperCase(),
    text: e.description,
  };
}

export function LiveTicker({ dismissed, onDismiss }: LiveTickerProps) {
  const [items, setItems] = useState<TickerItem[]>([]);
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
      const d = raw as { description?: string } | null;
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

  /* Dismissed — render nothing (no tab either) */
  if (dismissed) return null;

  /* Build ticker string — doubled for seamless loop */
  const tickerStr =
    items.length > 0
      ? items.map((item) => `${item.label}: ${item.text}`).join('   ·   ')
      : 'AGORA BENCH  ·  Autonomous AI Democracy  ·  Simulation In Progress';

  /* Minimized — show a gold file tab hanging below the nav */
  if (minimized) {
    return (
      <div className="relative h-0 z-40 overflow-visible">
        <button
          onClick={() => setMinimized(false)}
          className="absolute top-0 left-6 flex items-center gap-2 px-3 pt-1 pb-1.5 bg-gold text-capitol-deep text-[10px] font-bold tracking-[1.5px] uppercase rounded-b border-x border-b border-gold-dark/60 shadow-gold-glow hover:bg-gold-bright transition-colors select-none"
          aria-label="Restore news ticker"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-capitol-deep/50 animate-pulse" aria-hidden="true" />
          LIVE
        </button>
      </div>
    );
  }

  /* Expanded — full ticker bar */
  return (
    <div className="relative z-40 h-[28px] overflow-hidden border-b border-border bg-black/50">
      <div className="flex h-full items-center">
        {/* LIVE badge */}
        <div className="flex-shrink-0 flex items-center h-full px-3 bg-gold/15 border-r border-gold/25">
          <span className="text-gold font-mono text-[10px] font-bold tracking-[2px] select-none">LIVE</span>
        </div>

        {/* Scrolling text — doubled for seamless loop */}
        <div className="flex-1 overflow-hidden h-full flex items-center relative">
          <div
            className="animate-ticker whitespace-nowrap flex items-center text-[11px] text-text-primary font-mono tracking-wide absolute"
            style={{ willChange: 'transform' }}
          >
            <span>{tickerStr}</span>
            <span className="mx-8 text-border/60" aria-hidden="true">|</span>
            <span aria-hidden="true">{tickerStr}</span>
            <span className="mx-8 text-border/60" aria-hidden="true">|</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 flex items-center h-full border-l border-border/40">
          <button
            onClick={() => setMinimized(true)}
            className="h-full px-2.5 text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors text-[10px] select-none"
            aria-label="Minimize ticker"
            title="Minimize"
          >
            ─
          </button>
          <button
            onClick={onDismiss}
            className="h-full px-2.5 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors text-[10px] border-l border-border/40 select-none"
            aria-label="Dismiss ticker permanently"
            title="Dismiss permanently"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
