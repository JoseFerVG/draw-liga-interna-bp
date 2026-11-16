import { useEffect, useRef, useState } from 'react';
import { Cloud, Copy, Download, RefreshCw, RotateCcw, Upload, X } from 'lucide-react';
import type { TournamentState } from '../types';
import type { CloudConfigStorage } from '../lib/cloudSync';
import { encodeStateToHash } from '../lib/urlSync';
import { exportTournamentCSV } from '../lib/tournamentMath';
import { QrCodeCanvas } from './QrCodeCanvas';

interface ShareModalProps {
  open: boolean;
  state: TournamentState;
  cloudConfig: CloudConfigStorage | null;
  cloudStatus: string;
  onClose: () => void;
  onSaveCloudConfig: (cfg: CloudConfigStorage | null) => void;
  onPullCloud: () => Promise<void>;
  onPushCloud: () => Promise<void>;
  onImportState: (next: TournamentState) => void;
  onResetTournament: () => void;
  onNotify: (msg: string) => void;
}

export function ShareModal({
  open,
  state,
  cloudConfig,
  cloudStatus,
  onClose,
  onSaveCloudConfig,
  onPullCloud,
  onPushCloud,
  onImportState,
  onResetTournament,
  onNotify,
}: ShareModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [projectId, setProjectId] = useState(cloudConfig?.firebase.projectId ?? '');
  const [apiKey, setApiKey] = useState(cloudConfig?.firebase.apiKey ?? '');
  const [roomCode, setRoomCode] = useState(cloudConfig?.roomCode ?? state.roomCode ?? 'liga-interna-bp');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      setProjectId(cloudConfig?.firebase.projectId ?? '');
      setApiKey(cloudConfig?.firebase.apiKey ?? '');
      setRoomCode(cloudConfig?.roomCode ?? state.roomCode ?? 'liga-interna-bp');
      encodeStateToHash(state).then((hash) => {
        const base = window.location.href.split('#')[0];
        setShareUrl(`${base}${hash}`);
      });
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, state, cloudConfig]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onNotify('Enlace actualizado copiado al portapapeles');
    } catch {
      onNotify('No se pudo copiar automáticamente; selecciona el enlace');
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `liga-bp-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadCSV = () => {
    const csv = exportTournamentCSV(state);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `liga-bp-cuadrante.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as TournamentState;
        if (Array.isArray(parsed.teams) && Array.isArray(parsed.rounds)) {
          onImportState(parsed);
          onNotify('Torneo importado correctamente');
        } else {
          onNotify('El archivo JSON no tiene formato válido');
        }
      } catch {
        onNotify('No se pudo leer el archivo JSON');
      }
    };
    reader.readAsText(file);
  };

  const saveCloud = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim() || !apiKey.trim()) {
      onSaveCloudConfig(null);
      onNotify('Sincronización en la nube desactivada');
      return;
    }
    onSaveCloudConfig({
      firebase: {
        projectId: projectId.trim(),
        apiKey: apiKey.trim(),
        authDomain: `${projectId.trim()}.firebaseapp.com`,
        appId: 'web',
      },
      roomCode: roomCode.trim() || 'liga-interna-bp',
    });
    onNotify('Configuración de Firestore guardada');
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="share-modal-title"
      closedby="any"
    >
      <div className="modal-header">
        <div>
          <h2 id="share-modal-title" className="modal-title">
            Compartir y sincronizar entre dispositivos
          </h2>
          <p className="muted" style={{ margin: '0.15rem 0 0', fontSize: '0.8rem' }}>
            Comparte el torneo completo por enlace/QR o conecta Firestore para tiempo real
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => dialogRef.current?.close()}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      <div className="modal-body">
        <section style={{ display: 'grid', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem' }}>1. Enlace instantáneo y QR (sin servidor)</h3>
          <p className="muted" style={{ margin: 0, fontSize: '0.83rem' }}>
            Toda la organización actual (swings renombrados, salas, jueces, mociones y puntuaciones) viaja comprimida en este enlace.
            Compártelo por WhatsApp o proyecta el QR para que todos los móviles lo tengan al instante.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            {shareUrl && <QrCodeCanvas value={shareUrl} size={170} />}
            <div style={{ flex: '1 1 220px', display: 'grid', gap: '0.5rem' }}>
              <input
                className="input mono"
                readOnly
                value={shareUrl}
                aria-label="Enlace compartible del torneo"
                style={{ fontSize: '0.75rem' }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button type="button" className="btn btn-primary" onClick={copyLink}>
                <Copy size={16} /> Copiar enlace con cambios
              </button>
            </div>
          </div>
        </section>

        <hr style={{ border: 0, borderBlockStart: '1px solid var(--border)', margin: 0 }} />

        <section style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Cloud size={16} /> 2. Sincronización automática (Firebase Firestore)
            </h3>
            <span className="badge">{cloudStatus}</span>
          </div>
          <form onSubmit={saveCloud} style={{ display: 'grid', gap: '0.6rem' }}>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Firebase Project ID</span>
                <input
                  className="input mono"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="mi-torneo-bp"
                />
              </label>
              <label className="field">
                <span className="field-label">Firebase Web API Key</span>
                <input
                  className="input mono"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                />
              </label>
            </div>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Código de sala / torneo</span>
                <input
                  className="input mono"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="liga-interna-bp"
                />
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
                <button type="submit" className="btn">Guardar conexión</button>
                {cloudConfig && (
                  <>
                    <button type="button" className="btn" onClick={onPullCloud} title="Descargar de la nube">
                      <RefreshCw size={15} />
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onPushCloud} title="Subir a la nube">
                      Subir
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </section>

        <hr style={{ border: 0, borderBlockStart: '1px solid var(--border)', margin: 0 }} />

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="btn btn-sm" onClick={downloadCSV}>
              <Download size={14} /> Exportar CSV
            </button>
            <button type="button" className="btn btn-sm" onClick={downloadJSON}>
              <Download size={14} /> Backup JSON
            </button>
            <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Importar JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={handleFileUpload}
            />
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: 'var(--bo-ink)' }}
            onClick={() => {
              if (window.confirm('¿Restaurar el cuadrante óptimo original y borrar los resultados?')) {
                onResetTournament();
                dialogRef.current?.close();
              }
            }}
          >
            <RotateCcw size={14} /> Restaurar inicial
          </button>
        </section>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-primary" onClick={() => dialogRef.current?.close()}>
          Listo
        </button>
      </div>
    </dialog>
  );
}
