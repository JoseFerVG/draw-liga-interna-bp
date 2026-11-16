export type Position = 'AG' | 'AO' | 'BG' | 'BO';

export const POSITIONS: Position[] = ['AG', 'AO', 'BG', 'BO'];

export const POSITION_LABELS: Record<Position, { short: string; full: string; half: 'Alta' | 'Baja'; side: 'Gobierno' | 'Oposición' }> = {
  AG: { short: 'AG', full: 'Alta de Gobierno', half: 'Alta', side: 'Gobierno' },
  AO: { short: 'AO', full: 'Alta de Oposición', half: 'Alta', side: 'Oposición' },
  BG: { short: 'BG', full: 'Baja de Gobierno', half: 'Baja', side: 'Gobierno' },
  BO: { short: 'BO', full: 'Baja de Oposición', half: 'Baja', side: 'Oposición' },
};

export const RANK_POINTS: Record<1 | 2 | 3 | 4, number> = {
  1: 3,
  2: 2,
  3: 1,
  4: 0,
};

export interface Team {
  id: string;
  name: string;
  isSwing: boolean;
}

export interface RoomAssignment {
  id: string;
  name: string;
  judge: string;
  teams: Record<Position, string>;
  results?: Partial<Record<Position, 1 | 2 | 3 | 4>>;
  speakerPoints?: Partial<Record<Position, number>>;
}

export interface Round {
  number: 1 | 2 | 3 | 4;
  label: string;
  motion: string;
  infoslide: string;
  status: 'pending' | 'active' | 'finished';
  rooms: RoomAssignment[];
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface TournamentState {
  version: number;
  title: string;
  subtitle: string;
  updatedAt: string;
  teams: Team[];
  rounds: Round[];
  adminPin: string;
  roomCode?: string;
}

export interface TeamStanding {
  team: Team;
  totalPoints: number;
  totalSpeakers: number;
  firsts: number;
  seconds: number;
  thirds: number;
  fourths: number;
  roundsPlayed: number;
  positionsPlayed: Record<Position, number>;
  roundDetails: Array<{
    roundNumber: number;
    roomName: string;
    position: Position;
    rank?: 1 | 2 | 3 | 4;
    points?: number;
    speakers?: number;
  }>;
}
