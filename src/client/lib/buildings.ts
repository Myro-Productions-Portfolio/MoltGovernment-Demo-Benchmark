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
    x: 40.80, y: 13.2, width: 18.4, height: 18,
    color: '#C9B99B',
    image: '/images/buildings/capitol.webp',
    seats: [
      // Speaker's podium — front center
      { x: 50, y: 8},
      // Inner arc (row 1) — center is FARTHEST from speaker (correct U-shape)
      { x: 35.70, y: 40.5 }, { x: 42.5, y: 47 }, { x: 50, y: 49.5 }, { x: 57.5, y: 47.1 }, { x: 64.26, y: 40.5 },
      // Middle arc (row 2)
      { x: 28.1, y: 54.6 }, { x: 34.45, y: 62.25 }, { x: 41.6, y: 67 }, { x: 58.35, y: 67 }, { x: 65.5, y: 62.25 }, { x: 71.88, y: 54.6 },
      // Outer arc (row 3)
      { x: 20.7, y: 69 }, { x: 26.9, y: 77.1 }, { x: 33.86, y: 82.89 }, { x: 41.2, y: 86.5 }, { x: 58.7, y: 86.5 }, { x: 66.1, y: 82.95 }, { x: 73, y: 77.1 }, { x: 79.4, y: 69 },
      // Gallery Seats (pod 1)
      { x: 5.1, y: 63.5}, { x: 8.4, y: 69.3 }, { x: 11.7, y: 75 }, { x: 15, y: 80.56 }, { x: 18.35, y: 86.5 },
      // Gallery Seats (pod 2)
      { x: 94.9, y: 63.5}, { x: 91.6, y: 69.2}, { x: 88.3, y: 75 }, { x: 85, y: 80.55 }, { x: 81.65, y: 86.5 },
    ],
  },
  {
    id: 'executive',
    name: 'Executive Mansion',
    type: 'Executive',
    description: 'Office and residence of the President. Cabinet meetings held in the West Wing.',
    x: 9.606, y:13.52, width: 7.1, height: 7.32,
    color: '#0ac0abff',
    image: '/images/buildings/executive.webp',
    seats: [
      { x: 50, y: 25.5 }, // President at window
      { x: 30, y: 33 }, // Chair 1
      { x: 39.5, y: 27.8 }, // Chair 2
      { x: 60.4, y: 27.8 }, // Chair 3
      { x: 69.9, y: 33 }, // Chair 4
      { x: 77.2, y: 50 }, // Chair 5
      { x: 69.9, y: 67.2 }, // Chair 6
      { x: 60.3, y: 73 }, // Chair 7
      { x: 50, y: 74.5 }, // VP at door
      { x: 39.7, y: 73 }, // Chair 8
      { x: 30.1, y: 67.3 }, // Chair 9
      { x: 22, y: 50 }, // Chair 10
    ],
  },
  {
    id: 'supreme-court',
    name: 'Supreme Court',
    type: 'Judicial',
    description: 'The highest court of Molt Government. 7 justices interpret the constitution.',
    x: 78.7, y: 11.56, width: 11.1, height: 11.88,
    color: '#6B7A8D',
    image: '/images/buildings/court.webp',
    seats: [
      // Seven justices at elevated bench (left → right)
      { x: 18.56, y: 22 }, { x: 29, y: 18.5 }, { x: 39.3, y: 16.4 },
      { x: 50, y: 16 }, // Chief Justice — center
      { x: 60.6, y: 16.4 }, { x: 71, y: 18.5 }, { x: 81.4, y: 22 },
      // Counsel table 1
      { x: 27.5, y: 68 }, { x: 34.5, y: 68 },
      // Counsel table 2
      { x: 65.5, y: 68 }, { x: 72.4, y: 68 },
      // Viewing seats row 1
      { x: 15, y: 85 }, { x: 25, y: 85 }, { x: 35, y: 85 }, { x: 45, y: 85 }, { x: 55, y: 85 }, { x: 65, y: 85 }, { x: 75, y: 85 }, { x: 85, y: 85 },
    ],
  },
  {
    id: 'treasury',
    name: 'Treasury',
    type: 'Finance',
    description: 'Manages the MoltDollar (M$) economy. Oversees government spending and revenue.',
    x: 21.95, y: 59.35, width: 11.56, height: 12.85,
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
    x: 75.26, y: 59.67, width: 12.68, height: 13.62,
    color: '#8B3A3A',
    image: '/images/buildings/party-hall.webp',
    seats: [
      { x: 50, y: 15.6 }, // Party leader at podium
      { x: 37.5, y: 50 }, { x: 50, y: 50 }, { x: 62.45, y: 50 },
      { x: 31.3, y: 71 }, { x: 43.8, y: 71 }, { x: 56.2, y: 71 }, { x: 68.7, y: 71 },
      { x: 37.5, y: 90 }, { x: 62.3, y: 90 },
      // Gallery Seats (pod 1)
      { x: 5.1, y: 65.3}, { x: 8.4, y: 72.3 }, { x: 11.7, y: 78.6 }, { x: 15, y: 85.1 }, { x: 18.35, y: 91.8 },
      // Gallery Seats (pod 2)
      { x: 94.9, y: 65.3}, { x: 91.6, y: 72.3 }, { x: 88.3, y: 78.6 }, { x: 85, y: 85.1 }, { x: 81.65, y: 91.8 },
    ],
  },
  {
    id: 'archives',
    name: 'National Archives',
    type: 'Records',
    description: 'Permanent record of all laws, votes, and government actions.',
    x: 54.5, y: 60.25, width: 10.85, height: 12.5,
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
    x: 54.5, y: 83.4, width: 10.85, height: 12.4,
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
