import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Grid,
  LayoutGrid,
  Lock,
  Moon,
  Share2,
  Sun,
  Trophy,
  Unlock,
  Users,
} from 'lucide-react';
import { createInitialTournamentState } from './data/initialTournament';
import { auditSchedule, generatePowerPairedRound } from './lib/tournamentMath';
import { decodeStateFromHash, loadLocalState, saveLocalState } from './lib/urlSync';
import {
  loadCloudConfig,
  pullCloudState,
  pushCloudState,
  saveCloudConfig,
  type CloudConfigStorage,
} from './lib/cloudSync';
import type { RoomAssignment, Round, TournamentState } from './types';
import { RoundsView } from './components/RoundsView';
import { TeamsView } from './components/TeamsView';
import { MatrixView } from './components/MatrixView';
import { StandingsView } from './components/StandingsView';
import { RoomModal } from './components/RoomModal';
import { ShareModal } from './components/ShareModal';

type TabId = 'rounds' | 'teams' | 'matrix' | 'standings';

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutGrid }> = [
  { id: 'rounds', label: 'Salas y Rondas', icon: LayoutGrid },
  { id: 'teams', label: 'Equipos y Swings (24)', icon: Users },
  { id: 'matrix', label: 'Matriz 4 Rondas', icon: Grid },
  { id: 'standings', label: 'Clasificación', icon: Trophy },
];

export function App() {
  const [state, setState] = useState<TournamentState>(() => loadLocalState() ?? createInitialTournamentState());
  const [activeTab, setActiveTab] = useState<TabId>('rounds');
  const [activeRoundNum, setActiveRoundNum] = useState<1 | 2 | 3 | 4>(1);
  const [editingRoom, setEditingRoom] = useState<RoomAssignment | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [projectorMode, setProjectorMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('liga-bp-theme') === 'dark') {
      return 'dark';
    }
    return 'light';
  });
  const [cloudConfig, setCloudConfig] = useState<CloudConfigStorage | null>(() => loadCloudConfig());
  const [cloudStatus, setCloudStatus] = useState<string>(() =>
    loadCloudConfig() ? 'Conectado' : 'Modo local / Enlace QR',
  );
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const pushTimer = useRef<number | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('liga-bp-theme', theme);
  }, [theme]);

  // Load state from URL hash (#s=...) if shared link was opened
  useEffect(() => {
    const loadHash = async () => {
      if (!window.location.hash.startsWith('#s=')) return;
      const decoded = await decodeStateFromHash(window.location.hash);
      if (decoded) {
        setState(decoded);
        saveLocalState(decoded);
        notify('Torneo cargado desde enlace compartido');
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    loadHash();
    const onHashChange = () => {
      loadHash();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [notify]);

  // Persist locally on every change
  useEffect(() => {
    saveLocalState(state);
  }, [state]);

  // Optional Firestore polling sync
  useEffect(() => {
    if (!cloudConfig) return;
    let active = true;
    const syncDown = async () => {
      try {
        const remote = await pullCloudState(cloudConfig);
        if (!active) return;
        if (remote && remote.updatedAt > state.updatedAt) {
          setState(remote);
          setCloudStatus('Sincronizado');
        } else {
          setCloudStatus('Conectado');
        }
      } catch {
        if (active) setCloudStatus('Error de red');
      }
    };
    syncDown();
    const id = window.setInterval(syncDown, 5000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [cloudConfig, state.updatedAt]);

  const mutateState = useCallback(
    (updater: (prev: TournamentState) => TournamentState) => {
      setState((prev) => {
        const next: TournamentState = {
          ...updater(prev),
          updatedAt: new Date().toISOString(),
        };
        if (cloudConfig) {
          if (pushTimer.current) window.clearTimeout(pushTimer.current);
          setCloudStatus('Guardando...');
          pushTimer.current = window.setTimeout(() => {
            pushCloudState(cloudConfig, next)
              .then(() => setCloudStatus('Sincronizado'))
              .catch(() => setCloudStatus('Error al subir'));
          }, 600);
        }
        return next;
      });
    },
    [cloudConfig],
  );

  const handleSaveRoom = (updatedRoom: RoomAssignment) => {
    mutateState((prev) => ({
      ...prev,
      rounds: prev.rounds.map((r) =>
        r.number !== activeRoundNum
          ? r
          : {
              ...r,
              rooms: r.rooms.map((rm) => (rm.id === updatedRoom.id ? updatedRoom : rm)),
            },
      ),
    }));
    notify(`${updatedRoom.name} actualizada`);
  };

  const handleUpdateRoundMeta = (
    roundNumber: 1 | 2 | 3 | 4,
    patch: Partial<Pick<Round, 'motion' | 'infoslide' | 'status'>>,
  ) => {
    mutateState((prev) => ({
      ...prev,
      rounds: prev.rounds.map((r) => (r.number === roundNumber ? { ...r, ...patch } : r)),
    }));
  };

  const handlePowerPairRound = (roundNumber: 2 | 3 | 4) => {
    mutateState((prev) => {
      const newRooms = generatePowerPairedRound(prev, roundNumber);
      return {
        ...prev,
        rounds: prev.rounds.map((r) => (r.number === roundNumber ? { ...r, rooms: newRooms } : r)),
      };
    });
    notify(`Ronda ${roundNumber} re-emparejada por clasificación`);
  };

  const handleRenameTeam = (teamId: string, newName: string) => {
    mutateState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, name: newName } : t)),
    }));
  };

  const handleToggleSwing = (teamId: string) => {
    mutateState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, isSwing: !t.isSwing } : t)),
    }));
  };

  const selectTab = (tabId: TabId) => {
    setActiveTab(tabId);
    tabRefs.current[tabId]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const nextIdx =
      e.key === 'ArrowRight'
        ? (idx + 1) % TABS.length
        : (idx - 1 + TABS.length) % TABS.length;
    const nextTab = TABS[nextIdx].id;
    selectTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  const audit = auditSchedule(state);
  const currentRound = state.rounds.find((r) => r.number === activeRoundNum) ?? state.rounds[0];

  return (
    <div className={`app-shell ${projectorMode ? 'projector-active' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-eyebrow">Debate Parlamentario Británico (BP)</span>
          <h1 className="brand-title">{state.title}</h1>
          <p className="brand-sub">{state.subtitle}</p>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setCanEdit((v) => !v)}
            title={canEdit ? 'Cambiar a modo solo lectura' : 'Activar edición de organizador'}
          >
            {canEdit ? <Unlock size={15} /> : <Lock size={15} />}
            {canEdit ? 'Organizador' : 'Solo lectura'}
          </button>

          <button type="button" className="btn btn-primary" onClick={() => setShareOpen(true)}>
            <Share2 size={15} /> Compartir / QR
          </button>

          <button
            type="button"
            className="btn btn-icon"
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {!projectorMode && (
        <div className="status-strip">
          <div className="status-pills">
            <span className="badge">24 equipos · 6 salas · 4 rondas</span>
            <span className={`badge ${audit.isPerfect ? 'badge-ok' : 'badge-warn'}`}>
              {audit.isPerfect
                ? 'Equilibrio BP 100% (0 cruces repetidos · 4 posiciones exactas)'
                : `${audit.repeatPairs.length} cruces repetidos · ${audit.imbalancedTeams.length} desbalances`}
            </span>
          </div>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            Estado: <strong>{cloudStatus}</strong>
          </span>
        </div>
      )}

      {!projectorMode && (
        <div
          className="tablist"
          role="tablist"
          aria-label="Vistas del torneo"
        >
          {TABS.map((t, idx) => {
            const Icon = t.icon;
            const selected = activeTab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                className="tab-btn"
                onClick={() => selectTab(t.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <main>
        <div
          role="tabpanel"
          aria-labelledby="tab-rounds"
          hidden={!projectorMode && activeTab !== 'rounds'}
        >
          <RoundsView
            rounds={state.rounds}
            teams={state.teams}
            activeRoundNum={activeRoundNum}
            canEdit={canEdit && !projectorMode}
            projectorMode={projectorMode}
            onSelectRound={setActiveRoundNum}
            onToggleProjector={() => setProjectorMode((v) => !v)}
            onEditRoom={setEditingRoom}
            onUpdateRoundMeta={handleUpdateRoundMeta}
            onPowerPairRound={handlePowerPairRound}
            onNotify={notify}
          />
        </div>

        <div
          role="tabpanel"
          aria-labelledby="tab-teams"
          hidden={projectorMode || activeTab !== 'teams'}
        >
          <TeamsView
            teams={state.teams}
            rounds={state.rounds}
            canEdit={canEdit}
            onRenameTeam={handleRenameTeam}
            onToggleSwing={handleToggleSwing}
          />
        </div>

        <div
          role="tabpanel"
          aria-labelledby="tab-matrix"
          hidden={projectorMode || activeTab !== 'matrix'}
        >
          <MatrixView state={state} />
        </div>

        <div
          role="tabpanel"
          aria-labelledby="tab-standings"
          hidden={projectorMode || activeTab !== 'standings'}
        >
          <StandingsView state={state} onNotify={notify} />
        </div>
      </main>

      <RoomModal
        room={editingRoom}
        roundLabel={currentRound.label}
        teams={state.teams}
        canEdit={canEdit}
        onClose={() => setEditingRoom(null)}
        onSave={handleSaveRoom}
      />

      <ShareModal
        open={shareOpen}
        state={state}
        cloudConfig={cloudConfig}
        cloudStatus={cloudStatus}
        onClose={() => setShareOpen(false)}
        onSaveCloudConfig={(cfg) => {
          saveCloudConfig(cfg);
          setCloudConfig(cfg);
          setCloudStatus(cfg ? 'Conectado' : 'Modo local / Enlace QR');
        }}
        onPullCloud={async () => {
          if (!cloudConfig) return;
          try {
            const remote = await pullCloudState(cloudConfig);
            if (remote) {
              setState(remote);
              setCloudStatus('Sincronizado');
              notify('Datos descargados desde Firestore');
            } else {
              notify('No hay datos guardados aún en ese código de sala');
            }
          } catch {
            notify('Error al descargar de Firestore');
          }
        }}
        onPushCloud={async () => {
          if (!cloudConfig) return;
          try {
            await pushCloudState(cloudConfig, state);
            setCloudStatus('Sincronizado');
            notify('Torneo subido a Firestore');
          } catch {
            notify('Error al subir a Firestore (revisa reglas/API key)');
          }
        }}
        onImportState={(next) => setState(next)}
        onResetTournament={() => {
          setState(createInitialTournamentState());
          notify('Cuadrante óptimo original restaurado');
        }}
        onNotify={notify}
      />

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
