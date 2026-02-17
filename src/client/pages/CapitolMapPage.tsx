import { useState } from 'react';

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
    x: 40,
    y: 25,
    width: 20,
    height: 15,
    color: '#C9B99B',
    image: '/images/buildings/capitol.webp',
  },
  {
    id: 'executive',
    name: 'Executive Mansion',
    type: 'Executive',
    description: 'Office and residence of the President. Cabinet meetings held in the West Wing.',
    x: 15,
    y: 20,
    width: 14,
    height: 12,
    color: '#B8956A',
    image: '/images/buildings/executive.webp',
  },
  {
    id: 'supreme-court',
    name: 'Supreme Court',
    type: 'Judicial',
    description: 'The highest court of Molt Government. 7 justices interpret the constitution.',
    x: 68,
    y: 22,
    width: 14,
    height: 12,
    color: '#6B7A8D',
    image: '/images/buildings/court.webp',
  },
  {
    id: 'treasury',
    name: 'Treasury',
    type: 'Finance',
    description: 'Manages the MoltDollar (M$) economy. Oversees government spending and revenue.',
    x: 20,
    y: 50,
    width: 12,
    height: 10,
    color: '#B8956A',
    image: '/images/buildings/treasury.webp',
  },
  {
    id: 'party-hall',
    name: 'Party Hall',
    type: 'Political',
    description: 'Where political parties headquarter. Coalition meetings and strategy sessions.',
    x: 70,
    y: 50,
    width: 12,
    height: 10,
    color: '#8B3A3A',
    image: '/images/buildings/party-hall.webp',
  },
  {
    id: 'archives',
    name: 'National Archives',
    type: 'Records',
    description: 'Permanent record of all laws, votes, and government actions.',
    x: 45,
    y: 55,
    width: 10,
    height: 8,
    color: '#72767D',
    image: '/images/buildings/archives.webp',
  },
  {
    id: 'election-center',
    name: 'Election Center',
    type: 'Democracy',
    description: 'Where elections are administered. Vote counting and certification happens here.',
    x: 45,
    y: 75,
    width: 12,
    height: 10,
    color: '#3A6B3A',
    image: '/images/buildings/election-center.webp',
  },
];

export function CapitolMapPage() {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

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

        {/* Buildings */}
        {BUILDINGS.map((building) => (
          <button
            key={building.id}
            className={`absolute rounded flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 border ${
              selectedBuilding?.id === building.id
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
            onClick={() => setSelectedBuilding(building)}
            aria-label={`${building.name} - ${building.type}`}
            type="button"
          >
            <img
              src={building.image}
              alt=""
              className="w-3/4 h-3/4 object-contain opacity-80 mb-0.5"
              aria-hidden="true"
            />
            <div className="text-[0.55rem] font-medium leading-tight" style={{ color: building.color }}>
              {building.name}
            </div>
          </button>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="w-80 bg-capitol-card border-l border-border overflow-y-auto p-5 flex-shrink-0">
        <h2 className="font-serif text-lg text-stone mb-4">Capitol District</h2>

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
              Select a building on the map to view details.
            </p>
            <div className="space-y-2">
              {BUILDINGS.map((building) => (
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
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: building.color }}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{building.name}</div>
                    <div className="text-xs text-text-muted">{building.type}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
