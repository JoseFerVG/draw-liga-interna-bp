import type { RoomAssignment, Round, Team, TournamentState } from '../types';

export const INITIAL_TEAMS: Team[] = [
  { id: 't01', name: 'Putas y rojas', isSwing: false },
  { id: 't02', name: 'Mapi', isSwing: false },
  { id: 't03', name: 'SARNA', isSwing: false },
  { id: 't04', name: 'Las payas', isSwing: false },
  { id: 't05', name: 'mente en blanco', isSwing: false },
  { id: 't06', name: 'Ni gallos ni gallinas', isSwing: false },
  { id: 't07', name: 'Catedráticos de Derecho', isSwing: false },
  { id: 't08', name: 'Amimi', isSwing: false },
  { id: 't09', name: 'Asterix y Obelix', isSwing: false },
  { id: 't10', name: 'Las precarias', isSwing: false },
  { id: 't11', name: 'ANOTOP AT', isSwing: false },
  { id: 't12', name: 'Cepeda Calvo', isSwing: false },
  { id: 't13', name: 'Dones', isSwing: false },
  { id: 't14', name: 'M&M', isSwing: false },
  { id: 't15', name: 'Zipi y Zape', isSwing: false },
  { id: 't16', name: 'X1', isSwing: false },
  { id: 't17', name: 'Los maricones', isSwing: false },
  { id: 't18', name: 'Mucho texto', isSwing: false },
  { id: 't19', name: 'X2', isSwing: false },
  { id: 't20', name: 'PP', isSwing: false },
  { id: 't21', name: 'Swing 1', isSwing: true },
  { id: 't22', name: 'Swing 2', isSwing: true },
  { id: 't23', name: 'swing 3', isSwing: true },
  { id: 't24', name: 'swing 4', isSwing: true },
];

const NAME_TO_ID = new Map(INITIAL_TEAMS.map((t) => [t.name, t.id]));
const id = (name: string): string => {
  const found = NAME_TO_ID.get(name);
  if (!found) throw new Error(`Unknown initial team: ${name}`);
  return found;
};

function makeRooms(
  roundNum: 1 | 2 | 3 | 4,
  specs: Array<{ AG: string; AO: string; BG: string; BO: string }>,
): RoomAssignment[] {
  return specs.map((s, idx) => ({
    id: `r${roundNum}-s${idx + 1}`,
    name: `Sala ${idx + 1}`,
    judge: '',
    teams: {
      AG: id(s.AG),
      AO: id(s.AO),
      BG: id(s.BG),
      BO: id(s.BO),
    },
    results: {},
    speakerPoints: {},
  }));
}

/**
 * Mathematically verified optimal 4-round BP schedule for 24 teams:
 * - Zero repeat matchups across all 4 rounds (each team faces 12 distinct opponents)
 * - Exact position balance (each team plays AG, AO, BG, BO exactly once)
 * - Max 1 Swing team per room in every round
 */
export const INITIAL_ROUNDS: Round[] = [
  {
    number: 1,
    label: 'Ronda 1',
    motion: '',
    infoslide: '',
    status: 'active',
    rooms: makeRooms(1, [
      { AG: 'swing 4', AO: 'Las payas', BG: 'mente en blanco', BO: 'Amimi' },
      { AG: 'Cepeda Calvo', AO: 'Los maricones', BG: 'Ni gallos ni gallinas', BO: 'Mucho texto' },
      { AG: 'Zipi y Zape', AO: 'swing 3', BG: 'M&M', BO: 'Las precarias' },
      { AG: 'Swing 2', AO: 'SARNA', BG: 'Mapi', BO: 'Asterix y Obelix' },
      { AG: 'X1', AO: 'Dones', BG: 'Putas y rojas', BO: 'Swing 1' },
      { AG: 'PP', AO: 'ANOTOP AT', BG: 'Catedráticos de Derecho', BO: 'X2' },
    ]),
  },
  {
    number: 2,
    label: 'Ronda 2',
    motion: '',
    infoslide: '',
    status: 'pending',
    rooms: makeRooms(2, [
      { AG: 'Putas y rojas', AO: 'Ni gallos ni gallinas', BG: 'Las payas', BO: 'SARNA' },
      { AG: 'mente en blanco', AO: 'PP', BG: 'Los maricones', BO: 'swing 3' },
      { AG: 'Swing 1', AO: 'Mapi', BG: 'Mucho texto', BO: 'M&M' },
      { AG: 'Catedráticos de Derecho', AO: 'Amimi', BG: 'Swing 2', BO: 'Zipi y Zape' },
      { AG: 'Asterix y Obelix', AO: 'X1', BG: 'Las precarias', BO: 'ANOTOP AT' },
      { AG: 'X2', AO: 'swing 4', BG: 'Cepeda Calvo', BO: 'Dones' },
    ]),
  },
  {
    number: 3,
    label: 'Ronda 3',
    motion: '',
    infoslide: '',
    status: 'pending',
    rooms: makeRooms(3, [
      { AG: 'swing 3', AO: 'Cepeda Calvo', BG: 'Asterix y Obelix', BO: 'Las payas' },
      { AG: 'Mucho texto', AO: 'Swing 2', BG: 'X2', BO: 'mente en blanco' },
      { AG: 'Los maricones', AO: 'Catedráticos de Derecho', BG: 'SARNA', BO: 'X1' },
      { AG: 'Amimi', AO: 'Las precarias', BG: 'Dones', BO: 'Mapi' },
      { AG: 'ANOTOP AT', AO: 'M&M', BG: 'swing 4', BO: 'Putas y rojas' },
      { AG: 'Ni gallos ni gallinas', AO: 'Swing 1', BG: 'Zipi y Zape', BO: 'PP' },
    ]),
  },
  {
    number: 4,
    label: 'Ronda 4',
    motion: '',
    infoslide: '',
    status: 'pending',
    rooms: makeRooms(4, [
      { AG: 'Mapi', AO: 'Zipi y Zape', BG: 'X1', BO: 'swing 4' },
      { AG: 'M&M', AO: 'Asterix y Obelix', BG: 'Amimi', BO: 'Ni gallos ni gallinas' },
      { AG: 'SARNA', AO: 'mente en blanco', BG: 'ANOTOP AT', BO: 'Cepeda Calvo' },
      { AG: 'Las payas', AO: 'X2', BG: 'Swing 1', BO: 'Los maricones' },
      { AG: 'Dones', AO: 'Mucho texto', BG: 'swing 3', BO: 'Catedráticos de Derecho' },
      { AG: 'Las precarias', AO: 'Putas y rojas', BG: 'PP', BO: 'Swing 2' },
    ]),
  },
];

export function createInitialTournamentState(updatedAt = '2026-01-01T00:00:00.000Z'): TournamentState {
  return {
    version: 1,
    title: 'Liga Interna · Torneo BP Miércoles',
    subtitle: '24 equipos · 6 salas · 4 rondas · Formato Parlamentario Británico',
    updatedAt,
    teams: INITIAL_TEAMS.map((t) => ({ ...t })),
    rounds: INITIAL_ROUNDS.map((r) => ({
      ...r,
      rooms: r.rooms.map((rm) => ({
        ...rm,
        teams: { ...rm.teams },
        results: { ...rm.results },
        speakerPoints: { ...rm.speakerPoints },
      })),
    })),
    adminPin: '',
    roomCode: 'liga-interna-bp',
  };
}
