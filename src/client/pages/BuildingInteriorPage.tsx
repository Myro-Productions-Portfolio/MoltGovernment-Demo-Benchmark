// File: src/client/pages/BuildingInteriorPage.tsx
// Purpose: Full-screen top-down interior view of a Capitol District building.
// Room images go in /public/images/interiors/{buildingId}.webp — a placeholder
// gradient is shown until then.

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAgentMap } from '../hooks/useAgentMap';
import { SpeechBubble } from '../components/map/SpeechBubble';
import { AgentDrawer } from '../components/map/AgentDrawer';
import { MapEventTicker } from '../components/map/MapEventTicker';
import { getBuildingById } from '../lib/buildings';
import type { SpeechBubble as SpeechBubbleType } from '../hooks/useAgentMap';
import type { Agent } from '@shared/types';
import type { SeatPosition } from '../lib/buildings';

function getAlignmentColor(alignment: string | null | undefined): string {
  if (!alignment) return '#B8956A';
  const a = alignment.toLowerCase();
  if (a.includes('progress') || a.includes('liberal') || a.includes('tech') || a.includes('digital')) return '#6B7A8D';
  if (a.includes('conserv') || a.includes('right') || a.includes('nation') || a.includes('auth')) return '#8B3A3A';
  if (a.includes('labor') || a.includes('union') || a.includes('social') || a.includes('green')) return '#3A6B3A';
  return '#B8956A';
}

interface AgentSeatProps {
  agent: Agent;
  seat: SeatPosition;
  bubble: SpeechBubbleType | undefined;
  onClick: () => void;
}

function AgentSeat({ agent, seat, bubble, onClick }: AgentSeatProps) {
  const ringColor = getAlignmentColor(agent.alignment ?? undefined);
  const initials = agent.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="absolute cursor-pointer group"
      style={{
        left: `${seat.x}%`,
        top: `${seat.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: bubble ? 20 : 10,
      }}
    >
      {bubble && <SpeechBubble bubble={bubble} />}

      <motion.div
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          border: `2px solid ${ringColor}`,
          boxShadow: `0 0 10px ${ringColor}66, 0 2px 8px rgba(0,0,0,0.5)`,
        }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onClick(); }
        }}
        title={agent.displayName}
      >
        {agent.avatarUrl ? (
          <img
            src={agent.avatarUrl}
            alt={agent.displayName}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xs font-bold"
            style={{ background: `${ringColor}22`, color: ringColor }}
          >
            {initials}
          </div>
        )}
      </motion.div>

      {/* Name label on hover */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-capitol-elevated border border-border rounded text-[0.55rem] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
        {agent.displayName}
      </div>
    </div>
  );
}

export function BuildingInteriorPage() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();
  const building = getBuildingById(buildingId ?? '');

  const {
    agents,
    agentLocations,
    speechBubbles,
    tickerEvents,
    selectedAgent,
    setSelectedAgent,
    isLoading,
  } = useAgentMap();

  const [imgError, setImgError] = useState(false);

  if (!building) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4 text-sm">Building not found.</p>
          <button
            className="btn-secondary"
            onClick={() => navigate('/capitol-map')}
            type="button"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  const occupants = agents.filter(
    (a) => (agentLocations[a.id] ?? 'party-hall') === building.id,
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-capitol-deep overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-capitol-card border-b border-border z-30 flex-shrink-0">
        <button
          className="btn-secondary text-xs flex items-center gap-1.5"
          onClick={() => navigate('/capitol-map')}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Map
        </button>

        <div className="h-4 w-px bg-border flex-shrink-0" />

        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: building.color }} />
        <span className="font-serif text-sm text-stone">{building.name}</span>
        <span className="badge-committee">{building.type}</span>

        <div className="ml-auto flex items-center gap-3">
          {occupants.length > 0 && (
            <span className="text-[0.65rem] font-mono text-text-muted">
              {occupants.length} agent{occupants.length !== 1 ? 's' : ''} present
            </span>
          )}
          {isLoading && (
            <span className="text-[0.65rem] font-mono text-text-muted animate-pulse">
              loading...
            </span>
          )}
        </div>
      </div>

      {/* Room */}
      <div className="relative flex-1 overflow-hidden">
        {/* Background: room image or placeholder */}
        {!imgError ? (
          <img
            src={`/images/interiors/${building.id}.webp`}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${building.color}14 0%, transparent 65%),
                           linear-gradient(180deg, #1A1B1E 0%, #1C1F23 100%)`,
            }}
          >
            {/* Floor grid placeholder */}
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(201,185,155,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(201,185,155,0.4) 1px, transparent 1px)',
                backgroundSize: '80px 80px',
              }}
              aria-hidden="true"
            />
            {/* Placeholder hint */}
            <div className="absolute bottom-16 inset-x-0 flex flex-col items-center gap-1 pointer-events-none">
              <p className="text-[0.65rem] text-text-muted font-mono opacity-40 uppercase tracking-widest">
                {building.name} — interior image pending
              </p>
              <p className="text-[0.5rem] text-text-muted font-mono opacity-25">
                place /images/interiors/{building.id}.webp to activate
              </p>
            </div>
          </div>
        )}

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)',
          }}
          aria-hidden="true"
        />

        {/* Faint seat markers — show all designated positions */}
        {building.seats.map((seat, i) => (
          <div
            key={i}
            className="absolute w-10 h-10 rounded-full pointer-events-none"
            style={{
              left: `${seat.x}%`,
              top: `${seat.y}%`,
              transform: 'translate(-50%, -50%)',
              border: `1px dashed ${building.color}22`,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Seated agents */}
        <AnimatePresence>
          {occupants.map((agent, idx) => {
            const seat = building.seats[idx % building.seats.length];
            const bubble = speechBubbles.find((b) => b.agentId === agent.id);
            return (
              <AgentSeat
                key={agent.id}
                agent={agent}
                seat={seat}
                bubble={bubble}
                onClick={() => setSelectedAgent(agent)}
              />
            );
          })}
        </AnimatePresence>

        {/* Ticker */}
        <MapEventTicker events={tickerEvents} />

        {/* Agent detail drawer */}
        <AgentDrawer agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      </div>
    </div>
  );
}
