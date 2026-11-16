import { useState } from 'react';
import { Copy, Edit3, Monitor, Search, Shuffle, CheckCircle2, Clock } from 'lucide-react';
import {
  POSITIONS,
  POSITION_LABELS,
  RANK_POINTS,
  type RoomAssignment,
  type Round,
  type Team,
} from '../types';
import { buildTeamsMap, formatRoundForWhatsApp } from '../lib/tournamentMath';

interface RoundsViewProps {
  rounds: Round[];
  teams: Team[];
  activeRoundNum: 1 | 2 | 3 | 4;
  canEdit: boolean;
  projectorMode: boolean;
  onSelectRound: (num: 1 | 2 | 3 | 4) => void;
  onToggleProjector: () => void;
  onEditRoom: (room: RoomAssignment) => void;
  onUpdateRoundMeta: (roundNumber: 1 | 2 | 3 | 4, patch: Partial<Pick<Round, 'motion' | 'infoslide' | 'status'>>) => void;
  onPowerPairRound: (roundNumber: 2 | 3 | 4) => void;
  onNotify: (msg: string) => void;
}

export function RoundsView({
  rounds,
  teams,
  activeRoundNum,
  canEdit,
  projectorMode,
  onSelectRound,
  onToggleProjector,
  onEditRoom,
  onUpdateRoundMeta,
  onPowerPairRound,
  onNotify,
}: RoundsViewProps) {
  const [query, setQuery] = useState('');
  const [editingMotion, setEditingMotion] = useState(false);

  const teamsMap = buildTeamsMap(teams);
  const currentRound = rounds.find((r) => r.number === activeRoundNum) ?? rounds[0];
  const normQuery = query.trim().toLowerCase();

  const copyWhatsApp = async () => {
    const text = formatRoundForWhatsApp(currentRound, teamsMap);
    try {
      await navigator.clipboard.writeText(text);
      onNotify(`Draw de ${currentRound.label} copiado para WhatsApp`);
    } catch {
      onNotify('No se pudo copiar al portapapeles');
    }
  };

  const completedRoomsCount = currentRound.rooms.filter(
    (rm) => Object.keys(rm.results ?? {}).length === 4,
  ).length;

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="controls-bar">
        <div className="round-pills" role="group" aria-label="Seleccionar ronda">
          {rounds.map((r) => {
            const done = r.rooms.every((rm) => Object.keys(rm.results ?? {}).length === 4);
            return (
              <button
                key={r.number}
                type="button"
                className="round-pill"
                aria-pressed={r.number === activeRoundNum}
                onClick={() => {
                  onSelectRound(r.number);
                  setEditingMotion(false);
                }}
              >
                {done ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {r.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end' }}>
          <div className="search-box">
            <Search size={16} />
            <input
              type="search"
              className="input search-input"
              placeholder="Buscar equipo o sala..."
              aria-label="Buscar equipo o sala"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button type="button" className="btn" onClick={copyWhatsApp}>
            <Copy size={15} /> Copiar WhatsApp
          </button>

          <button
            type="button"
            className={`btn ${projectorMode ? 'btn-primary' : ''}`}
            onClick={onToggleProjector}
            aria-pressed={projectorMode}
          >
            <Monitor size={15} /> {projectorMode ? 'Salir Proyector' : 'Proyector'}
          </button>

          {canEdit && currentRound.number > 1 && (
            <button
              type="button"
              className="btn"
              title="Re-emparejar esta ronda según la clasificación acumulada de rondas anteriores"
              onClick={() => {
                if (
                  window.confirm(
                    `¿Re-generar ${currentRound.label} con Power-Pairing (por puntos acumulados)? Esto reemplazará el cuadrante fijo actual de ${currentRound.label}.`,
                  )
                ) {
                  onPowerPairRound(currentRound.number as 2 | 3 | 4);
                }
              }}
            >
              <Shuffle size={15} /> Power-Pairing
            </button>
          )}
        </div>
      </div>

      {/* Motion banner */}
      <section className="motion-card" aria-label={`Moción de ${currentRound.label}`}>
        <div className="motion-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="motion-label">{currentRound.label} · Moción</span>
            <span className={`badge ${completedRoomsCount === 6 ? 'badge-ok' : ''}`}>
              {completedRoomsCount}/6 salas con resultado
            </span>
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEditingMotion((v) => !v)}
            >
              <Edit3 size={14} /> {editingMotion ? 'Cerrar edición' : 'Editar moción'}
            </button>
          )}
        </div>

        {editingMotion && canEdit ? (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <input
              className="input"
              type="text"
              placeholder="Ej. EC considera que..."
              aria-label="Texto de la moción"
              value={currentRound.motion}
              onChange={(e) => onUpdateRoundMeta(currentRound.number, { motion: e.target.value })}
            />
            <textarea
              className="input"
              rows={2}
              placeholder="Infoslide (opcional)..."
              aria-label="Infoslide de la moción"
              value={currentRound.infoslide}
              onChange={(e) => onUpdateRoundMeta(currentRound.number, { infoslide: e.target.value })}
            />
          </div>
        ) : (
          <>
            <p className="motion-text">
              {currentRound.motion.trim()
                ? currentRound.motion
                : 'Moción pendiente de anunciar (pulsa «Editar moción» cuando se publique).'}
            </p>
            {currentRound.infoslide.trim() && (
              <p className="infoslide-text">
                <strong>Infoslide:</strong> {currentRound.infoslide}
              </p>
            )}
          </>
        )}
      </section>

      {/* 6 Rooms Grid */}
      <div className="rooms-grid">
        {currentRound.rooms.map((room) => {
          const roomMatchesQuery =
            normQuery.length > 0 &&
            (room.name.toLowerCase().includes(normQuery) ||
              room.judge.toLowerCase().includes(normQuery) ||
              POSITIONS.some((pos) => {
                const name = teamsMap.get(room.teams[pos])?.name ?? '';
                return name.toLowerCase().includes(normQuery);
              }));

          return (
            <article
              key={room.id}
              className={`room-card ${roomMatchesQuery ? 'room-card-match' : ''}`}
            >
              <div className="room-card-head">
                <div className="room-title-wrap">
                  <h3 className="room-title">{room.name}</h3>
                  <span className="room-judge">
                    {room.judge.trim() ? `Adjudicación: ${room.judge}` : 'Sin juez asignado'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onEditRoom(room)}
                >
                  <Edit3 size={14} /> {canEdit ? 'Sala / Puntos' : 'Ver sala'}
                </button>
              </div>

              <div className="bp-grid">
                {POSITIONS.map((pos) => {
                  const team = teamsMap.get(room.teams[pos]);
                  const teamName = team?.name ?? room.teams[pos];
                  const rank = room.results?.[pos];
                  const isMatch =
                    normQuery.length > 0 && teamName.toLowerCase().includes(normQuery);

                  return (
                    <div
                      key={pos}
                      className={`bench-cell bench-${pos} ${isMatch ? 'bench-match' : ''}`}
                      title={POSITION_LABELS[pos].full}
                    >
                      <div className="bench-top">
                        <span className="pos-tag">{pos}</span>
                        {rank ? (
                          <span className="rank-pill">
                            {rank}º · {RANK_POINTS[rank]}p
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: '0.68rem' }}>
                            {POSITION_LABELS[pos].half}
                          </span>
                        )}
                      </div>
                      <div className="bench-team">
                        <span>{teamName}</span>
                        {team?.isSwing && <span className="badge badge-swing">Swing</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
