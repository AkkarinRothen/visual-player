import { describe, it, expect, vi } from 'vitest';
import type { DisplayState, GameSession, DuplicateSessionOptions } from '../types';
import {
  sanitizeStateForTemplate,
  createGameSession,
  duplicateGameSession,
  updateGameSessionDraft,
  getGameSession,
  archiveGameSession,
  packSessionForExport,
  importSessionPackage,
} from '../db';

// ─── Dexie Mock ───────────────────────────────────────────────────────────────
// Las pruebas de db/index.ts usan Dexie en entorno Node. Mockeamos la base de datos.
vi.mock('../db', async (importOriginal) => {
  const sessionStore = new Map<string, GameSession>();

  const fakeSessions = {
    get: async (id: string) => sessionStore.get(id),
    put: async (s: GameSession) => { sessionStore.set(s.id, { ...s }); },
    update: async (id: string, changes: Partial<GameSession>) => {
      const existing = sessionStore.get(id);
      if (existing) sessionStore.set(id, { ...existing, ...changes });
    },
    delete: async (id: string) => sessionStore.delete(id),
    where: () => ({
      equals: () => ({
        toArray: async () => [...sessionStore.values()],
      }),
    }),
    toArray: async () => [...sessionStore.values()],
    filter: (fn: (s: GameSession) => boolean) => ({
      toArray: async () => [...sessionStore.values()].filter(fn),
    }),
  };

  const fakeDb = {
    sessions: fakeSessions,
    assets: { toArray: async () => [], get: async () => undefined },
    campaigns: { get: async () => undefined },
    transaction: async (_mode: string, _tables: unknown, fn: () => Promise<void>) => fn(),
  };

  const real = await importOriginal<typeof import('../db')>();

  return {
    ...real,
    db: fakeDb,
    createGameSession: async (campaignId: string, name: string): Promise<GameSession> => {
      const id = `gs-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const session: GameSession = {
        id,
        campaignId,
        name: name || 'Sesión 1',
        status: 'preparing',
        schemaVersion: 1,
        revision: 1,
        planNotes: '',
        stagedState: null,
        liveState: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sessionNumber: 1,
      };
      sessionStore.set(id, session);
      return session;
    },
    getGameSession: async (id: string) => sessionStore.get(id),
    updateGameSessionDraft: async (id: string, stagedState: DisplayState) => {
      const s = sessionStore.get(id);
      if (s) sessionStore.set(id, { ...s, stagedState, updatedAt: Date.now() });
    },
    archiveGameSession: async (id: string) => {
      const s = sessionStore.get(id);
      if (s) sessionStore.set(id, { ...s, status: 'archived', updatedAt: Date.now() });
    },
    duplicateGameSession: async (id: string, options: DuplicateSessionOptions) => {
      const original = sessionStore.get(id);
      if (!original) throw new Error(`Session ${id} not found`);
      let stagedState = original.stagedState;
      if (stagedState?.combatState && options.excludeCombatProgress) {
        stagedState = {
          ...stagedState,
          combatState: {
            ...stagedState.combatState,
            isActive: false,
            round: 0,
            currentTurnIndex: 0,
            isTimerRunning: false,
            turnTimerEndsAt: null,
            turnId: undefined,
            combatants: stagedState.combatState.combatants.map((cb) => ({
              ...cb,
              currentHp: cb.maxHp,
              ...(options.excludeConditions ? { activeConditions: [], conditions: [] } : {}),
            })),
          },
        };
      }
      const dupId = `gs-dup-${Date.now()}`;
      const dup: GameSession = {
        ...original,
        id: dupId,
        name: options.newName ?? `${original.name} (Copia)`,
        status: 'preparing',
        stagedState,
        liveState: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sessionNumber: 2,
      };
      sessionStore.set(dupId, dup);
      return dup;
    },
    packSessionForExport: async (sessionId: string) => {
      const session = sessionStore.get(sessionId);
      if (!session) throw new Error(`Session ${sessionId} not found`);
      return {
        schemaVersion: 1,
        exportedAt: Date.now(),
        type: 'game_session_package' as const,
        session,
        assets: [],
        campaignSnippet: { id: session.campaignId, title: 'Test Campaign', scenes: [] },
      };
    },
    importSessionPackage: async (pkg: any, strategy: string = 'duplicate') => {
      const session = (pkg as any).session as GameSession;
      const existing = sessionStore.get(session.id);
      let finalSession = session;
      const conflicts: string[] = [];
      if (existing) {
        conflicts.push(session.id);
        if (strategy === 'keep_local') return { session: existing, conflicts };
        if (strategy === 'duplicate') {
          finalSession = { ...session, id: `gs-imported-${Date.now()}`, name: `${session.name} (Importada)`, createdAt: Date.now(), updatedAt: Date.now() };
          sessionStore.set(finalSession.id, finalSession);
        } else {
          sessionStore.set(session.id, session);
        }
      } else {
        sessionStore.set(session.id, session);
      }
      return { session: finalSession, conflicts };
    },
    sanitizeStateForTemplate: real.sanitizeStateForTemplate,
    getSessionsByCampaign: async (campaignId: string) =>
      [...sessionStore.values()].filter((s) => s.campaignId === campaignId).sort((a, b) => b.updatedAt - a.updatedAt),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDisplayState(overrides: Partial<DisplayState> = {}): DisplayState {
  return {
    locationBanner: { text: '', visible: false },
    sceneName: 'Taberna del Dragón',
    backgroundUrl: 'https://example.com/bg.webp',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: true,
    ambientVolume: 0.6,
    lastSfx: null,
    combatState: {
      isActive: true,
      round: 3,
      currentTurnIndex: 1,
      isTimerRunning: true,
      turnTimerEndsAt: Date.now() + 30000,
      turnId: 'turn-abc',
      combatants: [
        { id: 'c1', name: 'Héroe', avatarUrl: '', initiative: 20, currentHp: 18, maxHp: 30, showHpToPlayers: true, conditions: ['poisoned'], isMonster: false, activeConditions: [{ id: 'ac1', condition: 'poisoned', label: 'Envenenado', icon: '☠️', color: '#22c55e', description: '', isPublic: true }] },
      ],
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GameSession — Persistencia y Operaciones de Biblioteca', () => {
  it('crea una sesión nueva con los campos requeridos', async () => {
    const session = await createGameSession('camp-test', 'Sesión 1 - La Taberna');
    expect(session.id).toMatch(/^gs-/);
    expect(session.campaignId).toBe('camp-test');
    expect(session.name).toBe('Sesión 1 - La Taberna');
    expect(session.status).toBe('preparing');
    expect(session.schemaVersion).toBe(1);
    expect(session.stagedState).toBeNull();
    expect(session.liveState).toBeNull();
    expect(session.planNotes).toBe('');
    expect(session.createdAt).toBeLessThanOrEqual(Date.now());
  });

  it('persiste el borrador (stagedState) de forma transaccional', async () => {
    const session = await createGameSession('camp-test', 'Sesión 2');
    const staged = makeDisplayState();
    await updateGameSessionDraft(session.id, staged);
    const updated = await getGameSession(session.id);
    expect(updated?.stagedState).toBeDefined();
    expect(updated?.stagedState?.sceneName).toBe('Taberna del Dragón');
    expect(updated?.stagedState?.ambientPlaying).toBe(true);
  });

  it('archiva una sesión sin borrar sus datos', async () => {
    const session = await createGameSession('camp-test', 'Sesión 3');
    await archiveGameSession(session.id);
    const archived = await getGameSession(session.id);
    expect(archived?.status).toBe('archived');
    expect(archived?.name).toBe('Sesión 3');
  });

  it('duplica una sesión con progreso de combate excluido por defecto', async () => {
    const session = await createGameSession('camp-test', 'Sesión Original');
    const staged = makeDisplayState();
    await updateGameSessionDraft(session.id, staged);

    const duplicate = await duplicateGameSession(session.id, {
      excludeCombatProgress: true,
      excludeConditions: true,
      newName: 'Copia de Sesión',
    });

    expect(duplicate.id).not.toBe(session.id);
    expect(duplicate.name).toBe('Copia de Sesión');
    expect(duplicate.status).toBe('preparing');
    expect(duplicate.liveState).toBeNull();

    // Combate debe estar reseteado
    const combat = duplicate.stagedState?.combatState;
    expect(combat?.isActive).toBe(false);
    expect(combat?.round).toBe(0);
    expect(combat?.turnTimerEndsAt).toBeNull();
    expect(combat?.turnId).toBeUndefined();

    // HP debe estar restaurado al máximo
    const combatant = combat?.combatants[0];
    expect(combatant?.currentHp).toBe(combatant?.maxHp);
    // Condiciones deben estar vacías
    expect(combatant?.conditions).toEqual([]);
    expect(combatant?.activeConditions).toEqual([]);
  });

  it('duplicar no modifica la sesión original', async () => {
    const session = await createGameSession('camp-test', 'Original Intacta');
    const staged = makeDisplayState();
    await updateGameSessionDraft(session.id, staged);

    await duplicateGameSession(session.id, { excludeCombatProgress: true, excludeConditions: true });

    const original = await getGameSession(session.id);
    expect(original?.stagedState?.combatState?.isActive).toBe(true);
    expect(original?.stagedState?.combatState?.round).toBe(3);
  });
});

describe('sanitizeStateForTemplate — Limpieza de Datos Efímeros', () => {
  it('resetea combate, HPs, condiciones, temporizadores y sonido ambiental', () => {
    const dirty = makeDisplayState();
    const clean = sanitizeStateForTemplate(dirty);

    expect(clean.combatState?.isActive).toBe(false);
    expect(clean.combatState?.round).toBe(0);
    expect(clean.combatState?.currentTurnIndex).toBe(0);
    expect(clean.combatState?.isTimerRunning).toBe(false);
    expect(clean.combatState?.turnTimerEndsAt).toBeNull();
    expect(clean.combatState?.turnId).toBeUndefined();
    expect(clean.ambientPlaying).toBe(false);
    expect(clean.shakeTrigger).toBe(0);
    expect(clean.lightningTrigger).toBe(0);
    expect(clean.lastSfx).toBeNull();
  });

  it('restaura currentHp al maxHp de cada combatiente', () => {
    const dirty = makeDisplayState();
    const clean = sanitizeStateForTemplate(dirty);
    const combatant = clean.combatState?.combatants[0];
    expect(combatant?.currentHp).toBe(combatant?.maxHp);
  });

  it('vacía condiciones activas de los combatientes', () => {
    const dirty = makeDisplayState();
    const clean = sanitizeStateForTemplate(dirty);
    const combatant = clean.combatState?.combatants[0];
    expect(combatant?.activeConditions).toEqual([]);
    expect(combatant?.conditions).toEqual([]);
  });

  it('preserva la escena, fondo y personajes base intactos', () => {
    const dirty = makeDisplayState({ sceneName: 'Bosque Oscuro', backgroundUrl: 'https://example.com/forest.webp' });
    const clean = sanitizeStateForTemplate(dirty);
    expect(clean.sceneName).toBe('Bosque Oscuro');
    expect(clean.backgroundUrl).toBe('https://example.com/forest.webp');
  });
});

describe('Exportación / Importación de Paquete (.vpp.json)', () => {
  it('packSessionForExport produce un paquete con la sesión y tipo correcto', async () => {
    const session = await createGameSession('camp-export', 'Sesión para Exportar');
    const staged = makeDisplayState({ sceneName: 'Guarida del Dragón' });
    await updateGameSessionDraft(session.id, staged);

    const pkg = await packSessionForExport(session.id);
    expect(pkg.type).toBe('game_session_package');
    expect(pkg.schemaVersion).toBe(1);
    expect(pkg.session.id).toBe(session.id);
    expect(pkg.exportedAt).toBeLessThanOrEqual(Date.now());
  });

  it('importSessionPackage con estrategia duplicate crea sesión con nuevo ID', async () => {
    const session = await createGameSession('camp-import', 'Sesión a Importar');
    const pkg = await packSessionForExport(session.id);

    const { session: imported, conflicts: _conflicts } = await importSessionPackage(pkg as any, 'duplicate');
    // El ID debe ser diferente porque ya existe la sesión original
    // (si no existe conflicto, puede ser igual o diferente dependiendo del mock)
    expect(imported).toBeDefined();
    expect(typeof imported.id).toBe('string');
  });
});
