import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Copy, RotateCcw, Search, UserCheck } from 'lucide-react';
import { POSITIONS, type Position, type Round, type Team } from '../types';
import { formatCheckInForWhatsApp } from '../lib/tournamentMath';

interface CheckInViewProps {
  teams: Team[];
  rounds: Round[];
  canEdit: boolean;
  onToggleCheckIn: (teamId: string) => void;
  onResetCheckIn: () => void;
  onNotify: (msg: string) => void;
}

type CheckInFilter = 'all' | 'pending' | 'checked';

function formatCheckInTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function CheckInView({
  teams,
  rounds,
  canEdit,
  onToggleCheckIn,
  onResetCheckIn,
  onNotify,
}: CheckInViewProps) {
  const [filter, setFilter] = useState<CheckInFilter>('all');
  const [search, setSearch] = useState('');

  const round1 = rounds.find((r) => r.number === 1) ?? rounds[0];

  const r1AssignmentByTeam = useMemo(() => {
    const map = new Map<string, { roomName: string; pos: Position }>();
    if (!round1) return map;
    for (const room of round1.rooms) {
      for (const pos of POSITIONS) {
        map.set(room.teams[pos], { roomName: room.name, pos });
      }
    }
    return map;
  }, [round1]);

  const checkedCount = teams.filter((t) => t.checkedIn).length;
  const pendingCount = teams.length - checkedCount;
  const fixedTeams = teams.filter((t) => !t.isSwing);
  const swingTeams = teams.filter((t) => t.isSwing);
  const fixedChecked = fixedTeams.filter((t) => t.checkedIn).length;
  const swingChecked = swingTeams.filter((t) => t.checkedIn).length;
  const progressPct = teams.length > 0 ? Math.round((checkedCount / teams.length) * 100) : 0;

  const normSearch = search.trim().toLowerCase();
  const filtered = teams.filter((team) => {
    if (filter === 'pending' && team.checkedIn) return false;
    if (filter === 'checked' && !team.checkedIn) return false;
    if (!normSearch) return true;

    const r1 = r1AssignmentByTeam.get(team.id);
    return (
      team.name.toLowerCase().includes(normSearch) ||
      (r1?.roomName.toLowerCase().includes(normSearch) ?? false)
    );
  });

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(formatCheckInForWhatsApp(teams));
      onNotify('Resumen de check-in copiado para WhatsApp');
    } catch {
      onNotify('No se pudo copiar al portapapeles');
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section className="checkin-summary" aria-label="Resumen de check-in">
        <div className="checkin-summary-top">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1rem' }}>
              <UserCheck size={18} style={{ color: 'var(--accent)' }} />
              Registro de llegada
            </span>
            <span className={`badge ${checkedCount === teams.length ? 'badge-ok' : ''}`}>
              {checkedCount}/{teams.length} presentes ({progressPct}%)
            </span>
            <span className="badge">
              Fijos: {fixedChecked}/{fixedTeams.length}
            </span>
            <span className="badge badge-swing">
              Swings: {swingChecked}/{swingTeams.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="btn btn-sm" onClick={copySummary}>
              <Copy size={14} /> Copiar WhatsApp
            </button>
            {canEdit && checkedCount > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  if (window.confirm('¿Reiniciar el check-in de todos los equipos a «Pendiente»?')) {
                    onResetCheckIn();
                  }
                }}
              >
                <RotateCcw size={14} /> Reiniciar
              </button>
            )}
          </div>
        </div>

        <div
          className="checkin-progress-track"
          role="progressbar"
          aria-label="Progreso de check-in"
          aria-valuemin={0}
          aria-valuemax={teams.length}
          aria-valuenow={checkedCount}
        >
          <div className="checkin-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </section>

      <div className="controls-bar">
        <div className="round-pills" role="group" aria-label="Filtrar estado de check-in">
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
            aria-pressed={filter === 'pending'}
            onClick={() => setFilter('pending')}
          >
            <Clock size={14} /> Pendientes ({pendingCount})
          </button>
          <button
            type="button"
            className="round-pill"
            aria-pressed={filter === 'checked'}
            onClick={() => setFilter('checked')}
          >
            <CheckCircle2 size={14} /> Presentes ({checkedCount})
          </button>
        </div>

        <div className="search-box">
          <Search size={16} />
          <input
            type="search"
            className="input search-input"
            placeholder="Buscar equipo o sala R1..."
            aria-label="Buscar equipo o sala en check-in"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!canEdit && (
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          Estás en modo solo lectura. Pulsa «Solo lectura» arriba si eres organizador y necesitas registrar llegadas.
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="checkin-empty">
          {filter === 'pending' && pendingCount === 0 && !normSearch
            ? 'Todos los equipos han completado el check-in.'
            : 'No hay equipos que coincidan con el filtro actual.'}
        </div>
      ) : (
        <div className="checkin-grid">
          {filtered.map((team) => {
            const isChecked = Boolean(team.checkedIn);
            const r1 = r1AssignmentByTeam.get(team.id);
            const timeStr = formatCheckInTime(team.checkedInAt);

            return (
              <label
                key={team.id}
                className={`checkin-card ${isChecked ? 'checkin-card-checked' : ''} ${
                  team.isSwing ? 'checkin-card-swing' : ''
                } ${!canEdit ? 'checkin-card-readonly' : ''}`}
              >
                <input
                  type="checkbox"
                  className="checkin-checkbox"
                  checked={isChecked}
                  disabled={!canEdit}
                  onChange={() => onToggleCheckIn(team.id)}
                />

                <div className="checkin-card-body">
                  <div className="checkin-card-top">
                    <span className="checkin-team-name">{team.name}</span>
                    {team.isSwing && <span className="badge badge-swing">Swing</span>}
                  </div>

                  <div className="checkin-card-meta">
                    {r1 && (
                      <span className="mono muted" style={{ fontSize: '0.75rem' }}>
                        R1 · {r1.roomName} ({r1.pos})
                      </span>
                    )}
                    <span className={`badge ${isChecked ? 'badge-ok' : ''}`}>
                      {isChecked ? (
                        <>
                          <CheckCircle2 size={12} />
                          {timeStr ? `Presente · ${timeStr}` : 'Presente'}
                        </>
                      ) : (
                        <>
                          <Clock size={12} /> Pendiente
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
