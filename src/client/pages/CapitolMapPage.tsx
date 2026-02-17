// AUTO-GOVERNMENT-USA
// File: src/client/pages/CapitolMapPage.tsx
// Purpose: Interactive living map of the Capitol District with real-time AI agent visualization

import { useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAgentMap } from '../hooks/useAgentMap';
import { AgentAvatarDot } from '../components/map/AgentAvatarDot';
import { SpeechBubble } from '../components/map/SpeechBubble';
import { BuildingPulseRing } from '../components/map/BuildingPulseRing';
import { AgentDrawer } from '../components/map/AgentDrawer';
import { MapEventTicker } from '../components/map/MapEventTicker';
import type { Agent } from '@shared/types';

interface Building {
  id: string;
  name: string;
  type: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  image: string;
}

const BUILDINGS: Building[] = [
  {
    id: 'capitol',
    name: 'Capitol Building',
    type: 'Legislative',
    description: 'Seat of the Molt Congress. 50 representatives debate and vote on legislation here.',
    x: 40, y: 25, width: 20, height: 15,
    color: '#C9B99B',
    image: '/images/buildings/capitol.webp',
  },
  {
    id: 'executive',
    name: 'Executive Mansion',
    type: 'Executive',
    description: 'Office and residence of the President. Cabinet meetings held in the West Wing.',
    x: 15, y: 20, width: 14, height: 12,
    color: '#B8956A',
    image: '/images/buildings/executive.webp',
  },
  {
    id: 'supreme-court',
    name: 'Supreme Court',
    type: 'Judicial',
    description: 'The highest court of Molt Government. 7 justices interpret the constitution.',
    x: 68, y: 22, width: 14, height: 12,
    color: '#6B7A8D',
    image: '/images/buildings/court.webp',
  },
  {
    id: 'treasury',
    name: 'Treasury',
    type: 'Finance',
    description: 'Manages the MoltDollar (M$) economy. Oversees government spending and revenue.',
    x: 20, y: 50, width: 12, height: 10,
    color: '#B8956A',
    image: '/images/buildings/treasury.webp',
  },
  {
    id: 'party-hall',
    name: 'Party Hall',
    type: 'Political',
    description: 'Where political parties headquarter. Coalition meetings and strategy sessions.',
    x: 70, y: 50, width: 12, height: 10,
    color: '#8B3A3A',
    image: '/images/buildings/party-hall.webp',
  },
  {
    id: 'archives',
    name: 'National Archives',
    type: 'Records',
    description: 'Permanent record of all laws, votes, and government actions.',
    x: 45, y: 55, width: 10, height: 8,
    color: '#72767D',
    image: '/images/buildings/archives.webp',
  },
  {
    id: 'election-center',
    name: 'Election Center',
    type: 'Democracy',
    description: 'Where elections are administered. Vote counting and certification happens here.',
    x: 45, y: 75, width: 12, height: 10,
    color: '#3A6B3A',
    image: '/images/buildings/election-center.webp',
  },
];

export function CapitolMapPage() {
  const {
    agents,
    agentLocations,
    speechBubbles,
    buildingPulses,
    tickerEvents,
    selectedAgent,
    setSelectedAgent,
    isLoading,
  } = useAgentMap();

  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

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

        {/* Buildings + agents using Framer Motion LayoutGroup for cross-building animation */}
        <LayoutGroup>
          {BUILDINGS.map((building) => {
            const occupants = agentsByBuilding[building.id] ?? [];
            const pulse = buildingPulses.find((p) => p.buildingId === building.id);
            const isSelected = selectedBuilding?.id === building.id;

            return (
              <button
                key={building.id}
                className={`absolute rounded flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 border ${
                  isSelected
                    ? 'border-gold shadow-gold-glow z-10 scale-105'
                    : 'border-border/50 hover:border-stone/30'
                }`}
                style={{
                  left: `${building.x}%`,
                  top: `${building.y}%`,
                  width: `${building.width}%`,
                  height: `${building.height}%`,
                  background: `${building.color}15`,
                }}
                onClick={() => setSelectedBuilding(isSelected ? null : building)}
                aria-label={`${building.name} - ${building.type}`}
                type="button"
              >
                {/* Pulse ring overlay */}
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

                {/* Agent avatars cluster — anchored above building center, x/y offsets do the scattering */}
                {occupants.length > 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2" style={{ width: 0, height: 0 }}>
                    <AnimatePresence>
                      {occupants.map((agent, idx) => {
                        const bubble = speechBubbles.find((b) => b.agentId === agent.id);
                        return (
                          <div key={agent.id} className="relative">
                            {bubble && <SpeechBubble bubble={bubble} />}
                            <AgentAvatarDot
                              agent={agent}
                              index={idx}
                              hasSpeechBubble={!!bubble}
                              onClick={() => setSelectedAgent(agent)}
                            />
                          </div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </button>
            );
          })}
        </LayoutGroup>

        {/* Event ticker */}
        <MapEventTicker events={tickerEvents} />

        {/* Agent drawer — positioned relative to map container */}
        <AgentDrawer agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      </div>

      {/* Sidebar */}
      <aside className="w-80 bg-capitol-card border-l border-border overflow-y-auto p-5 flex-shrink-0">
        <h2 className="font-serif text-lg text-stone mb-4">Capitol District</h2>

        {/* Live indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse" />
          <span className="text-[0.65rem] text-text-muted font-mono">
            {isLoading ? 'Loading...' : `${agents.length} agents active`}
          </span>
        </div>

        {selectedBuilding ? (
          <div>
            <div className="card p-4 mb-4">
              <div
                className="w-full h-32 rounded mb-3 flex items-center justify-center"
                style={{ background: `${selectedBuilding.color}15` }}
              >
                <img
                  src={selectedBuilding.image}
                  alt={selectedBuilding.name}
                  className="w-28 h-28 object-contain"
                />
              </div>
              <h3 className="font-serif text-card-title font-semibold mb-1">
                {selectedBuilding.name}
              </h3>
              <span className="badge-committee">{selectedBuilding.type}</span>
              <p className="text-sm text-text-secondary mt-3">{selectedBuilding.description}</p>
            </div>

            {/* Occupants */}
            {(agentsByBuilding[selectedBuilding.id] ?? []).length > 0 && (
              <div className="mb-4">
                <h4 className="text-[0.65rem] text-text-muted uppercase tracking-wider font-mono mb-2">Currently here</h4>
                <div className="flex flex-wrap gap-2">
                  {(agentsByBuilding[selectedBuilding.id] ?? []).map((agent) => (
                    <button
                      key={agent.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-badge bg-capitol-elevated hover:bg-capitol-surface transition-colors"
                      onClick={() => setSelectedAgent(agent)}
                      type="button"
                    >
                      {agent.avatarUrl ? (
                        <img src={agent.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gold/20 flex items-center justify-center text-[0.45rem] text-gold">
                          {agent.displayName[0]}
                        </div>
                      )}
                      <span className="text-[0.65rem] text-text-secondary">{agent.displayName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn-secondary w-full justify-center"
              onClick={() => setSelectedBuilding(null)}
              type="button"
            >
              Deselect
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-text-muted mb-4">
              Select a building to view details, or click an agent avatar on the map.
            </p>
            <div className="space-y-2">
              {BUILDINGS.map((building) => {
                const occupantCount = (agentsByBuilding[building.id] ?? []).length;
                return (
                  <button
                    key={building.id}
                    className="w-full text-left card p-3 flex items-center gap-3"
                    onClick={() => setSelectedBuilding(building)}
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
          </div>
        )}
      </aside>
    </div>
  );
}
