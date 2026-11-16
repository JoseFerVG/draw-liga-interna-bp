import { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { POSITIONS, POSITION_LABELS, type Position, type RoomAssignment, type Team } from '../types';

interface RoomModalProps {
  room: RoomAssignment | null;
  roundLabel: string;
  teams: Team[];
  canEdit: boolean;
  onClose: () => void;
  onSave: (updated: RoomAssignment) => void;
}

export function RoomModal({ room, roundLabel, teams, canEdit, onClose, onSave }: RoomModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [name, setName] = useState('');
  const [judge, setJudge] = useState('');
  const [assigned, setAssigned] = useState<Record<Position, string>>({
    AG: '',
    AO: '',
    BG: '',
    BO: '',
  });
  const [results, setResults] = useState<Partial<Record<Position, 1 | 2 | 3 | 4>>>({});
  const [speakers, setSpeakers] = useState<Partial<Record<Position, string>>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (room) {
      setName(room.name);
      setJudge(room.judge);
      setAssigned({ ...room.teams });
      setResults({ ...(room.results ?? {}) });
      setSpeakers({
        AG: room.speakerPoints?.AG !== undefined ? String(room.speakerPoints.AG) : '',
        AO: room.speakerPoints?.AO !== undefined ? String(room.speakerPoints.AO) : '',
        BG: room.speakerPoints?.BG !== undefined ? String(room.speakerPoints.BG) : '',
        BO: room.speakerPoints?.BO !== undefined ? String(room.speakerPoints.BO) : '',
      });
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [room]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback light-dismiss for browsers lacking closedby="any"
    let cleanupOutside: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupOutside = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupOutside?.();
    };
  }, [onClose]);

  const setRank = (pos: Position, rank: 1 | 2 | 3 | 4) => {
    setResults((prev) => {
      const next = { ...prev };
      if (next[pos] === rank) {
        delete next[pos];
        return next;
      }
      for (const p of POSITIONS) {
        if (p !== pos && next[p] === rank) {
          delete next[p];
        }
      }
      next[pos] = rank;
      return next;
    });
  };

  const selectedIds = POSITIONS.map((p) => assigned[p]);
  const hasDuplicateTeamInRoom = new Set(selectedIds).size < 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !canEdit) return;
    const spkOut: Partial<Record<Position, number>> = {};
    for (const p of POSITIONS) {
      const raw = speakers[p]?.trim();
      if (raw) {
        const num = Number(raw);
        if (!Number.isNaN(num) && num >= 0) spkOut[p] = num;
      }
    }
    onSave({
      ...room,
      name: name.trim() || room.name,
      judge: judge.trim(),
      teams: assigned,
      results,
      speakerPoints: spkOut,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="room-modal-title"
      closedby="any"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h2 id="room-modal-title" className="modal-title">
              {roundLabel} · {room?.name ?? 'Sala'}
            </h2>
            <p className="muted" style={{ margin: '0.15rem 0 0', fontSize: '0.8rem' }}>
              {canEdit ? 'Edita sala, juez, posiciones o registra el veredicto BP' : 'Modo solo lectura'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar diálogo"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="grid-2">
            <label className="field">
              <span className="field-label">Nombre de la sala / aula</span>
              <input
                className="input"
                type="text"
                value={name}
                disabled={!canEdit}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sala 1 / Aula 2.4"
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field-label">Juez principal / Panel</span>
              <input
                className="input"
                type="text"
                value={judge}
                disabled={!canEdit}
                onChange={(e) => setJudge(e.target.value)}
                placeholder="Nombre(s) de adjudicación"
              />
            </label>
          </div>

          {hasDuplicateTeamInRoom && (
            <div className="badge badge-warn" style={{ padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
              <AlertTriangle size={15} />
              Hay un equipo repetido en dos cámaras de esta sala.
            </div>
          )}

          <div style={{ display: 'grid', gap: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="field-label">Cámaras BP y Resultado (1º = 3 pts, 2º = 2, 3º = 1, 4º = 0)</span>
              {canEdit && Object.keys(results).length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setResults({})}
                >
                  <Trash2 size={14} /> Limpiar puestos
                </button>
              )}
            </div>

            {POSITIONS.map((pos) => (
              <div key={pos} className={`bench-cell bench-${pos}`} style={{ gap: '0.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span className="pos-tag">
                    {pos} · {POSITION_LABELS[pos].full}
                  </span>
                  <div className="rank-seg" role="group" aria-label={`Puesto para ${pos}`}>
                    {([1, 2, 3, 4] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={!canEdit}
                        aria-pressed={results[pos] === r}
                        onClick={() => setRank(pos, r)}
                      >
                        {r}º
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '0.5rem' }}>
                  <select
                    className="input"
                    disabled={!canEdit}
                    aria-label={`Equipo en ${pos}`}
                    value={assigned[pos]}
                    onChange={(e) => setAssigned((prev) => ({ ...prev, [pos]: e.target.value }))}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.isSwing ? ' (Swing)' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input mono"
                    type="number"
                    min={0}
                    max={250}
                    step={1}
                    disabled={!canEdit}
                    aria-label={`Puntos de orador para ${pos}`}
                    placeholder="Pts orad."
                    value={speakers[pos] ?? ''}
                    onChange={(e) => setSpeakers((prev) => ({ ...prev, [pos]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn"
            onClick={() => dialogRef.current?.close()}
          >
            Cancelar
          </button>
          {canEdit && (
            <button type="submit" className="btn btn-primary" disabled={hasDuplicateTeamInRoom}>
              Guardar cambios
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
