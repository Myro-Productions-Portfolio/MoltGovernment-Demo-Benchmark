// Shared building definitions for the Capitol Map and interior views.
// Seat positions are percentages (x%, y%) measured from the top-left of the
// interior room image — drop /public/images/interiors/{id}.webp to activate.

export interface SeatPosition {
  x: number; // % from left edge of room image
  y: number; // % from top edge of room image
}

export interface BuildingDef {
  id: string;
  name: string;
  type: string;
  description: string;
  // Map position (% of map container)
  x: number;
  y: number;
  width: number;
  height: number;
  // Theming
  color: string;
  image: string; // exterior thumbnail
  // Interior layout
  seats: SeatPosition[];
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'capitol',
    name: 'Capitol Building',
    type: 'Legislative',
    description: 'Seat of the Molt Congress. 50 representatives debate and vote on legislation here.',
    x: 40, y: 25, width: 20, height: 15,
    color: '#C9B99B',
    image: '/images/buildings/capitol.webp',
    seats: [
      // Speaker's podium — front center
      { x: 50, y: 16 },
      // Inner arc (row 1)
      { x: 33, y: 40 }, { x: 42, y: 36 }, { x: 52, y: 35 }, { x: 62, y: 36 }, { x: 71, y: 40 },
      // Middle arc (row 2)
      { x: 26, y: 54 }, { x: 36, y: 50 }, { x: 50, y: 48 }, { x: 64, y: 50 }, { x: 74, y: 54 },
      // Outer arc (row 3)
      { x: 20, y: 67 }, { x: 31, y: 63 }, { x: 43, y: 60 }, { x: 57, y: 60 }, { x: 69, y: 63 }, { x: 80, y: 67 },
    ],
  },
  {
    id: 'executive',
    name: 'Executive Mansion',
    type: 'Executive',
    description: 'Office and residence of the President. Cabinet meetings held in the West Wing.',
    x: 15, y: 20, width: 14, height: 12,
    color: '#B8956A',
    image: '/images/buildings/executive.webp',
    seats: [
      { x: 50, y: 22 }, // President at head of oval table
      { x: 30, y: 37 }, { x: 70, y: 37 },
      { x: 22, y: 52 }, { x: 78, y: 52 },
      { x: 30, y: 65 }, { x: 70, y: 65 },
      { x: 50, y: 74 }, // VP at foot
    ],
  },
  {
    id: 'supreme-court',
    name: 'Supreme Court',
    type: 'Judicial',
    description: 'The highest court of Molt Government. 7 justices interpret the constitution.',
    x: 68, y: 22, width: 14, height: 12,
    color: '#6B7A8D',
    image: '/images/buildings/court.webp',
    seats: [
      // Seven justices at elevated bench (left → right)
      { x: 18, y: 22 }, { x: 28, y: 20 }, { x: 38, y: 18 },
      { x: 50, y: 17 }, // Chief Justice — center
      { x: 62, y: 18 }, { x: 72, y: 20 }, { x: 82, y: 22 },
      // Counsel tables
      { x: 33, y: 57 }, { x: 67, y: 57 },
    ],
  },
  {
    id: 'treasury',
    name: 'Treasury',
    type: 'Finance',
    description: 'Manages the MoltDollar (M$) economy. Oversees government spending and revenue.',
    x: 20, y: 50, width: 12, height: 10,
    color: '#B8956A',
    image: '/images/buildings/treasury.webp',
    seats: [
      { x: 50, y: 22 }, // Secretary at main terminal
      { x: 25, y: 42 }, { x: 50, y: 40 }, { x: 75, y: 42 },
      { x: 25, y: 62 }, { x: 50, y: 60 }, { x: 75, y: 62 },
      { x: 38, y: 78 }, { x: 62, y: 78 },
    ],
  },
  {
    id: 'party-hall',
    name: 'Party Hall',
    type: 'Political',
    description: 'Where political parties headquarter. Coalition meetings and strategy sessions.',
    x: 70, y: 50, width: 12, height: 10,
    color: '#8B3A3A',
    image: '/images/buildings/party-hall.webp',
    seats: [
      { x: 50, y: 20 }, // Party leader at podium
      { x: 27, y: 43 }, { x: 45, y: 40 }, { x: 63, y: 43 },
      { x: 20, y: 60 }, { x: 37, y: 57 }, { x: 55, y: 57 }, { x: 73, y: 60 },
      { x: 30, y: 75 }, { x: 60, y: 75 },
    ],
  },
  {
    id: 'archives',
    name: 'National Archives',
    type: 'Records',
    description: 'Permanent record of all laws, votes, and government actions.',
    x: 45, y: 55, width: 10, height: 8,
    color: '#72767D',
    image: '/images/buildings/archives.webp',
    seats: [
      { x: 50, y: 25 }, // Head Archivist
      { x: 23, y: 48 }, { x: 50, y: 45 }, { x: 77, y: 48 },
      { x: 32, y: 68 }, { x: 60, y: 66 },
    ],
  },
  {
    id: 'election-center',
    name: 'Election Center',
    type: 'Democracy',
    description: 'Where elections are administered. Vote counting and certification happens here.',
    x: 45, y: 75, width: 12, height: 10,
    color: '#3A6B3A',
    image: '/images/buildings/election-center.webp',
    seats: [
      { x: 50, y: 20 }, // Election Director
      { x: 24, y: 43 }, { x: 41, y: 40 }, { x: 59, y: 40 }, { x: 76, y: 43 },
      { x: 28, y: 65 }, { x: 50, y: 62 }, { x: 72, y: 65 },
    ],
  },
];

export function getBuildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
