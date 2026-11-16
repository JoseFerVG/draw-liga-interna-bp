import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { POSITIONS, type Round, type Team, type TournamentState } from '../types';
import { auditSchedule } from '../lib/tournamentMath';

interface MatrixViewProps {
  state: TournamentState;
}

export function MatrixView({ state }: MatrixViewProps) {
  const audit = auditSchedule(state);

  const findSlot = (round: Round, teamId: string) => {
    for (const room of round.rooms) {
      for (const pos of POSITIONS) {
        if (room.teams[pos] === teamId) {
          return { roomName: room.name, pos, rank: room.results?.[pos] };
        }
      }
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="status-strip">
        <div className="status-pills">
          {audit.isPerfect ? (
            <span className="badge badge-ok">
              <CheckCircle2 size={14} /> Cuadrante perfecto: 0 rivales repetidos · 1× AG/AO/BG/BO por equipo · máx. 1 swing/sala
            </span>
          ) : (
            <span className="badge badge-warn">
              <AlertTriangle size={14} />
              Aviso de cuadrante: {audit.repeatPairs.length} cruces repetidos · {audit.imbalancedTeams.length} equipos desbalanceados ·{' '}
              {audit.multiSwingRooms.length} salas con +1 swing
            </span>
          )}
        </div>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          Vista completa de los 24 equipos × 4 rondas
        </span>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby="matrix-caption"
        className="table-wrapper responsive-stack"
      >
        <table className="data-table">
          <caption id="matrix-caption" style={{ position: 'absolute', left: '-9999px' }}>
            Matriz completa de asignaciones por equipo y ronda
          </caption>
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Ronda 1</th>
              <th>Ronda 2</th>
              <th>Ronda 3</th>
              <th>Ronda 4</th>
            </tr>
          </thead>
          <tbody>
            {state.teams.map((team: Team) => (
              <tr key={team.id}>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{team.name}</span>
                    {team.isSwing && <span className="badge badge-swing">Swing</span>}
                  </div>
                </th>
                {state.rounds.map((r) => {
                  const slot = findSlot(r, team.id);
                  return (
                    <td key={r.number} data-label={r.label}>
                      {slot ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className={`badge bench-${slot.pos} pos-tag`}>{slot.pos}</span>
                          <span>{slot.roomName}</span>
                          {slot.rank && <span className="rank-pill">{slot.rank}º</span>}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
