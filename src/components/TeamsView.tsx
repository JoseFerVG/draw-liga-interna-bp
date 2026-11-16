import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { POSITIONS, type Round, type Team } from '../types';

interface TeamsViewProps {
  teams: Team[];
  rounds: Round[];
  canEdit: boolean;
  onRenameTeam: (teamId: string, newName: string) => void;
  onToggleSwing: (teamId: string) => void;
}

export function TeamsView({ teams, rounds, canEdit, onRenameTeam, onToggleSwing }: TeamsViewProps) {
  const [filter, setFilter] = useState<'all' | 'swings'>('all');
  const [search, setSearch] = useState('');

  const filtered = teams.filter((t) => {
    if (filter === 'swings' && !t.isSwing) return false;
    if (search.trim() && !t.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const getTeamJourney = (teamId: string) =>
    rounds.map((r) => {
      for (const room of r.rooms) {
        for (const pos of POSITIONS) {
          if (room.teams[pos] === teamId) {
            return {
              round: r.number,
              roomName: room.name,
              pos,
              rank: room.results?.[pos],
            };
          }
        }
      }
      return { round: r.number, roomName: '—', pos: 'AG' as const, rank: undefined };
    });

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="controls-bar">
        <div className="round-pills">
          <button
            type="button"
            className="round-pill"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Todos ({teams.length})
          </button>
          <button
            type="button"
            className="round-pill"
            aria-pressed={filter === 'swings'}
            onClick={() => setFilter('swings')}
          >
            <Sparkles size={14} /> Solo Swings ({teams.filter((t) => t.isSwing).length})
          </button>
        </div>

        <div className="search-box">
          <Search size={16} />
          <input
            type="search"
            className="input search-input"
            placeholder="Filtrar equipo..."
            aria-label="Filtrar equipo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        Cualquier cambio de nombre (por ejemplo, al sustituir <strong>Swing 1–4</strong> por equipos definitivos) se refleja
        automáticamente en las 4 rondas, salas y clasificación.
      </p>

      <div className="teams-grid">
        {filtered.map((team) => {
          const journey = getTeamJourney(team.id);
          return (
            <article
              key={team.id}
              className={`team-card ${team.isSwing ? 'team-card-swing' : ''}`}
            >
              <div className="team-name-row">
                <input
                  type="text"
                  className="input"
                  aria-label={`Nombre del equipo ${team.name}`}
                  value={team.name}
                  disabled={!canEdit}
                  onChange={(e) => onRenameTeam(team.id, e.target.value)}
                  style={{ fontWeight: 600 }}
                />
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onToggleSwing(team.id)}
                  className={`badge ${team.isSwing ? 'badge-swing' : ''}`}
                  style={{
                    border: '1px solid var(--border)',
                    padding: '0.35rem 0.55rem',
                    cursor: canEdit ? 'pointer' : 'default',
                  }}
                  title="Marcar o desmarcar como equipo Swing"
                >
                  {team.isSwing ? 'Swing' : 'Fijo'}
                </button>
              </div>

              <div className="team-journey">
                {journey.map((j) => (
                  <div key={j.round} className="journey-chip">
                    <span className="muted" style={{ fontSize: '0.68rem' }}>
                      R{j.round} · {j.roomName}
                    </span>
                    <strong className="mono">
                      {j.pos}
                      {j.rank ? ` (${j.rank}º)` : ''}
                    </strong>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
