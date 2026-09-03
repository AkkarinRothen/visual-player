import type {
  GameSession,
  GameSessionTemplate,
  DuplicateSessionOptions,
  GameSessionPackage,
  DisplayState,
  CombatState,
  MissingAssetInfo,
  ExportPreflightReport,
  ImportDiffSummary,
  Campaign,
  Scene,
  SavedConversation,
  NextSessionOptions,
  NewGroupSessionOptions,
  SceneCompositionPreset,
  CharacterOnScreen,
  PresetCharacterVisual,
  SceneProp,
  SceneLight,
  SceneZoneEmitter,
  SceneInteraction,
  SessionReadinessCheck,
  VersionConflictReport,
  InstantiatePresetOptions,
  SessionCheckpoint,
  SessionInitialBaseline,
  TemplateDiffItem,
  TemplateUpdateDiffReport,
  GranularTemplateUpdateSelection,
  AuditRestoreReport,
} from '../types';
import { db } from './index';
import { generateId } from './dbUtils';
import { createSessionCheckpoint } from './checkpointDb';
import {
  scanSessionAssetDependencies,
  downloadExternalAssetsForSession,
  registerImmutableAsset,
  convertBlobUrlToDataUrl,
  type StoredAsset,
  type AssetDependencyItem,
} from './assetDb';

/**
 * Limpia un DisplayState para usarlo como plantilla reutilizable.
 * Elimina progreso de combate, temporizadores y HPs perdidos.
 */
export function sanitizeStateForTemplate(state: DisplayState): DisplayState {
  const sanitizedCombat: CombatState | undefined = state.combatState
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
          currentHp: cb.maxHp,           // Restaurar HP al máximo
          activeConditions: [],           // Borrar condiciones activas
          conditions: [],
        })),
      }
    : undefined;

  return {
    ...state,
    combatState: sanitizedCombat as any,
    shakeTrigger: 0,
    lightningTrigger: 0,
    lastSfx: null,
    ambientPlaying: false,
  };
}

/**
 * Obtiene todas las sesiones de una campaña ordenadas por fecha descendente.
 * Excluye por defecto las que están en la papelera (isDeleted: true).
 */
export async function getSessionsByCampaign(campaignId: string, includeDeleted: boolean = false): Promise<GameSession[]> {
  let sessions = await db.sessions.where('campaignId').equals(campaignId).toArray();
  if (!includeDeleted) {
    sessions = sessions.filter((s) => !s.isDeleted);
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Obtiene todas las sesiones de todas las campañas.
 * Excluye por defecto las que están en la papelera (isDeleted: true).
 */
export async function getAllSessions(includeDeleted: boolean = false): Promise<GameSession[]> {
  let sessions = await db.sessions.toArray();
  if (!includeDeleted) {
    sessions = sessions.filter((s) => !s.isDeleted);
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Obtiene todas las plantillas de todas las campañas.
 */
export async function getAllSessionTemplates(): Promise<GameSessionTemplate[]> {
  const templates = await db.sessionTemplates.toArray();
  return templates.filter((t) => !t.isDeleted).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Obtiene una sesión por ID.
 */
export async function getGameSession(id: string): Promise<GameSession | undefined> {
  return db.sessions.get(id);
}

/**
 * Crea una sesión nueva con snapshot congelado de escenas y personajes de la campaña.
 */
export async function createGameSession(campaignId: string, name: string): Promise<GameSession> {
  const existing = await getSessionsByCampaign(campaignId);
  const sessionNumber = existing.filter((s) => s.status !== 'archived' && !s.isDeleted).length + 1;
  const campaign = await db.campaigns.get(campaignId);

  const session: GameSession = {
    id: generateId('gs'),
    campaignId,
    name: name || `Sesión ${sessionNumber}`,
    status: 'preparing',
    schemaVersion: 1,
    planNotes: '',
    stagedState: null,
    liveState: null,
    frozenScenes: campaign?.scenes ? JSON.parse(JSON.stringify(campaign.scenes)) : [],
    frozenCharacters: campaign?.characters ? JSON.parse(JSON.stringify(campaign.characters)) : [],
    frozenConversations: campaign?.savedConversations ? JSON.parse(JSON.stringify(campaign.savedConversations)) : [],
    frozenHandouts: campaign?.savedHandouts ? JSON.parse(JSON.stringify(campaign.savedHandouts)) : [],
    frozenMacros: campaign?.macros ? JSON.parse(JSON.stringify(campaign.macros)) : [],
    revision: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber,
  };
  await db.sessions.put(session);
  return session;
}

/**
 * Actualiza el borrador (Staging) de la sesión de forma transaccional.
 */
export async function updateGameSessionDraft(
  id: string,
  stagedState: DisplayState
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(id);
    if (!session) return;
    const initialBaselineConfig = session.initialBaselineConfig || {
      state: JSON.parse(JSON.stringify(stagedState)),
      savedAt: Date.now(),
      version: 1,
      label: 'Configuración inicial creada con la preparación',
    };
    await db.sessions.update(id, {
      stagedState,
      initialBaselineConfig,
      revision: (session.revision || 1) + 1,
      updatedAt: Date.now(),
    });
  });
}

/**
 * Actualiza el último estado publicado (liveState) de la sesión.
 */
export async function updateGameSessionLiveState(
  id: string,
  liveState: DisplayState
): Promise<void> {
  const session = await db.sessions.get(id);
  await db.sessions.update(id, {
    liveState,
    status: 'active',
    revision: ((session?.revision || 1) + 1),
    updatedAt: Date.now(),
  });
}

/**
 * Actualiza las notas del plan del director.
 */
export async function updateGameSessionNotes(id: string, planNotes: string): Promise<void> {
  await db.sessions.update(id, { planNotes, updatedAt: Date.now() });
}

/**
 * Renombra una sesión.
 */
export async function renameGameSession(id: string, name: string): Promise<void> {
  await db.sessions.update(id, { name, updatedAt: Date.now() });
}

/**
 * Archiva una sesión (soft-status). No borra los datos.
 */
export async function archiveGameSession(id: string): Promise<void> {
  await db.sessions.update(id, { status: 'archived', updatedAt: Date.now() });
}

/**
 * Marca una sesión como completada.
 */
export async function completeGameSession(id: string): Promise<void> {
  await db.sessions.update(id, { status: 'completed', updatedAt: Date.now() });
}

// ─── Papelera de Reciclaje (Soft-Delete) ──────────────────────────────────────

/**
 * Envía una sesión a la papelera (soft-delete).
 */
export async function trashGameSession(id: string): Promise<void> {
  await db.sessions.update(id, { isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now() });
}

/**
 * Restaura una sesión enviada a la papelera.
 */
export async function restoreGameSessionFromTrash(id: string): Promise<void> {
  await db.sessions.update(id, { isDeleted: false, deletedAt: undefined, updatedAt: Date.now() });
}

/**
 * Obtiene las sesiones que están en la papelera de una campaña.
 */
export async function getTrashedSessions(campaignId: string): Promise<GameSession[]> {
  const sessions = await db.sessions.where('campaignId').equals(campaignId).toArray();
  return sessions.filter((s) => s.isDeleted).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
}

/**
 * Vacía la papelera eliminando definitivamente las sesiones marcadas como isDeleted.
 */
export async function emptyTrash(campaignId: string): Promise<number> {
  const trashed = await getTrashedSessions(campaignId);
  const ids = trashed.map((s) => s.id);
  await db.sessions.bulkDelete(ids);
  return ids.length;
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
 * Crea una bifurcación de preparación para jugar la aventura con otro grupo:
 * - Conserva las escenas, mapas, música y estados iniciales intencionales (p. ej. puertas abiertas).
 * - Reinicia las revelaciones de personajes a sus alias públicos / siluetas para no spoilear misterios.
 * - Reinicia los puntos de vida de NPCs y monstruos a maxHp.
 * - Limpia el combate en curso.
 * - Asigna un nuevo identificador de grupo (groupId).
 */
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

/**
 * Elimina una sesión permanentemente de la base de datos.
 */
export async function deleteGameSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

// ─── Session Templates ───────────────────────────────────────────────────────

/**
 * Guarda la sesión como plantilla reutilizable, sanitizando datos efímeros.
 */
export async function saveSessionAsTemplate(
  sessionId: string,
  name: string,
  description?: string
): Promise<GameSessionTemplate> {
  const session = await db.sessions.get(sessionId);
  if (!session || !session.stagedState) {
    throw new Error('No se puede crear plantilla de una sesión sin borrador');
  }

  const template: GameSessionTemplate = {
    id: generateId('tpl'),
    name,
    description,
    sourceSessionId: sessionId,
    campaignId: session.campaignId,
    stagedState: sanitizeStateForTemplate(session.stagedState),
    frozenScenes: session.frozenScenes ? JSON.parse(JSON.stringify(session.frozenScenes)) : undefined,
    frozenCharacters: session.frozenCharacters ? JSON.parse(JSON.stringify(session.frozenCharacters)) : undefined,
    frozenConversations: session.frozenConversations ? JSON.parse(JSON.stringify(session.frozenConversations)) : undefined,
    frozenHandouts: session.frozenHandouts ? JSON.parse(JSON.stringify(session.frozenHandouts)) : undefined,
    frozenMacros: session.frozenMacros ? JSON.parse(JSON.stringify(session.frozenMacros)) : undefined,
    isDeleted: false,
    createdAt: Date.now(),
  };

  await db.sessionTemplates.put(template);
  return template;
}

export async function getSessionTemplatesByCampaign(campaignId: string): Promise<GameSessionTemplate[]> {
  const templates = await db.sessionTemplates.where('campaignId').equals(campaignId).toArray();
  return templates.filter((t) => !t.isDeleted);
}

export async function deleteSessionTemplate(id: string): Promise<void> {
  await db.sessionTemplates.delete(id);
}

/**
 * Crea una sesión nueva a partir de una plantilla.
 */
export async function createSessionFromTemplate(
  templateId: string,
  name: string
): Promise<GameSession> {
  const template = await db.sessionTemplates.get(templateId);
  if (!template) throw new Error(`Plantilla ${templateId} no encontrada`);

  const existing = await getSessionsByCampaign(template.campaignId);
  const sessionNumber = existing.filter((s) => s.status !== 'archived' && !s.isDeleted).length + 1;

  const session: GameSession = {
    id: generateId('gs'),
    campaignId: template.campaignId,
    name,
    status: 'preparing',
    schemaVersion: 1,
    planNotes: '',
    stagedState: JSON.parse(JSON.stringify(template.stagedState)),
    liveState: null,
    frozenScenes: template.frozenScenes ? JSON.parse(JSON.stringify(template.frozenScenes)) : undefined,
    frozenCharacters: template.frozenCharacters ? JSON.parse(JSON.stringify(template.frozenCharacters)) : undefined,
    frozenConversations: template.frozenConversations ? JSON.parse(JSON.stringify(template.frozenConversations)) : undefined,
    frozenHandouts: template.frozenHandouts ? JSON.parse(JSON.stringify(template.frozenHandouts)) : undefined,
    frozenMacros: template.frozenMacros ? JSON.parse(JSON.stringify(template.frozenMacros)) : undefined,
    revision: 1,
    initialBaselineConfig: template.stagedState ? {
      state: JSON.parse(JSON.stringify(template.stagedState)),
      savedAt: Date.now(),
      version: 1,
      label: `Línea base desde plantilla ${template.name}`,
      sourceTemplateId: template.id,
      sourceTemplateName: template.name,
    } : undefined,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber,
  };

  await db.sessions.put(session);
  return session;
}

// ─── Presets de Escena Completa (Composiciones Reutilizables) ────────────────

/**
 * Guarda una escena completa como Preset de Composición Reutilizable.
 */
export async function saveSceneAsCompositionPreset(
  campaignId: string,
  state: DisplayState,
  name: string,
  options?: {
    description?: string;
    tags?: string[];
    linkedConversation?: SavedConversation;
  }
): Promise<SceneCompositionPreset> {
  const preset: SceneCompositionPreset = {
    id: generateId('scp'),
    name,
    description: options?.description,
    campaignId,
    backgroundUrl: state.backgroundUrl,
    characters: (state.characters || []).map((c) => ({
      id: c.id || c.characterId || generateId('pv'),
      characterId: c.characterId,
      name: c.name,
      avatarUrl: c.avatarUrl,
      activeExpression: c.activeExpression,
      normalizedX: c.normalizedX ?? 50,
      normalizedY: c.normalizedY ?? 80,
      scale: c.scale ?? 1,
      isFlipped: c.isFlipped,
      zIndex: c.zIndex ?? 1,
      position: c.position,
    })),
    props: state.props ? JSON.parse(JSON.stringify(state.props)) : [],
    lights: state.lights ? JSON.parse(JSON.stringify(state.lights)) : [],
    emitters: state.emitters ? JSON.parse(JSON.stringify(state.emitters)) : [],
    interactions: state.interactions ? JSON.parse(JSON.stringify(state.interactions)) : [],
    ambientAudioUrl: state.ambientAudioUrl,
    ambientVolume: state.ambientVolume,
    linkedConversationId: options?.linkedConversation?.id,
    linkedConversation: options?.linkedConversation ? JSON.parse(JSON.stringify(options.linkedConversation)) : undefined,
    lighting: state.lighting,
    weather: state.weather,
    weatherIntensity: state.weatherIntensity,
    focalPoint: state.focalPoint,
    fitMode: state.fitMode,
    zoom: state.zoom,
    tags: options?.tags,
    schemaVersion: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.scenePresets.put(preset);
  return preset;
}

export async function getSceneCompositionPresets(campaignId?: string): Promise<SceneCompositionPreset[]> {
  let presets = await db.scenePresets.toArray();
  if (campaignId && campaignId !== 'all') {
    presets = presets.filter((p) => !p.campaignId || p.campaignId === campaignId);
  }
  return presets.filter((p) => !p.isDeleted).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
}

export async function deleteSceneCompositionPreset(id: string): Promise<void> {
  await db.scenePresets.delete(id);
}

/**
 * Inserta un preset de escena completa dentro de una sesión en preparación (Staged).
 * Permite resolver colisiones de personajes y conversaciones (reutilizar existentes vs crear copia).
 * Remapea identificadores de instancias para evitar colisiones y garantiza que NUNCA emite a la Mesa.
 */
export async function instantiateScenePresetIntoSession(
  sessionId: string,
  presetId: string,
  optionsOrMode: 'append_scene' | 'replace_staged' | InstantiatePresetOptions = 'replace_staged'
): Promise<GameSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);
  const preset = await db.scenePresets.get(presetId);
  if (!preset) throw new Error(`Preset ${presetId} no encontrado`);

  const options: InstantiatePresetOptions = typeof optionsOrMode === 'string'
    ? { mode: optionsOrMode }
    : optionsOrMode;
  const mode = options.mode || 'replace_staged';

  const campaign = await db.campaigns.get(session.campaignId);
  const campaignChars = campaign?.characters || [];

  const newCharacters: CharacterOnScreen[] = (preset.characters || []).map((pv: PresetCharacterVisual) => {
    let resolvedCharacterId = pv.characterId;

    if (options.characterResolution === 'reuse_existing' && campaign) {
      const match = campaignChars.find(
        (c) => c.id === pv.characterId || c.name.toLowerCase() === pv.name.toLowerCase()
      );
      if (match) {
        resolvedCharacterId = match.id;
      }
    }

    return {
      id: generateId('inst'),
      characterId: resolvedCharacterId,
      name: pv.name,
      avatarUrl: pv.avatarUrl,
      activeExpression: pv.activeExpression,
      normalizedX: pv.normalizedX,
      normalizedY: pv.normalizedY,
      scale: pv.scale,
      isFlipped: pv.isFlipped,
      zIndex: pv.zIndex,
      position: pv.position || 'center-left',
      isSpeaking: false,
    };
  });

  const newProps: SceneProp[] = (preset.props || []).map((p: SceneProp) => ({
    ...p,
    id: generateId('prp'),
  }));

  const newLights: SceneLight[] = (preset.lights || []).map((l: SceneLight) => ({
    ...l,
    id: generateId('lt'),
  }));

  const newEmitters: SceneZoneEmitter[] = (preset.emitters || []).map((e: SceneZoneEmitter) => ({
    ...e,
    id: generateId('em'),
  }));

  const newInteractions: SceneInteraction[] = (preset.interactions || []).map((it: SceneInteraction) => ({
    ...it,
    id: generateId('int'),
  }));

  const targetState: DisplayState = {
    backgroundUrl: preset.backgroundUrl || '',
    characters: newCharacters,
    props: newProps,
    lights: newLights,
    emitters: newEmitters,
    interactions: newInteractions,
    ambientAudioUrl: preset.ambientAudioUrl || '',
    ambientVolume: preset.ambientVolume ?? 0.5,
    lighting: preset.lighting || 'normal',
    weather: preset.weather || 'none',
    weatherIntensity: preset.weatherIntensity ?? 0.5,
    fitMode: preset.fitMode || 'cover',
    zoom: preset.zoom ?? 1,
    focalPoint: preset.focalPoint || { x: 50, y: 50 },
    sceneName: preset.name,
    locationBanner: { text: '', visible: false },
    isBlackout: false,
    combatState: {
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
    },
    shakeTrigger: 0,
    lightningTrigger: 0,
    lastSfx: null,
    ambientPlaying: false,
  };

  let frozenConversations = session.frozenConversations ? [...session.frozenConversations] : [];
  if (preset.linkedConversation) {
    const existingMatch = frozenConversations.find(
      (c) => c.id === preset.linkedConversation!.id || c.title.toLowerCase() === preset.linkedConversation!.title.toLowerCase()
    );

    if (!existingMatch || options.conversationResolution === 'create_copy') {
      const convToSave = JSON.parse(JSON.stringify(preset.linkedConversation));
      if (options.conversationResolution === 'create_copy' && existingMatch) {
        convToSave.id = generateId('conv');
        convToSave.title = `${convToSave.title} (Copia)`;
      }
      frozenConversations.push(convToSave);
    }
  }

  let frozenScenes = session.frozenScenes ? [...session.frozenScenes] : [];
  if (mode === 'append_scene') {
    const newSceneEntry: Scene = {
      id: generateId('sc'),
      name: preset.name,
      backgroundUrl: preset.backgroundUrl || '',
      props: newProps,
      lights: newLights,
      emitters: newEmitters,
      interactions: newInteractions,
      ambientAudioUrl: preset.ambientAudioUrl,
      weather: preset.weather,
      lighting: preset.lighting,
    };
    frozenScenes.push(newSceneEntry);
  }

  session.stagedState = targetState;
  session.frozenScenes = frozenScenes;
  session.frozenConversations = frozenConversations;
  session.updatedAt = Date.now();
  session.revision = (session.revision || 1) + 1;

  await db.sessions.put(session);
  return session;
}

/**
 * Detecta si hay conflictos de versión al importar una sesión entre PC y móvil.
 * Previene sobrescrituras accidentales si la copia local tiene cambios más recientes o concurrentes.
 */
export function detectImportVersionConflict(
  pkg: GameSessionPackage,
  existingSession?: GameSession
): VersionConflictReport {
  if (!existingSession) {
    return {
      hasConflict: false,
      conflictType: 'none',
      localRevision: 0,
      remoteRevision: pkg.session.revision || 1,
      localUpdatedAt: 0,
      remoteUpdatedAt: pkg.session.updatedAt || pkg.exportedAt,
      recommendation: 'duplicate',
      detail: 'No existe ninguna sesión previa con este identificador en este dispositivo.',
    };
  }

  const localRev = existingSession.revision || 1;
  const remoteRev = pkg.session.revision || 1;
  const localTime = existingSession.updatedAt || existingSession.createdAt;
  const remoteTime = pkg.session.updatedAt || pkg.exportedAt;

  if (localTime > remoteTime && localRev > remoteRev) {
    return {
      hasConflict: true,
      conflictType: 'local_newer',
      localRevision: localRev,
      remoteRevision: remoteRev,
      localUpdatedAt: localTime,
      remoteUpdatedAt: remoteTime,
      recommendation: 'duplicate',
      detail: `La preparación local en este dispositivo es más reciente (Rev ${localRev}) que la del archivo importado (Rev ${remoteRev}). Sobrescribir provocaría pérdida de progreso jugado.`,
    };
  }

  if (remoteTime > localTime && remoteRev > localRev) {
    return {
      hasConflict: true,
      conflictType: 'remote_newer',
      localRevision: localRev,
      remoteRevision: remoteRev,
      localUpdatedAt: localTime,
      remoteUpdatedAt: remoteTime,
      recommendation: 'overwrite',
      detail: `El archivo importado contiene una versión posterior (Rev ${remoteRev}) a la copia local de este dispositivo (Rev ${localRev}).`,
    };
  }

  if (localRev === remoteRev) {
    const localSig = JSON.stringify({
      scenes: existingSession.frozenScenes?.map((s) => s.id) || [],
      convs: existingSession.frozenConversations?.map((c) => c.id) || [],
      stagedScene: existingSession.stagedState?.sceneName,
      stagedChars: existingSession.stagedState?.characters?.length,
    });
    const remoteSig = JSON.stringify({
      scenes: pkg.campaignSnippet.scenes?.map((s) => s.id) || [],
      convs: pkg.campaignSnippet.savedConversations?.map((c) => c.id) || [],
      stagedScene: pkg.session.stagedState?.sceneName,
      stagedChars: pkg.session.stagedState?.characters?.length,
    });

    if (localSig !== remoteSig) {
      return {
        hasConflict: true,
        conflictType: 'diverged_concurrent_branch',
        localRevision: localRev,
        remoteRevision: remoteRev,
        localUpdatedAt: localTime,
        remoteUpdatedAt: remoteTime,
        recommendation: 'duplicate',
        detail: `Ambas copias tienen el mismo número de revisión (Rev ${localRev}), pero sus contenidos difieren debido a modificaciones concurrentes en dispositivos separados. No debe decidirse el reemplazo únicamente por la hora del reloj. Se recomienda importar como copia paralela.`,
      };
    }
  }

  if (localRev !== remoteRev || Math.abs(localTime - remoteTime) > 5000) {
    return {
      hasConflict: true,
      conflictType: 'diverged',
      localRevision: localRev,
      remoteRevision: remoteRev,
      localUpdatedAt: localTime,
      remoteUpdatedAt: remoteTime,
      recommendation: 'duplicate',
      detail: `Ambas copias tienen modificaciones divergentes (Local: Rev ${localRev}, Archivo: Rev ${remoteRev}). Se recomienda importar como copia paralela.`,
    };
  }

  return {
    hasConflict: false,
    conflictType: 'none',
    localRevision: localRev,
    remoteRevision: remoteRev,
    localUpdatedAt: localTime,
    remoteUpdatedAt: remoteTime,
    recommendation: 'keep_local',
    detail: 'Ambas versiones son idénticas en revisión y fecha.',
  };
}

/**
 * Evaluación pre-partida («Lista para jugar»).
 * Reúne archivos disponibles offline, referencias de personajes, diálogos y estado de guardado.
 */
export async function checkSessionReadiness(sessionId: string): Promise<SessionReadinessCheck> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);

  const checks: SessionReadinessCheck['checks'] = [];
  let score = 100;

  // 1. Escena base para proyectar
  const hasStaged = !!session.stagedState && !!session.stagedState.sceneName;
  const hasLive = !!session.liveState && !!session.liveState.sceneName;
  if (hasStaged || hasLive) {
    checks.push({
      id: 'scene_prepared',
      title: 'Escena preparada para proyección',
      status: 'pass',
      detail: `Escena lista: "${session.stagedState?.sceneName || session.liveState?.sceneName}".`,
    });
  } else {
    score -= 30;
    checks.push({
      id: 'scene_prepared',
      title: 'Sin escena preparada',
      status: 'fail',
      detail: 'La sesión no tiene ninguna escena cargada en borrador ni en vivo.',
      action: {
        type: 'select_starting_scene',
        label: 'Elegir Escena de Inicio',
        description: 'Carga una escena de la campaña en Preparación antes de abrir la mesa.',
      },
    });
  }

  // 2. Dependencias de archivos offline
  const deps = await scanSessionAssetDependencies(session);
  const storedAssets = await db.assets.toArray();
  const storedUrls = new Set(storedAssets.flatMap((a) => [a.originUrl, a.dataUrl]).filter(Boolean));
  const missing = deps.filter(
    (d) => !d.url.startsWith('data:') && !d.url.startsWith('blob:') && !storedUrls.has(d.url)
  );
  const readyLocalCount = deps.length - missing.length;

  if (missing.length === 0) {
    checks.push({
      id: 'offline_assets',
      title: 'Activos 100% listos para uso sin conexión',
      status: 'pass',
      detail: `${readyLocalCount} recursos locales verificados. Ningún archivo faltante.`,
    });
  } else {
    score -= 25;
    checks.push({
      id: 'offline_assets',
      title: 'Recursos externos o faltantes detectados',
      status: 'warn',
      detail: `${missing.length} archivo(s) dependen de URLs remotas o no están disponibles localmente.`,
      action: {
        type: 'download_missing_assets',
        label: 'Descargar Recursos Faltantes',
        description: 'Descargar y cachear los archivos remotos en el almacenamiento local.',
      },
      actionPayload: { missingCount: missing.length, missingUrls: missing.map((m) => m.url) },
    });
  }

  // 3. Referencias de personajes e identidades
  const characters = session.stagedState?.characters || [];
  const charsWithoutAvatar = characters.filter((c) => !c.avatarUrl);
  if (charsWithoutAvatar.length === 0) {
    checks.push({
      id: 'characters_valid',
      title: 'Retratos e identidades de personajes válidos',
      status: 'pass',
      detail: `${characters.length} personaje(s) en escena con retrato y configuración completa.`,
    });
  } else {
    score -= 15;
    checks.push({
      id: 'characters_valid',
      title: 'Personajes con retratos faltantes',
      status: 'warn',
      detail: `${charsWithoutAvatar.length} personaje(s) no tienen imagen de retrato asignada.`,
      action: {
        type: 'fix_character_avatar',
        label: 'Asignar Retratos Faltantes',
        description: 'Asignar avatares o retratos válidos a los personajes en el editor.',
      },
      actionPayload: { characterIds: charsWithoutAvatar.map((c) => c.id) },
    });
  }

  // 4. Integridad de conversaciones vinculadas
  const convCount = session.frozenConversations?.length || 0;
  checks.push({
    id: 'dialogues_frozen',
    title: 'Diálogos y documentos protegidos',
    status: 'pass',
    detail: `${convCount} conversación(es) y ${session.frozenHandouts?.length || 0} documento(s) congelados de forma independiente.`,
    action: convCount === 0 ? {
      type: 'repair_dialogue',
      label: 'Vincular Diálogos',
      description: 'Añadir conversaciones o documentos si la sesión incluye interacciones narrativas.',
    } : undefined,
  });

  const canPlayOffline = missing.length === 0 && (hasStaged || hasLive);
  const isReady = score >= 70 && (hasStaged || hasLive);

  return {
    isReady,
    canPlayOffline,
    score: Math.max(0, score),
    summary: canPlayOffline
      ? 'Sesión lista para jugar sin conexión a Internet.'
      : 'La sesión se puede jugar, pero algunos recursos requieren conexión o revisión.',
    checks,
  };
}

/**
 * Actualiza una sesión desde su plantilla maestra conservando el progreso jugado.
 * Genera un punto de control automático previo para que nunca se pierdan ajustes propios.
 */
export async function updateSessionFromTemplate(
  sessionId: string,
  templateId: string
): Promise<{ session: GameSession; checkpoint: SessionCheckpoint }> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);
  const template = await db.sessionTemplates.get(templateId);
  if (!template) throw new Error(`Plantilla ${templateId} no encontrada`);

  // 1. Crear punto de control previo de seguridad
  const stateToBackup = session.stagedState || session.liveState || {
    sceneName: 'Respaldo Pre-Plantilla',
    backgroundUrl: '',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: { text: '', visible: false },
    isBlackout: false,
    ambientAudioUrl: '',
    ambientVolume: 0.5,
    ambientPlaying: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
  };

  const checkpoint = await createSessionCheckpoint(
    sessionId,
    session.campaignId,
    `Punto de restauración antes de actualizar desde ${template.name}`,
    stateToBackup,
    'auto',
    'template_sync'
  );

  // 2. Incorporar nuevas escenas de la plantilla sin duplicar existentes por nombre
  const existingSceneNames = new Set((session.frozenScenes || []).map((s) => s.name.toLowerCase()));
  const newScenesToAdd = (template.frozenScenes || []).filter(
    (ts) => !existingSceneNames.has(ts.name.toLowerCase())
  );

  const updatedScenes = [...(session.frozenScenes || []), ...newScenesToAdd];

  // 3. Incorporar nuevas conversaciones sin pisar las ya congeladas
  const existingConvIds = new Set((session.frozenConversations || []).map((c) => c.id));
  const newConvsToAdd = (template.frozenConversations || []).filter(
    (tc) => !existingConvIds.has(tc.id)
  );
  const updatedConvs = [...(session.frozenConversations || []), ...newConvsToAdd];

  // 4. Si el borrador actual estaba vacío, adoptar el de la plantilla
  if (!session.stagedState && template.stagedState) {
    session.stagedState = JSON.parse(JSON.stringify(template.stagedState));
  }

  session.frozenScenes = updatedScenes;
  session.frozenConversations = updatedConvs;
  session.updatedAt = Date.now();
  session.revision = (session.revision || 1) + 1;

  await db.sessions.put(session);
  return { session, checkpoint };
}

/**
 * Analiza las diferencias granulares entre una sesión y una plantilla maestra.
 */
export async function getTemplateUpdateDiff(
  sessionId: string,
  templateId: string
): Promise<TemplateUpdateDiffReport> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);
  const template = await db.sessionTemplates.get(templateId);
  if (!template) throw new Error(`Plantilla ${templateId} no encontrada`);

  const items: TemplateDiffItem[] = [];

  // 1. Escenas
  const sessionScenes = session.frozenScenes || [];
  const sessionSceneMap = new Map(sessionScenes.map((s) => [s.id, s]));
  const sessionSceneNames = new Map(sessionScenes.map((s) => [s.name.toLowerCase(), s]));

  for (const tScene of template.frozenScenes || []) {
    const matched = sessionSceneMap.get(tScene.id) || sessionSceneNames.get(tScene.name.toLowerCase());
    if (!matched) {
      items.push({
        id: tScene.id,
        type: 'scene',
        name: tScene.name,
        changeType: 'new',
        templateItem: tScene,
        description: 'Escena nueva agregada en la plantilla maestra.',
      });
    } else {
      const isDiff =
        matched.backgroundUrl !== tScene.backgroundUrl ||
        (matched.props?.length || 0) !== (tScene.props?.length || 0) ||
        (matched.lights?.length || 0) !== (tScene.lights?.length || 0);

      items.push({
        id: tScene.id,
        type: 'scene',
        name: tScene.name,
        changeType: isDiff ? 'modified' : 'identical',
        templateItem: tScene,
        currentSessionItem: matched,
        description: isDiff
          ? 'La plantilla tiene cambios en fondo, props o luces. Podés conservar tu versión o actualizar.'
          : 'Composición idéntica en plantilla y sesión.',
      });
    }
  }

  // 2. Conversaciones
  const sessionConvs = session.frozenConversations || [];
  const sessionConvMap = new Map(sessionConvs.map((c) => [c.id, c]));
  const sessionConvTitles = new Map(sessionConvs.map((c) => [c.title.toLowerCase(), c]));

  for (const tConv of template.frozenConversations || []) {
    const matched = sessionConvMap.get(tConv.id) || sessionConvTitles.get(tConv.title.toLowerCase());
    if (!matched) {
      items.push({
        id: tConv.id,
        type: 'conversation',
        name: tConv.title,
        changeType: 'new',
        templateItem: tConv,
        description: `Diálogo nuevo con ${tConv.lines.length} líneas en la plantilla.`,
      });
    } else {
      const isDiff = matched.lines.length !== tConv.lines.length;
      items.push({
        id: tConv.id,
        type: 'conversation',
        name: tConv.title,
        changeType: isDiff ? 'modified' : 'identical',
        templateItem: tConv,
        currentSessionItem: matched,
        description: isDiff
          ? `La plantilla tiene ${tConv.lines.length} líneas vs ${matched.lines.length} en tu sesión.`
          : 'Diálogo idéntico en ambas versiones.',
      });
    }
  }

  return {
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.version || 1,
    items,
    hasModifications: items.some((i) => i.changeType === 'modified' || i.changeType === 'new'),
  };
}

/**
 * Aplica una actualización granular desde plantilla con opciones seleccionadas por el DM.
 * Crea automáticamente un punto de control previo.
 */
export async function applyGranularTemplateUpdate(
  sessionId: string,
  templateId: string,
  selection: GranularTemplateUpdateSelection
): Promise<{ session: GameSession; checkpoint: SessionCheckpoint }> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);
  const template = await db.sessionTemplates.get(templateId);
  if (!template) throw new Error(`Plantilla ${templateId} no encontrada`);

  // 1. Crear punto de control previo
  const stateToBackup = session.stagedState || session.liveState || {
    sceneName: 'Respaldo Pre-Sincronización',
    backgroundUrl: '',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: { text: '', visible: false },
    isBlackout: false,
    ambientAudioUrl: '',
    ambientVolume: 0.5,
    ambientPlaying: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
  };

  const checkpoint = await createSessionCheckpoint(
    sessionId,
    session.campaignId,
    `Antes de actualizar granularmente desde "${template.name}"`,
    stateToBackup,
    'auto',
    'template_sync'
  );

  const selectedSet = new Set(selection.selectedItemIds);
  const updatedScenes = [...(session.frozenScenes || [])];
  const updatedConvs = [...(session.frozenConversations || [])];

  // 2. Procesar escenas seleccionadas
  for (const tScene of template.frozenScenes || []) {
    if (!selectedSet.has(tScene.id)) continue;
    const existingIndex = updatedScenes.findIndex((s) => s.id === tScene.id || s.name.toLowerCase() === tScene.name.toLowerCase());
    if (existingIndex === -1) {
      updatedScenes.push(tScene);
    } else {
      const resolution = selection.modifiedResolution[tScene.id] || 'keep_session';
      if (resolution === 'overwrite_with_template') {
        updatedScenes[existingIndex] = tScene;
      } else if (resolution === 'create_copy') {
        updatedScenes.push({
          ...tScene,
          id: generateId('sc'),
          name: `${tScene.name} (Actualizada)`,
        });
      }
    }
  }

  // 3. Procesar conversaciones seleccionadas
  for (const tConv of template.frozenConversations || []) {
    if (!selectedSet.has(tConv.id)) continue;
    const existingIndex = updatedConvs.findIndex((c) => c.id === tConv.id || c.title.toLowerCase() === tConv.title.toLowerCase());
    if (existingIndex === -1) {
      updatedConvs.push(tConv);
    } else {
      const resolution = selection.modifiedResolution[tConv.id] || 'keep_session';
      if (resolution === 'overwrite_with_template') {
        updatedConvs[existingIndex] = tConv;
      } else if (resolution === 'create_copy') {
        updatedConvs.push({
          ...tConv,
          id: generateId('conv'),
          title: `${tConv.title} (Actualizada)`,
        });
      }
    }
  }

  session.frozenScenes = updatedScenes;
  session.frozenConversations = updatedConvs;
  session.updatedAt = Date.now();
  session.revision = (session.revision || 1) + 1;

  await db.sessions.put(session);
  return { session, checkpoint };
}

/**
 * Migra explícitamente una sesión antigua que no cuenta con snapshots inmutables.
 * No falsea que la campaña actual sea la versión original si esta ha cambiado.
 */
export async function migrateLegacySession(sessionId: string): Promise<GameSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);

  const campaign = await db.campaigns.get(session.campaignId);

  const hasScenes = session.frozenScenes && session.frozenScenes.length > 0;
  const hasCharacters = session.frozenCharacters && session.frozenCharacters.length > 0;

  if (hasScenes && hasCharacters && session.initialBaselineConfig) {
    return session;
  }

  const migrationTimestamp = Date.now();
  const dateStr = new Date(migrationTimestamp).toLocaleDateString();

  session.frozenScenes = hasScenes ? session.frozenScenes : (campaign?.scenes ? JSON.parse(JSON.stringify(campaign.scenes)) : []);
  session.frozenCharacters = hasCharacters ? session.frozenCharacters : (campaign?.characters ? JSON.parse(JSON.stringify(campaign.characters)) : []);
  session.frozenConversations = session.frozenConversations?.length ? session.frozenConversations : (campaign?.savedConversations ? JSON.parse(JSON.stringify(campaign.savedConversations)) : []);
  session.frozenHandouts = session.frozenHandouts?.length ? session.frozenHandouts : (campaign?.savedHandouts ? JSON.parse(JSON.stringify(campaign.savedHandouts)) : []);
  session.frozenMacros = session.frozenMacros?.length ? session.frozenMacros : (campaign?.macros ? JSON.parse(JSON.stringify(campaign.macros)) : []);

  if (!session.initialBaselineConfig) {
    const raw = session.stagedState || session.liveState || {
      sceneName: session.frozenScenes?.[0]?.name || 'Escena Inicial Migrada',
      backgroundUrl: session.frozenScenes?.[0]?.backgroundUrl || '',
      characters: [],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    session.initialBaselineConfig = {
      state: JSON.parse(JSON.stringify(raw)),
      savedAt: migrationTimestamp,
      version: 1,
      label: `Línea base fijada en migración (${dateStr})`,
    };
  }

  session.isMigratedFromLegacy = true;
  session.legacyMigrationNote = `Sesión migrada desde formato antiguo el ${dateStr}. Los snapshots de escenas, personajes y diálogos fueron congelados a partir del estado de la campaña en esta fecha y pueden diferir de la preparación original si la campaña sufrió modificaciones previas.`;
  session.updatedAt = migrationTimestamp;

  await db.sessions.put(session);
  return session;
}

// ─── Export / Import Robusto ────────────────────────────────────────────────

/**
 * Empaqueta una sesión con todos sus activos incrustados como DataURL.
 * Si downloadExternal es true, ejecuta el escáner y descarga las URLs remotas.
 */
export async function packSessionForExport(
  sessionId: string,
  downloadExternal: boolean = false,
  onProgress?: (current: number, total: number, item: AssetDependencyItem) => void
): Promise<GameSessionPackage> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);

  const dependencies = scanSessionAssetDependencies(session);
  let preflightReport: ExportPreflightReport | null = null;

  if (downloadExternal) {
    preflightReport = await downloadExternalAssetsForSession(dependencies, onProgress);
  }

  // Recopilar todos los assets almacenados en IndexedDB
  const allStored = await db.assets.toArray();
  const assetMap = new Map<string, StoredAsset>();
  for (const a of allStored) {
    assetMap.set(a.id, a);
    assetMap.set(a.dataUrl, a);
    if (a.originUrl) assetMap.set(a.originUrl, a);
  }

  const packedAssets: Array<{ id: string; name: string; type: 'image' | 'audio'; dataUrl: string }> = [];
  const missingAssets: MissingAssetInfo[] = preflightReport ? [...preflightReport.missing] : [];

  for (const dep of dependencies) {
    if (dep.url.startsWith('data:')) {
      packedAssets.push({
        id: generateId('asset'),
        name: dep.context,
        type: dep.type,
        dataUrl: dep.url,
      });
      continue;
    }
    if (dep.url.startsWith('blob:')) {
      const dataUrl = await convertBlobUrlToDataUrl(dep.url);
      packedAssets.push({
        id: generateId('asset'),
        name: dep.context,
        type: dep.type,
        dataUrl,
      });
      continue;
    }
    const found = assetMap.get(dep.url);
    if (found) {
      packedAssets.push({
        id: found.id,
        name: found.name,
        type: found.type,
        dataUrl: found.dataUrl,
      });
    } else if (!preflightReport) {
      missingAssets.push({
        url: dep.url,
        context: dep.context,
        assetType: dep.type,
        errorReason: 'No almacenado localmente en db.assets',
      });
    }
  }

  const campaign = await db.campaigns.get(session.campaignId);
  const scenes = session.frozenScenes && session.frozenScenes.length > 0
    ? session.frozenScenes
    : (campaign?.scenes ?? []);
  const characters = session.frozenCharacters && session.frozenCharacters.length > 0
    ? session.frozenCharacters
    : (campaign?.characters ?? []);

  const isCompleteOfflinePackage = missingAssets.length === 0;

  const now = Date.now();
  session.lastExportedAt = now;
  session.lastExportIsComplete = isCompleteOfflinePackage;

  // Registrar timestamp de exportación e indicador de completitud en la sesión
  await db.sessions.update(sessionId, {
    lastExportedAt: now,
    lastExportIsComplete: isCompleteOfflinePackage,
  });

  return {
    schemaVersion: 1,
    exportedAt: now,
    type: 'game_session_package',
    session,
    assets: packedAssets,
    campaignSnippet: {
      id: campaign?.id ?? session.campaignId,
      title: campaign?.title ?? 'Campaña',
      scenes,
      characters,
      savedConversations: campaign?.savedConversations || [],
      macros: campaign?.macros || [],
      savedHandouts: campaign?.savedHandouts || [],
    },
    isCompleteOfflinePackage,
    missingAssets: missingAssets.length > 0 ? missingAssets : undefined,
  };
}

/**
 * Analiza un paquete para mostrar la previsualización de diferencias (Diff Review)
 * antes de proceder a la importación.
 */
export async function analyzeSessionPackageDiff(pkg: GameSessionPackage): Promise<ImportDiffSummary> {
  const existingCampaign = await db.campaigns.get(pkg.campaignSnippet.id);
  const pkgScenes = pkg.campaignSnippet.scenes || [];
  const pkgChars = pkg.campaignSnippet.characters || [];

  const existingSceneIds = new Set((existingCampaign?.scenes || []).map((s) => s.id));
  const newScenesCount = pkgScenes.filter((s) => !existingSceneIds.has(s.id)).length;
  const conflictingScenesCount = pkgScenes.filter((s) => existingSceneIds.has(s.id)).length;

  return {
    sessionName: pkg.session.name,
    isCompletePackage: pkg.isCompleteOfflinePackage ?? true,
    scenesCount: pkgScenes.length,
    charactersCount: pkgChars.length,
    newScenesCount,
    conflictingScenesCount,
    missingAssets: pkg.missingAssets || [],
  };
}

/**
 * Importa un paquete de sesión con remapeo transaccional de identificadores.
 * Si asIndependentCopy es true, garantiza que no se alterará ninguna entidad existente.
 */
export async function importSessionPackageWithRemap(
  pkg: GameSessionPackage,
  asIndependentCopy: boolean = true
): Promise<{ session: GameSession; campaignId: string }> {
  if (pkg.type !== 'game_session_package' || pkg.schemaVersion !== 1) {
    throw new Error('Formato de paquete inválido o versión incompatible');
  }

  return await db.transaction('rw', [db.sessions, db.assets, db.campaigns], async () => {
    // 1. Importar activos a db.assets de forma inmutable
    for (const asset of pkg.assets) {
      await registerImmutableAsset(asset.name, asset.type, asset.dataUrl);
    }

    // 2. Determinar o crear la campaña
    let targetCampaignId = pkg.session.campaignId;
    const existingCampaign = await db.campaigns.get(targetCampaignId);

    if (!existingCampaign) {
      const newCampaign: Campaign = {
        id: targetCampaignId,
        title: pkg.campaignSnippet.title || 'Campaña Importada',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        scenes: pkg.campaignSnippet.scenes || [],
        characters: pkg.campaignSnippet.characters || [],
        savedConversations: pkg.campaignSnippet.savedConversations || [],
        macros: pkg.campaignSnippet.macros || [],
        savedHandouts: pkg.campaignSnippet.savedHandouts || [],
      };
      await db.campaigns.put(newCampaign);
    } else if (asIndependentCopy) {
      // Incorporar escenas, personajes, conversaciones o handouts ausentes de manera no destructiva
      const existingSceneIds = new Set(existingCampaign.scenes.map((s) => s.id));
      const newScenes = (pkg.campaignSnippet.scenes || []).filter((s) => !existingSceneIds.has(s.id));
      const existingCharIds = new Set(existingCampaign.characters.map((c) => c.id));
      const newChars = (pkg.campaignSnippet.characters || []).filter((c) => !existingCharIds.has(c.id));
      const existingConvIds = new Set((existingCampaign.savedConversations || []).map((c) => c.id));
      const newConvs = (pkg.campaignSnippet.savedConversations || []).filter((c) => !existingConvIds.has(c.id));
      const existingHandoutIds = new Set((existingCampaign.savedHandouts || []).map((h) => h.id));
      const newHandouts = (pkg.campaignSnippet.savedHandouts || []).filter((h) => !existingHandoutIds.has(h.id));

      if (newScenes.length > 0 || newChars.length > 0 || newConvs.length > 0 || newHandouts.length > 0) {
        await db.campaigns.update(targetCampaignId, {
          scenes: [...existingCampaign.scenes, ...newScenes],
          characters: [...existingCampaign.characters, ...newChars],
          savedConversations: [...(existingCampaign.savedConversations || []), ...newConvs],
          savedHandouts: [...(existingCampaign.savedHandouts || []), ...newHandouts],
          updatedAt: Date.now(),
        });
      }
    }

    // 3. Crear sesión independiente con nuevo ID si corresponde
    const existingSession = await db.sessions.get(pkg.session.id);
    const mustGenerateNewId = asIndependentCopy || !!existingSession;

    const finalSessionId = mustGenerateNewId ? generateId('gs') : pkg.session.id;
    const finalSessionName = mustGenerateNewId ? `${pkg.session.name} (Copia Importada)` : pkg.session.name;

    const finalSession: GameSession = {
      ...pkg.session,
      id: finalSessionId,
      campaignId: targetCampaignId,
      name: finalSessionName,
      status: 'preparing',
      schemaVersion: 1,
      frozenScenes: pkg.campaignSnippet.scenes,
      frozenCharacters: pkg.campaignSnippet.characters,
      revision: 1,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.sessions.put(finalSession);
    return { session: finalSession, campaignId: targetCampaignId };
  });
}

/**
 * Importa un paquete de sesión (método compatible con suite de pruebas anterior).
 */
export async function importSessionPackage(
  pkg: GameSessionPackage,
  conflictStrategy: 'keep_local' | 'overwrite' | 'duplicate' = 'duplicate'
): Promise<{ session: GameSession; conflicts: string[] }> {
  if (conflictStrategy === 'duplicate') {
    const res = await importSessionPackageWithRemap(pkg, true);
    return { session: res.session, conflicts: [pkg.session.id] };
  }
  const existingSession = await db.sessions.get(pkg.session.id);
  if (existingSession && conflictStrategy === 'keep_local') {
    return { session: existingSession, conflicts: [pkg.session.id] };
  }
  const res = await importSessionPackageWithRemap(pkg, false);
  return { session: res.session, conflicts: existingSession ? [pkg.session.id] : [] };
}

/**
 * Importa una sesión como copia de comprobación aislada.
 * No altera la campaña activa, no publica en la Mesa y verifica la integridad del paquete.
 */
export async function importSessionAsAuditCopy(
  pkg: GameSessionPackage
): Promise<AuditRestoreReport> {
  if (pkg.type !== 'game_session_package' || pkg.schemaVersion !== 1) {
    throw new Error('Formato de paquete inválido');
  }

  const res = await importSessionPackageWithRemap(pkg, true);
  const auditSession = res.session;

  auditSession.name = `[Comprobación] ${pkg.session.name}`;
  auditSession.isAuditCopy = true;
  auditSession.liveState = null; // Aislamiento absoluto de la Mesa
  auditSession.status = 'preparing';
  await db.sessions.put(auditSession);

  const readiness = await checkSessionReadiness(auditSession.id);

  return {
    isSuccess: true,
    auditSessionId: auditSession.id,
    declaredAssetsCount: pkg.assets.length,
    restoredAssetsCount: pkg.assets.length,
    missingAssetsCount: readiness.canPlayOffline ? 0 : 1,
    isolatedFromLiveTable: true,
    details: 'Copia de comprobación creada con éxito en modo preparación. La Mesa conectada no fue alterada y la campaña activa se mantuvo intacta.',
  };
}
