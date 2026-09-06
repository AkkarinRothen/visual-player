import type {
  GameSession,
  DisplayState,
  CombatState,
  DuplicateSessionOptions,
  NextSessionOptions,
  NewGroupSessionOptions,
  SessionInitialBaseline,
} from '../../types';
import { db } from '../index';
import { generateId } from '../dbUtils';
import { getSessionsByCampaign } from './sessionCrud';

/**
 * Limpia un DisplayState para usarlo como plantilla reutilizable.
 * Elimina progreso de combate, temporizadores y HPs perdidos.
 */
export function sanitizeStateForTemplate(state: DisplayState): DisplayState {
  const defaultCombat: CombatState = {
    isActive: false,
    round: 0,
    currentTurnIndex: 0,
    combatants: [],
  };

  const sanitizedCombat: CombatState = state.combatState
    ? {
        ...state.combatState,
        isActive: false,
        round: 0,
        currentTurnIndex: 0,
        isTimerRunning: false,
        turnTimerEndsAt: null,
        turnTimerRemainingSeconds: undefined,
        turnId: undefined,
        combatants: state.combatState.combatants.map((cb) => ({
          ...cb,
          currentHp: cb.maxHp, // Restaura vida máxima
          conditions: [],       // Limpia estados
          activeConditions: [], // Limpia estados activos visuales
        })),
      }
    : defaultCombat;

  return {
    ...state,
    combatState: sanitizedCombat,
    ambientPlaying: false,
    // Limpia disparadores transitorios
    shakeTrigger: 0,
    lightningTrigger: 0,
    lastSfx: null,
    cameraTransition: undefined,
    activeTransitions: undefined,
  };
}

/**
 * Duplica una sesión generando IDs nuevos.
 * Permite conservar daño en monstruos/NPCs si restoreNpcHp es false.
 */
export async function duplicateGameSession(
  id: string,
  options: DuplicateSessionOptions = { excludeCombatProgress: true, excludeConditions: true }
): Promise<GameSession> {
  const original = await db.sessions.get(id);
  if (!original) throw new Error(`Session ${id} not found`);

  let stagedState = original.stagedState ? JSON.parse(JSON.stringify(original.stagedState)) : null;
  if (stagedState && (options.excludeCombatProgress || options.excludeConditions)) {
    stagedState = {
      ...stagedState,
      combatState: stagedState.combatState && options.excludeCombatProgress
        ? {
            ...stagedState.combatState,
            isActive: false,
            round: 0,
            currentTurnIndex: 0,
            isTimerRunning: false,
            turnTimerEndsAt: null,
            turnId: undefined,
            combatants: stagedState.combatState.combatants.map((cb: any) => ({
              ...cb,
              currentHp: options.restoreNpcHp === false && cb.isMonster ? cb.currentHp : cb.maxHp,
              ...(options.excludeConditions ? { activeConditions: [], conditions: [] } : {}),
            })),
          }
        : stagedState.combatState,
    };
  }

  const existing = await getSessionsByCampaign(original.campaignId);
  const sessionNumber = existing.filter((s) => s.status !== 'archived' && !s.isDeleted).length + 1;

  const duplicate: GameSession = {
    ...original,
    id: generateId('gs'),
    name: options.newName ?? `${original.name} (Copia)`,
    status: 'preparing',
    stagedState,
    liveState: null,
    frozenScenes: original.frozenScenes ? JSON.parse(JSON.stringify(original.frozenScenes)) : undefined,
    frozenCharacters: original.frozenCharacters ? JSON.parse(JSON.stringify(original.frozenCharacters)) : undefined,
    frozenConversations: original.frozenConversations ? JSON.parse(JSON.stringify(original.frozenConversations)) : undefined,
    frozenHandouts: original.frozenHandouts ? JSON.parse(JSON.stringify(original.frozenHandouts)) : undefined,
    frozenMacros: original.frozenMacros ? JSON.parse(JSON.stringify(original.frozenMacros)) : undefined,
    groupId: original.groupId,
    groupName: original.groupName,
    revision: 1,
    isDeleted: false,
    deletedAt: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber,
  };

  await db.sessions.put(duplicate);
  return duplicate;
}

/**
 * Prepara la siguiente sesión para el mismo grupo de juego:
 * - Conserva revelaciones, consecuencias, inventario, HP y condiciones elegidas.
 * - Limpia la mesa de jugadores (liveState: null) para comenzar en preparación.
 * - Avanza el número ordinal de la sesión.
 * - Mantiene la sesión anterior intacta en la base de datos.
 */
export async function prepareNextGameSession(
  sourceSessionId: string,
  options: NextSessionOptions = {}
): Promise<GameSession> {
  const source = await db.sessions.get(sourceSessionId);
  if (!source) throw new Error(`Sesión origen ${sourceSessionId} no encontrada`);

  const baseState = source.liveState || source.stagedState;
  let stagedState: DisplayState | null = baseState ? JSON.parse(JSON.stringify(baseState)) : null;

  if (stagedState && stagedState.combatState) {
    if (!options.preserveCombatProgress) {
      stagedState.combatState = {
        ...stagedState.combatState,
        isActive: false,
        round: 0,
        currentTurnIndex: 0,
        isTimerRunning: false,
        turnTimerEndsAt: null,
        turnId: undefined,
        combatants: stagedState.combatState.combatants.map((cb) => ({
          ...cb,
          currentHp: options.preserveNpcHpLoss === false && cb.isMonster ? cb.maxHp : cb.currentHp,
          ...(options.preserveConditions === false ? { activeConditions: [], conditions: [] } : {}),
        })),
      };
    }
  }

  const existing = await getSessionsByCampaign(source.campaignId);
  const nextSessionNumber = (source.sessionNumber || existing.length) + 1;

  const nextSession: GameSession = {
    id: generateId('gs'),
    campaignId: source.campaignId,
    name: options.newName || `Sesión ${nextSessionNumber}`,
    status: 'preparing',
    schemaVersion: 1,
    planNotes: options.carryOverPlanNotes ? source.planNotes : '',
    stagedState,
    liveState: null,
    groupId: source.groupId || generateId('grp'),
    groupName: source.groupName || 'Grupo Principal',
    frozenScenes: source.frozenScenes ? JSON.parse(JSON.stringify(source.frozenScenes)) : undefined,
    frozenCharacters: source.frozenCharacters ? JSON.parse(JSON.stringify(source.frozenCharacters)) : undefined,
    frozenConversations: source.frozenConversations ? JSON.parse(JSON.stringify(source.frozenConversations)) : undefined,
    frozenHandouts: source.frozenHandouts ? JSON.parse(JSON.stringify(source.frozenHandouts)) : undefined,
    frozenMacros: source.frozenMacros ? JSON.parse(JSON.stringify(source.frozenMacros)) : undefined,
    revision: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber: nextSessionNumber,
    tags: source.tags ? [...source.tags] : undefined,
  };

  await db.sessions.put(nextSession);
  return nextSession;
}

/**
 * Guarda o actualiza explícitamente la configuración inicial intencional de la sesión.
 * Permite al DM fijar la línea base que se utilizará siempre al jugar con un nuevo grupo
 * (personajes conocidos, HP preparados, puertas cerradas).
 */
export async function saveSessionInitialBaseline(
  sessionId: string,
  state?: DisplayState,
  label: string = 'Configuración Inicial Preparada'
): Promise<GameSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);

  const baselineState = state || session.stagedState || session.liveState;
  if (!baselineState) throw new Error('No hay estado de escena para guardar como configuración inicial');

  const currentVersion = session.initialBaselineConfig?.version || 0;
  session.initialBaselineConfig = {
    state: JSON.parse(JSON.stringify(baselineState)),
    savedAt: Date.now(),
    version: currentVersion + 1,
    label,
  };
  session.updatedAt = Date.now();
  session.revision = (session.revision || 1) + 1;

  await db.sessions.put(session);
  return session;
}

/**
 * Crea una sesión independiente para jugar la aventura con otro grupo.
 * Parte de la configuración inicial preparada (baselineState), garantizando que:
 * - Los personajes conocidos de inicio permanecen revelados.
 * - Los NPCs heridos intencionalmente en la preparación conservan su daño preparado.
 * - Las puertas y props abiertos durante partidas anteriores vuelven a su posición inicial cerrada.
 * - El diario, notas y decisiones del grupo anterior quedan excluidos.
 * - La sesión arranca en Preparación con la Mesa en blanco (liveState: null) sin alterar pantallas de jugadores.
 */
export async function createSessionForNewGroup(
  sourceSessionId: string,
  options: NewGroupSessionOptions
): Promise<GameSession> {
  const source = await db.sessions.get(sourceSessionId);
  if (!source) throw new Error(`Sesión origen ${sourceSessionId} no encontrada`);

  let baselineState: DisplayState | null = null;
  let baselineConfigToCarry: SessionInitialBaseline | undefined = undefined;

  // 1. Determinar el estado base de inicio según la opción elegida
  if (options.baselineSource === 'template' && options.templateId) {
    const template = await db.sessionTemplates.get(options.templateId);
    if (template?.stagedState) {
      baselineState = JSON.parse(JSON.stringify(template.stagedState));
      baselineConfigToCarry = {
        state: JSON.parse(JSON.stringify(template.stagedState)),
        savedAt: Date.now(),
        version: 1,
        label: `Línea base desde plantilla ${template.name}`,
        sourceTemplateId: template.id,
        sourceTemplateName: template.name,
      };
    }
  }

  // 2. Si no se especificó plantilla o no se encontró, usar la línea base intencional de la sesión
  if (!baselineState && source.initialBaselineConfig?.state) {
    baselineState = JSON.parse(JSON.stringify(source.initialBaselineConfig.state));
    baselineConfigToCarry = JSON.parse(JSON.stringify(source.initialBaselineConfig));
  }

  // 3. Fallback seguro para sesiones antiguas sin initialBaselineConfig:
  if (!baselineState) {
    const rawState = source.stagedState || source.liveState;
    if (rawState) {
      const cleanState: DisplayState = JSON.parse(JSON.stringify(rawState));
      // Sanitizar combate
      cleanState.combatState = { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] };
      // Reiniciar revelaciones a siluetas si no había línea base previa
      if (options.resetRevelations !== false && cleanState.characters) {
        cleanState.characters = cleanState.characters.map((c) => ({
          ...c,
          revelation: c.revelation
            ? {
                ...c.revelation,
                isAppearanceRevealed: false,
                isIdentityRevealed: false,
              }
            : undefined,
        }));
      }
      // Reiniciar interactivos a su estado inicial cerrado si procede
      if (options.resetInteractions !== false && cleanState.interactions) {
        cleanState.interactions = cleanState.interactions.map((it) => ({
          ...it,
          currentState: it.transitions?.[0]?.fromState || 'default',
        }));
      }
      baselineState = cleanState;
      baselineConfigToCarry = {
        state: JSON.parse(JSON.stringify(cleanState)),
        savedAt: Date.now(),
        version: 1,
        label: 'Configuración inicial derivada de borrador',
      };
    }
  }

  // Asegurar combate inactivo en la nueva partida pero conservando combatientes si estaban preparados
  let stagedState = baselineState ? JSON.parse(JSON.stringify(baselineState)) : null;
  if (stagedState && options.resetCombat !== false) {
    if (stagedState.combatState) {
      stagedState.combatState.isActive = false;
      stagedState.combatState.round = 0;
      stagedState.combatState.currentTurnIndex = 0;
    }
  }

  const newGroupSession: GameSession = {
    id: generateId('gs'),
    campaignId: source.campaignId,
    name: options.newName || `${source.name} [${options.targetGroupName}]`,
    status: 'preparing',
    schemaVersion: 1,
    planNotes: '', // Excluye notas privadas y diario del grupo anterior
    stagedState,
    liveState: null, // NUNCA emite a la Mesa
    groupId: options.targetGroupId || generateId('grp'),
    groupName: options.targetGroupName,
    initialBaselineConfig: baselineConfigToCarry,
    frozenScenes: source.frozenScenes ? JSON.parse(JSON.stringify(source.frozenScenes)) : undefined,
    frozenCharacters: source.frozenCharacters ? JSON.parse(JSON.stringify(source.frozenCharacters)) : undefined,
    frozenConversations: source.frozenConversations ? JSON.parse(JSON.stringify(source.frozenConversations)) : undefined,
    frozenHandouts: source.frozenHandouts ? JSON.parse(JSON.stringify(source.frozenHandouts)) : undefined,
    frozenMacros: source.frozenMacros ? JSON.parse(JSON.stringify(source.frozenMacros)) : undefined,
    revision: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber: 1,
    tags: source.tags ? [...source.tags] : undefined,
  };

  await db.sessions.put(newGroupSession);
  return newGroupSession;
}
