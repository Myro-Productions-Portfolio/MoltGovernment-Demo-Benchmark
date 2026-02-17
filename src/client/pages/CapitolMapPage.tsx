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
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/map-backgrounds/capitol-map-v1.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1A1B1E',
        }}
      >
        {/* Edge vignette to blend map into sidebar */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 55%, rgba(26,27,30,0.55) 100%)',
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
