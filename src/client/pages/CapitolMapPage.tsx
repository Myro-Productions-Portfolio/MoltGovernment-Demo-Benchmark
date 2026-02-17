// File: src/client/pages/CapitolMapPage.tsx
// Purpose: Interactive living map of the Capitol District.
// Click a building to enter its interior view (/capitol-map/:buildingId).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAgentMap } from '../hooks/useAgentMap';
import { AgentAvatarDot } from '../components/map/AgentAvatarDot';
import { BuildingPulseRing } from '../components/map/BuildingPulseRing';
import { AgentDrawer } from '../components/map/AgentDrawer';
import { MapEventTicker } from '../components/map/MapEventTicker';
import { BUILDINGS } from '../lib/buildings';
import type { Agent } from '@shared/types';

export function CapitolMapPage() {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const {
    agents,
    agentLocations,
    buildingPulses,
    tickerEvents,
    selectedAgent,
    setSelectedAgent,
    isLoading,
  } = useAgentMap();

  const agentsByBuilding = agents.reduce<Record<string, Agent[]>>((acc, agent) => {
    const buildingId = agentLocations[agent.id] ?? 'party-hall';
    if (!acc[buildingId]) acc[buildingId] = [];
    acc[buildingId].push(agent);
    return acc;
  }, {});

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ── MAP CANVAS ── */}
      <div className="flex-1 relative overflow-hidden bg-capitol-deep">

        {/* ── LAYER 1: SVG ground — zones, block grid, diagonal road ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* Radial glow centered on Capitol Hill */}
            <radialGradient id="capitolHillGlow" cx="50%" cy="30%" r="30%">
              <stop offset="0%" stopColor="#C9B99B" stopOpacity="0.055" />
              <stop offset="100%" stopColor="#C9B99B" stopOpacity="0" />
            </radialGradient>
            {/* South mall green ambient */}
            <radialGradient id="southMallAmbient" cx="50%" cy="78%" r="40%">
              <stop offset="0%" stopColor="#3A6B3A" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#3A6B3A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ground zone washes */}
          <rect x="0" y="0" width="100" height="100" fill="url(#capitolHillGlow)" />
          <rect x="0" y="0" width="100" height="100" fill="url(#southMallAmbient)" />

          {/* City-block grid — large block lines, very subtle */}
          <line x1="0" y1="18" x2="100" y2="18" stroke="rgba(201,185,155,0.05)" strokeWidth="0.18" />
          <line x1="0" y1="62" x2="100" y2="62" stroke="rgba(201,185,155,0.05)" strokeWidth="0.18" />
          <line x1="27" y1="0" x2="27" y2="100" stroke="rgba(201,185,155,0.05)" strokeWidth="0.18" />
          <line x1="73" y1="0" x2="73" y2="100" stroke="rgba(201,185,155,0.05)" strokeWidth="0.18" />
          {/* Sub-block lines */}
          <line x1="0" y1="40" x2="100" y2="40" stroke="rgba(201,185,155,0.028)" strokeWidth="0.12" />
          <line x1="0" y1="82" x2="100" y2="82" stroke="rgba(201,185,155,0.028)" strokeWidth="0.12" />
          <line x1="14" y1="0" x2="14" y2="100" stroke="rgba(201,185,155,0.028)" strokeWidth="0.12" />
          <line x1="40" y1="0" x2="40" y2="100" stroke="rgba(201,185,155,0.028)" strokeWidth="0.12" />
          <line x1="60" y1="0" x2="60" y2="100" stroke="rgba(201,185,155,0.028)" strokeWidth="0.12" />
          <line x1="86" y1="0" x2="86" y2="100" stroke="rgba(201,185,155,0.028)" strokeWidth="0.12" />

          {/* ── Pennsylvania Avenue diagonal — Executive Mansion → Capitol junction ── */}
          {/* Shoulder (outer glow/curb) */}
          <line
            x1="22" y1="26"
            x2="49" y2="43.5"
            stroke="#28292E"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          {/* Road surface */}
          <line
            x1="22" y1="26"
            x2="49" y2="43.5"
            stroke="#1C1E22"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Center dash */}
          <line
            x1="22" y1="26"
            x2="49" y2="43.5"
            stroke="rgba(78,80,88,0.55)"
            strokeWidth="0.28"
            strokeLinecap="round"
            strokeDasharray="2.2 2.2"
          />

          {/* ── Supreme Court connector — faint road east of Capitol ── */}
          <line
            x1="52" y1="43.5"
            x2="75" y2="28"
            stroke="#222428"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <line
            x1="52" y1="43.5"
            x2="75" y2="28"
            stroke="#1C1E22"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        {/* ── LAYER 2: CSS roads — horizontal (Constitution Ave) + vertical (Mall axis) ── */}

        {/* Constitution Avenue — horizontal */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: '43.5%', height: '4%' }}
          aria-hidden="true"
        >
          {/* Shoulder base */}
          <div className="absolute inset-0" style={{ background: '#252729' }} />
          {/* Road surface (inner strip) */}
          <div
            className="absolute left-0 right-0"
            style={{ top: '20%', bottom: '20%', background: '#1B1D20' }}
          />
          {/* Outer curb lines */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'rgba(60,63,69,0.9)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'rgba(60,63,69,0.9)' }} />
          {/* Inner shoulder-to-surface edge lines */}
          <div
            className="absolute left-0 right-0"
            style={{ top: '20%', height: '1px', background: 'rgba(48,51,56,0.7)' }}
          />
          <div
            className="absolute left-0 right-0"
            style={{ bottom: '20%', height: '1px', background: 'rgba(48,51,56,0.7)' }}
          />
          {/* Center lane dashes */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: '50%',
              height: '1px',
              transform: 'translateY(-50%)',
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(78,80,88,0.75) 0px, rgba(78,80,88,0.75) 22px, transparent 22px, transparent 40px)',
            }}
          />
          {/* Road name */}
          <span
            className="absolute top-1/2 -translate-y-1/2 font-mono uppercase select-none"
            style={{
              left: '1.5rem',
              fontSize: '0.42rem',
              letterSpacing: '0.24em',
              color: 'rgba(201,185,155,0.22)',
            }}
          >
            Constitution Avenue
          </span>
        </div>

        {/* Capitol Mall axis — vertical */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: '48%', width: '4%' }}
          aria-hidden="true"
        >
          {/* Shoulder base */}
          <div className="absolute inset-0" style={{ background: '#252729' }} />
          {/* Road surface */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: '20%', right: '20%', background: '#1B1D20' }}
          />
          {/* Outer curb lines */}
          <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: 'rgba(60,63,69,0.9)' }} />
          <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background: 'rgba(60,63,69,0.9)' }} />
          {/* Inner shoulder-to-surface edge lines */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: '20%', width: '1px', background: 'rgba(48,51,56,0.7)' }}
          />
          <div
            className="absolute top-0 bottom-0"
            style={{ right: '20%', width: '1px', background: 'rgba(48,51,56,0.7)' }}
          />
          {/* Center lane dashes */}
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: '50%',
              width: '1px',
              transform: 'translateX(-50%)',
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(78,80,88,0.75) 0px, rgba(78,80,88,0.75) 22px, transparent 22px, transparent 40px)',
            }}
          />
          {/* Road name — rotated */}
          <span
            className="absolute font-mono uppercase select-none"
            style={{
              top: '20%',
              left: '50%',
              fontSize: '0.42rem',
              letterSpacing: '0.22em',
              color: 'rgba(201,185,155,0.18)',
              transform: 'rotate(90deg) translateX(0) translateY(-50%)',
              transformOrigin: 'left center',
              whiteSpace: 'nowrap',
            }}
          >
            Capitol Mall
          </span>
        </div>

        {/* Intersection block — clean fill over road crossing */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '48%',
            width: '4%',
            top: '43.5%',
            height: '4%',
            background: '#1B1D20',
          }}
          aria-hidden="true"
        />
        {/* Intersection crosswalk stripes — both directions */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '48%',
            width: '4%',
            top: '43.5%',
            height: '4%',
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(78,80,88,0.2) 0px, rgba(78,80,88,0.2) 2px, transparent 2px, transparent 6px)',
          }}
          aria-hidden="true"
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-capitol-deep/60">
            <span className="text-xs text-text-muted font-mono animate-pulse">
              Loading government...
            </span>
          </div>
        )}

        {/* ── LAYER 3: Buildings ── */}
        <LayoutGroup>
          {BUILDINGS.map((building) => {
            const occupants = agentsByBuilding[building.id] ?? [];
            const pulse = buildingPulses.find((p) => p.buildingId === building.id);
            const isHovered = hoveredId === building.id;

            return (
              <button
                key={building.id}
                className="absolute rounded flex flex-col items-center justify-center text-center cursor-pointer"
                style={{
                  left: `${building.x}%`,
                  top: `${building.y}%`,
                  width: `${building.width}%`,
                  height: `${building.height}%`,
                  background: `linear-gradient(160deg, ${building.color}1E 0%, ${building.color}09 100%)`,
                  border: `1px solid ${building.color}${isHovered ? '72' : '3E'}`,
                  boxShadow: isHovered
                    ? `0 6px 28px rgba(0,0,0,0.8), 0 0 20px ${building.color}20, inset 0 1px 0 ${building.color}28`
                    : `0 3px 14px rgba(0,0,0,0.6), inset 0 1px 0 ${building.color}16`,
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                  zIndex: isHovered ? 10 : 1,
                }}
                onClick={() => navigate(`/capitol-map/${building.id}`)}
                onMouseEnter={() => setHoveredId(building.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-label={`Enter ${building.name}`}
                type="button"
              >
                <BuildingPulseRing pulse={pulse} />

                <img
                  src={building.image}
                  alt=""
                  className="w-3/4 h-3/4 object-contain mb-0.5"
                  style={{
                    opacity: isHovered ? 0.95 : 0.78,
                    transition: 'opacity 0.18s ease',
                  }}
                  aria-hidden="true"
                />

                {/* Building name */}
                <div
                  className="font-medium leading-tight"
                  style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.04em',
                    color: building.color,
                    textShadow: '0 1px 5px rgba(0,0,0,0.95)',
                  }}
                >
                  {building.name}
                </div>

                {/* Building type — micro label */}
                <div
                  className="font-mono uppercase"
                  style={{
                    fontSize: '0.38rem',
                    letterSpacing: '0.2em',
                    color: `${building.color}66`,
                    marginTop: '1px',
                  }}
                >
                  {building.type}
                </div>

                {/* Agent avatar cluster */}
                {occupants.length > 0 && (
                  <div
                    className="absolute -top-5 left-1/2 -translate-x-1/2"
                    style={{ width: 0, height: 0 }}
                  >
                    <AnimatePresence>
                      {occupants.map((agent, idx) => (
                        <div key={agent.id} className="relative">
                          <AgentAvatarDot
                            agent={agent}
                            index={idx}
                            hasSpeechBubble={false}
                            onClick={() => setSelectedAgent(agent)}
                          />
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </button>
            );
          })}
        </LayoutGroup>

        <MapEventTicker events={tickerEvents} />
        <AgentDrawer agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      </div>

      {/* ── SIDEBAR ── */}
      <aside className="w-80 bg-capitol-card border-l border-border overflow-y-auto p-5 flex-shrink-0">
        <h2 className="font-serif text-lg text-stone mb-4">Capitol District</h2>

        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse" />
          <span className="text-[0.65rem] text-text-muted font-mono">
            {isLoading ? 'Loading...' : `${agents.length} agents active`}
          </span>
        </div>

        <p className="text-xs text-text-muted mb-4">
          Click a building to enter and see agents inside.
        </p>

        <div className="space-y-2">
          {BUILDINGS.map((building) => {
            const occupantCount = (agentsByBuilding[building.id] ?? []).length;
            return (
              <button
                key={building.id}
                className="w-full text-left card p-3 flex items-center gap-3 hover:border-stone/30 transition-colors"
                onClick={() => navigate(`/capitol-map/${building.id}`)}
                type="button"
              >
                <div
                  className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: `${building.color}18` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: building.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{building.name}</div>
                  <div className="text-xs text-text-muted">{building.type}</div>
                </div>
                {occupantCount > 0 && (
                  <span className="text-[0.6rem] font-mono text-gold bg-gold/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {occupantCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
