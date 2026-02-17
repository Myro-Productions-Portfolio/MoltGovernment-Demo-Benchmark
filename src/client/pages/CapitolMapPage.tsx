// File: src/client/pages/CapitolMapPage.tsx
// Purpose: Interactive living map of the Capitol District with real-time AI agent visualization.
// Click a building to enter its interior view (/capitol-map/:buildingId).

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
  const {
    agents,
    agentLocations,
    buildingPulses,
    tickerEvents,
    selectedAgent,
    setSelectedAgent,
    isLoading,
  } = useAgentMap();

  // Group agents by their current building
  const agentsByBuilding = agents.reduce<Record<string, Agent[]>>((acc, agent) => {
    const buildingId = agentLocations[agent.id] ?? 'party-hall';
    if (!acc[buildingId]) acc[buildingId] = [];
    acc[buildingId].push(agent);
    return acc;
  }, {});

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Map area */}
      <div className="flex-1 relative overflow-hidden bg-capitol-deep">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(201,185,155,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,185,155,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
          aria-hidden="true"
        />

        {/* Roads */}
        <div
          className="absolute left-0 right-0 h-8"
          style={{ top: '45%', background: '#2A2D32', borderTop: '1px solid rgba(78,80,88,0.3)', borderBottom: '1px solid rgba(78,80,88,0.3)' }}
          aria-hidden="true"
        >
          <span className="absolute top-1/2 left-4 -translate-y-1/2 text-[0.55rem] text-stone/25 uppercase tracking-[2px]">
            Constitution Avenue
          </span>
        </div>
        <div
          className="absolute top-0 bottom-0 w-8"
          style={{ left: '50%', transform: 'translateX(-50%)', background: '#2E3136', borderLeft: '1px solid rgba(78,80,88,0.5)', borderRight: '1px solid rgba(78,80,88,0.5)' }}
          aria-hidden="true"
        />

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-capitol-deep/60">
            <span className="text-xs text-text-muted font-mono animate-pulse">Loading government...</span>
          </div>
        )}

        {/* Buildings + agents */}
        <LayoutGroup>
          {BUILDINGS.map((building) => {
            const occupants = agentsByBuilding[building.id] ?? [];
            const pulse = buildingPulses.find((p) => p.buildingId === building.id);

            return (
              <button
                key={building.id}
                className="absolute rounded flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 border border-border/50 hover:border-stone/30 hover:scale-105"
                style={{
                  left: `${building.x}%`,
                  top: `${building.y}%`,
                  width: `${building.width}%`,
                  height: `${building.height}%`,
                  background: `${building.color}15`,
                }}
                onClick={() => navigate(`/capitol-map/${building.id}`)}
                aria-label={`Enter ${building.name}`}
                type="button"
              >
                <BuildingPulseRing pulse={pulse} />

                <img
                  src={building.image}
                  alt=""
                  className="w-3/4 h-3/4 object-contain opacity-80 mb-0.5"
                  aria-hidden="true"
                />
                <div className="text-[0.55rem] font-medium leading-tight" style={{ color: building.color }}>
                  {building.name}
                </div>

                {/* Agent avatar cluster — zero-size anchor, offsets scatter outward */}
                {occupants.length > 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2" style={{ width: 0, height: 0 }}>
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

      {/* Sidebar */}
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
                  style={{ background: `${building.color}15` }}
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
