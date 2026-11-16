import { Copy, Trophy } from 'lucide-react';
import { RANK_POINTS, type TournamentState } from '../types';
import { computeStandings, formatStandingsForWhatsApp } from '../lib/tournamentMath';

interface StandingsViewProps {
  state: TournamentState;
  onNotify: (msg: string) => void;
}

export function StandingsView({ state, onNotify }: StandingsViewProps) {
  const standings = computeStandings(state);

  const copyStandings = async () => {
    try {
      await navigator.clipboard.writeText(formatStandingsForWhatsApp(standings));
      onNotify('Clasificación copiada para WhatsApp');
    } catch {
      onNotify('No se pudo copiar al portapapeles');
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600 }}>Clasificación BP en vivo</span>
          <span className="badge">1º = 3 · 2º = 2 · 3º = 1 · 4º = 0</span>
        </div>

        <button type="button" className="btn" onClick={copyStandings}>
          <Copy size={15} /> Copiar Clasificación WhatsApp
        </button>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby="standings-caption"
        className="table-wrapper responsive-stack"
      >
        <table className="data-table">
          <caption id="standings-caption" style={{ position: 'absolute', left: '-9999px' }}>
            Tabla de clasificación general del torneo BP
          </caption>
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>Pts BP</th>
              <th>1ºs</th>
              <th>Orador</th>
              <th>R1</th>
              <th>R2</th>
              <th>R3</th>
              <th>R4</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, idx) => (
              <tr key={row.team.id} className={idx === 3 ? 'break-row' : undefined}>
                <td data-label="Puesto" className="mono">
                  <strong>{idx + 1}</strong>
                </td>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{row.team.name}</span>
                    {row.team.isSwing && <span className="badge badge-swing">Swing</span>}
                  </div>
                </th>
                <td data-label="Pts BP" className="mono">
                  <strong>{row.totalPoints}</strong>
                </td>
                <td data-label="1º puestos" className="mono">
                  {row.firsts}
                </td>
                <td data-label="Pts Orador" className="mono muted">
                  {row.totalSpeakers > 0 ? row.totalSpeakers : '—'}
                </td>
                {[1, 2, 3, 4].map((rNum) => {
                  const det = row.roundDetails.find((d) => d.roundNumber === rNum);
                  return (
                    <td key={rNum} data-label={`Ronda ${rNum}`} className="mono">
                      {det ? (
                        <span style={{ fontSize: '0.8rem' }}>
                          {det.position}
                          {det.rank ? ` · ${RANK_POINTS[det.rank]}p (${det.rank}º)` : ' · —'}
                        </span>
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
