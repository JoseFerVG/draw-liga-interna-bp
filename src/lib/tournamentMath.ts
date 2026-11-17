import {
  POSITIONS,
  RANK_POINTS,
  type Position,
  type RoomAssignment,
  type Round,
  type Team,
  type TeamStanding,
  type TournamentState,
} from '../types';

export function buildTeamsMap(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.id, t]));
}

export function computeStandings(state: TournamentState, upToRound?: number): TeamStanding[] {
  const map = new Map<string, TeamStanding>();
  for (const team of state.teams) {
    map.set(team.id, {
      team,
      totalPoints: 0,
      totalSpeakers: 0,
      firsts: 0,
      seconds: 0,
      thirds: 0,
      fourths: 0,
      roundsPlayed: 0,
      positionsPlayed: { AG: 0, AO: 0, BG: 0, BO: 0 },
      roundDetails: [],
    });
  }

  for (const round of state.rounds) {
    if (upToRound && round.number > upToRound) continue;
    for (const room of round.rooms) {
      for (const pos of POSITIONS) {
        const teamId = room.teams[pos];
        const entry = map.get(teamId);
        if (!entry) continue;
        entry.positionsPlayed[pos] += 1;

        const rank = room.results?.[pos];
        const speakers = room.speakerPoints?.[pos];
        const pts = rank ? RANK_POINTS[rank] : undefined;

        if (rank) {
          entry.roundsPlayed += 1;
          entry.totalPoints += pts ?? 0;
          if (rank === 1) entry.firsts += 1;
          if (rank === 2) entry.seconds += 1;
          if (rank === 3) entry.thirds += 1;
          if (rank === 4) entry.fourths += 1;
        }
        if (typeof speakers === 'number' && !Number.isNaN(speakers)) {
          entry.totalSpeakers += speakers;
        }
        entry.roundDetails.push({
          roundNumber: round.number,
          roomName: room.name,
          position: pos,
          rank,
          points: pts,
          speakers,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalSpeakers !== a.totalSpeakers) return b.totalSpeakers - a.totalSpeakers;
    if (b.firsts !== a.firsts) return b.firsts - a.firsts;
    if (b.seconds !== a.seconds) return b.seconds - a.seconds;
    return a.team.name.localeCompare(b.team.name, 'es');
  });
}

export interface ScheduleAudit {
  repeatPairs: Array<{ teamA: string; teamB: string; count: number }>;
  imbalancedTeams: Array<{ teamId: string; counts: Record<Position, number> }>;
  multiSwingRooms: Array<{ roundNumber: number; roomName: string; swingCount: number }>;
  isPerfect: boolean;
}

export function auditSchedule(state: TournamentState): ScheduleAudit {
  const teamsMap = buildTeamsMap(state.teams);
  const pairCounts = new Map<string, number>();
  const posCounts = new Map<string, Record<Position, number>>();
  for (const t of state.teams) {
    posCounts.set(t.id, { AG: 0, AO: 0, BG: 0, BO: 0 });
  }
  const multiSwingRooms: ScheduleAudit['multiSwingRooms'] = [];

  for (const round of state.rounds) {
    for (const room of round.rooms) {
      const ids = POSITIONS.map((p) => room.teams[p]);
      let swings = 0;
      for (const pos of POSITIONS) {
        const tid = room.teams[pos];
        const rec = posCounts.get(tid);
        if (rec) rec[pos] += 1;
        if (teamsMap.get(tid)?.isSwing) swings += 1;
      }
      if (swings > 1) {
        multiSwingRooms.push({ roundNumber: round.number, roomName: room.name, swingCount: swings });
      }
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
          const key = `${a}__${b}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const repeatPairs: ScheduleAudit['repeatPairs'] = [];
  for (const [key, count] of pairCounts.entries()) {
    if (count > 1) {
      const [teamA, teamB] = key.split('__');
      repeatPairs.push({ teamA, teamB, count });
    }
  }

  const imbalancedTeams: ScheduleAudit['imbalancedTeams'] = [];
  for (const [teamId, counts] of posCounts.entries()) {
    if (POSITIONS.some((p) => counts[p] !== 1)) {
      imbalancedTeams.push({ teamId, counts });
    }
  }

  return {
    repeatPairs,
    imbalancedTeams,
    multiSwingRooms,
    isPerfect:
      repeatPairs.length === 0 &&
      imbalancedTeams.length === 0 &&
      multiSwingRooms.length === 0,
  };
}

/**
 * Generates a power-paired draw for round 2, 3, or 4 based on cumulative standings
 * from prior rounds, assigning positions to minimize repeats of positions played so far.
 */
export function generatePowerPairedRound(
  state: TournamentState,
  targetRound: 2 | 3 | 4,
): RoomAssignment[] {
  const standings = computeStandings(state, targetRound - 1);
  const existingRound = state.rounds.find((r) => r.number === targetRound);

  // Track previous opponents & positions played strictly before targetRound
  const prevOpponents = new Map<string, Set<string>>();
  const prevPos = new Map<string, Record<Position, number>>();
  for (const t of state.teams) {
    prevOpponents.set(t.id, new Set());
    prevPos.set(t.id, { AG: 0, AO: 0, BG: 0, BO: 0 });
  }

  for (const r of state.rounds) {
    if (r.number >= targetRound) continue;
    for (const room of r.rooms) {
      const ids = POSITIONS.map((p) => room.teams[p]);
      for (const pos of POSITIONS) {
        const tid = room.teams[pos];
        const rec = prevPos.get(tid);
        if (rec) rec[pos] += 1;
      }
      for (const a of ids) {
        for (const b of ids) {
          if (a !== b) prevOpponents.get(a)?.add(b);
        }
      }
    }
  }

  // Group teams into brackets of 4 from top to bottom, with slight swap if repeat occurs
  const orderedIds = standings.map((s) => s.team.id);
  const groups: string[][] = [];
  for (let i = 0; i < orderedIds.length; i += 4) {
    groups.push(orderedIds.slice(i, i + 4));
  }

  // Permute positions within each room to minimize position-count imbalance
  const permutations: Position[][] = [
    ['AG', 'AO', 'BG', 'BO'], ['AG', 'AO', 'BO', 'BG'], ['AG', 'BG', 'AO', 'BO'],
    ['AG', 'BG', 'BO', 'AO'], ['AG', 'BO', 'AO', 'BG'], ['AG', 'BO', 'BG', 'AO'],
    ['AO', 'AG', 'BG', 'BO'], ['AO', 'AG', 'BO', 'BG'], ['AO', 'BG', 'AG', 'BO'],
    ['AO', 'BG', 'BO', 'AG'], ['AO', 'BO', 'AG', 'BG'], ['AO', 'BO', 'BG', 'AG'],
    ['BG', 'AG', 'AO', 'BO'], ['BG', 'AG', 'BO', 'AO'], ['BG', 'AO', 'AG', 'BO'],
    ['BG', 'AO', 'BO', 'AG'], ['BG', 'BO', 'AG', 'AO'], ['BG', 'BO', 'AO', 'AG'],
    ['BO', 'AG', 'AO', 'BG'], ['BO', 'AG', 'BG', 'AO'], ['BO', 'AO', 'AG', 'BG'],
    ['BO', 'AO', 'BG', 'AG'], ['BO', 'BG', 'AG', 'AO'], ['BO', 'BG', 'AO', 'AG'],
  ];

  return groups.map((group, idx) => {
    let bestPerm = permutations[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const perm of permutations) {
      let score = 0;
      for (let i = 0; i < 4; i++) {
        const pos = perm[i];
        const tid = group[i];
        const count = prevPos.get(tid)?.[pos] ?? 0;
        score += count * count * 10;
      }
      if (score < bestScore) {
        bestScore = score;
        bestPerm = perm;
      }
    }

    const teamsRecord = {} as Record<Position, string>;
    for (let i = 0; i < 4; i++) {
      teamsRecord[bestPerm[i]] = group[i];
    }

    const oldRoom = existingRound?.rooms[idx];
    return {
      id: oldRoom?.id ?? `r${targetRound}-s${idx + 1}`,
      name: oldRoom?.name ?? `Sala ${idx + 1}`,
      judge: oldRoom?.judge ?? '',
      teams: teamsRecord,
      results: {},
      speakerPoints: {},
    };
  });
}

export function formatRoundForWhatsApp(round: Round, teamsMap: Map<string, Team>): string {
  const lines: string[] = [];
  lines.push(`*${round.label.toUpperCase()} — LIGA INTERNA BP*`);
  if (round.motion.trim()) {
    lines.push(`*Moción:* ${round.motion.trim()}`);
  }
  if (round.infoslide.trim()) {
    lines.push(`_Infoslide:_ ${round.infoslide.trim()}`);
  }
  lines.push('');

  for (const room of round.rooms) {
    const judgePart = room.judge.trim() ? ` _(Panel: ${room.judge.trim()})_` : '';
    lines.push(`*${room.name}*${judgePart}`);
    for (const pos of POSITIONS) {
      const teamName = teamsMap.get(room.teams[pos])?.name ?? room.teams[pos];
      const rank = room.results?.[pos];
      const rankStr = rank ? ` [${rank}º · ${RANK_POINTS[rank]} pts]` : '';
      lines.push(`  • ${pos}: ${teamName}${rankStr}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function formatStandingsForWhatsApp(standings: TeamStanding[]): string {
  const lines = ['*CLASIFICACIÓN GENERAL — LIGA INTERNA BP*', ''];
  standings.forEach((s, idx) => {
    const posStr = `${idx + 1}.`;
    const spk = s.totalSpeakers > 0 ? ` · ${s.totalSpeakers} orador` : '';
    lines.push(`${posStr} *${s.team.name}* — ${s.totalPoints} pts (${s.firsts}×1º)${spk}`);
  });
  return lines.join('\n');
}

export function formatCheckInForWhatsApp(teams: Team[]): string {
  const checkedIn = teams.filter((t) => t.checkedIn);
  const pending = teams.filter((t) => !t.checkedIn);
  const lines = [
    '*CHECK-IN — LIGA INTERNA BP*',
    `Presentes: ${checkedIn.length}/${teams.length}`,
    '',
  ];

  if (pending.length === 0) {
    lines.push('Todos los equipos han llegado y hecho check-in.');
  } else {
    lines.push(`*Pendientes por llegar (${pending.length}):*`);
    for (const t of pending) {
      lines.push(`  • ${t.name}${t.isSwing ? ' (Swing)' : ''}`);
    }
  }
  return lines.join('\n');
}

export function exportTournamentCSV(state: TournamentState): string {
  const teamsMap = buildTeamsMap(state.teams);
  const rows = [['Ronda', 'Sala', 'Juez', 'Posicion', 'Equipo', 'Swing', 'Check_In', 'Puesto', 'Puntos_BP', 'Puntos_Orador']];
  for (const round of state.rounds) {
    for (const room of round.rooms) {
      for (const pos of POSITIONS) {
        const team = teamsMap.get(room.teams[pos]);
        const rank = room.results?.[pos];
        const pts = rank ? RANK_POINTS[rank] : '';
        const spk = room.speakerPoints?.[pos] ?? '';
        rows.push([
          round.label,
          room.name,
          room.judge,
          pos,
          team?.name ?? room.teams[pos],
          team?.isSwing ? 'Sí' : 'No',
          team?.checkedIn ? 'Sí' : 'No',
          rank ? String(rank) : '',
          String(pts),
          String(spk),
        ]);
      }
    }
  }
  return rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
