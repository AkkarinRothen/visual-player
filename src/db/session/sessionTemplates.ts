import type {
  GameSession,
  GameSessionTemplate,
  SceneCompositionPreset,
  DisplayState,
  SavedConversation,
  PresetCharacterVisual,
  CharacterOnScreen,
  SceneProp,
  SceneLight,
  SceneZoneEmitter,
  SceneInteraction,
  Scene,
  InstantiatePresetOptions,
  SessionCheckpoint,
  TemplateUpdateDiffReport,
  TemplateDiffItem,
  GranularTemplateUpdateSelection,
} from '../../types';
import { db } from '../index';
import { generateId } from '../dbUtils';
import { createSessionCheckpoint } from '../checkpointDb';
import { getSessionsByCampaign } from './sessionCrud';
import { sanitizeStateForTemplate } from './sessionOperations';

/**
 * Obtiene todas las plantillas de todas las campañas.
 */
export async function getAllSessionTemplates(): Promise<GameSessionTemplate[]> {
  const templates = await db.sessionTemplates.toArray();
  return templates.filter((t) => !t.isDeleted).sort((a, b) => b.createdAt - a.createdAt);
}

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
    name: name || `${template.name} (Sesión ${sessionNumber})`,
    status: 'preparing',
    schemaVersion: 1,
    planNotes: '',
    stagedState: template.stagedState ? JSON.parse(JSON.stringify(template.stagedState)) : null,
    liveState: null,
    frozenScenes: template.frozenScenes ? JSON.parse(JSON.stringify(template.frozenScenes)) : undefined,
    frozenCharacters: template.frozenCharacters ? JSON.parse(JSON.stringify(template.frozenCharacters)) : undefined,
    frozenConversations: template.frozenConversations ? JSON.parse(JSON.stringify(template.frozenConversations)) : undefined,
    frozenHandouts: template.frozenHandouts ? JSON.parse(JSON.stringify(template.frozenHandouts)) : undefined,
    frozenMacros: template.frozenMacros ? JSON.parse(JSON.stringify(template.frozenMacros)) : undefined,
    revision: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber,
  };

  await db.sessions.put(session);
  return session;
}

// ─── Scene Composition Presets ──────────────────────────────────────────────

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
