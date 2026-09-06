import type { DMFavoriteItem } from './common.types';
import type { SavedEncounter } from './combat.types';
import type { BiomeSoundProfile, SFXTrack, SceneLightingPreset, SoundboardBank } from './atmosphere.types';
import type { Character } from './character.types';
import type { HandoutState, PropAsset, Scene, SceneCompositionPreset } from './scene.types';
import type { CampaignRecap, CinematicMacro, SavedConversation } from './cinematic.types';
import type { DisplayState } from './display.types';

export type KnowledgeType = 'npc_identity' | 'npc_appearance' | 'clue' | 'secret';

export interface CampaignKnowledgeEntry {
  id: string;
  type: KnowledgeType;
  title: string;
  description: string;
  targetId?: string;
  revealedAt: number;
  source: 'auto_interaction' | 'manual_dm';
  sessionId?: string;
  dmPrivateNotes?: string;
  isCorrected?: boolean;
  correctionReason?: string;
}

export interface CampaignWorldStateEntry {
  id: string; // targetInstanceId
  targetName: string;
  state: string;
  scope: 'session' | 'campaign';
  lastModifiedAt: number;
  sessionId?: string;
  notes?: string;
}

export interface SessionPrepDraft {
  id: string;
  campaignId: string;
  createdAt: number;
  updatedAt: number;
  selectedSceneId: string;
  suggestedReason: string;
  worldChoices: Record<string, 'keep' | 'reset'>; // instanceId -> 'keep' | 'reset'
  resetTemporaryWeather: boolean;
  resetTemporaryCombat: boolean;
  dmSessionGoals?: string;
  status: 'draft' | 'ready' | 'applied';
}

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt?: number;
  scenes: Scene[];
  characters: Character[];
  customSfx?: SFXTrack[];
  macros?: CinematicMacro[];
  encounters?: SavedEncounter[];
  favorites?: DMFavoriteItem[];
  propAssets?: PropAsset[];
  savedCompositions?: SceneCompositionPreset[];
  savedConversations?: SavedConversation[];
  interactionStates?: Record<string, string>; // Maps instanceId -> currentState (persists choices)
  knowledgeEntries?: CampaignKnowledgeEntry[];
  worldStateEntries?: CampaignWorldStateEntry[];
  nextSessionNotes?: string;
  sessionPrepDraft?: SessionPrepDraft;
  savedHandouts?: HandoutState[];
  savedRecap?: CampaignRecap;
  soundboardBanks?: SoundboardBank[];
  biomeProfiles?: BiomeSoundProfile[];
  lightingPresets?: SceneLightingPreset[];
}

export interface PublicKnowledgeItem {
  id: string;
  title: string;
  category: string;
  summary: string;
}

export interface PublicChronicleDraft {
  title: string;
  campaignTitle: string;
  sessionDateLabel: string;
  generatedAt: number;
  synopsis: string;
  keyMilestones: string[];
  publicKnowledgeEntries: PublicKnowledgeItem[];
  activeQuestsOrObjectives: string[];
  dmClosingNotes?: string;
}

export interface SessionCheckpoint {
  id: string;
  campaignId: string;
  sessionId?: string;
  name: string;
  type: 'manual' | 'auto';
  trigger: string;
  createdAt: number;
  state: DisplayState;
  previewThumbnailUrl?: string;
}

/** Estado del ciclo de vida de una sesión de partida. */
export type GameSessionStatus = 'preparing' | 'active' | 'completed' | 'archived';

/**
 * Entidad GameSession: ciudadana de primera clase en Dexie.
 * Sustituye el snapshot único 'active_session' para el guardado del borrador.
 * NO almacena tokens WebRTC, roomId ni claves de conexión.
 */
export interface GameSession {
  id: string;                         // 'gs-<uuid>'
  campaignId: string;
  name: string;                       // "Sesión 3 - El Paso del Trueno"
  status: GameSessionStatus;
  schemaVersion: 1;
  planNotes: string;                  // Texto libre del director (plan, ideas)
  stagedState: DisplayState | null;   // Borrador (Staging) persistido automáticamente
  liveState: DisplayState | null;     // Último estado publicado a la Mesa
  groupId?: string;                   // Identificador estable de grupo/mesa (p. ej. 'grp-martes')
  groupName?: string;                 // Nombre descriptivo del grupo de juego (p. ej. 'Grupo de los Martes')
  frozenScenes?: Scene[];             // Snapshot congelado de escenas de la preparación
  frozenCharacters?: Character[];     // Snapshot congelado de personajes de la preparación
  frozenConversations?: SavedConversation[]; // Snapshot congelado de conversaciones de la preparación
  frozenHandouts?: HandoutState[];    // Snapshot congelado de documentos/handouts de la preparación
  frozenMacros?: CinematicMacro[];             // Snapshot congelado de macros y momentos de la preparación
  revision: number;                   // Contador incremental de revisiones para anti-race
  lastExportedAt?: number;            // Timestamp de la última exportación completa
  lastExportIsComplete?: boolean;     // Indica si la última exportación fue 100% autocontenida sin faltantes
  lastBackupConfirmedAt?: number;     // Confirmación voluntaria de copia externa segura
  /** Indica si esta sesión es una copia aislada de comprobación de respaldo. */
  isAuditCopy?: boolean;
  /** Indica si la sesión fue migrada desde un formato antiguo sin snapshots. */
  isMigratedFromLegacy?: boolean;
  /** Nota explicativa de la fecha y origen de los snapshots migrados. */
  legacyMigrationNote?: string;
  /** Marca de borrado lógico para recuperación desde papelera. */
  isDeleted?: boolean;                // Soft-delete (Papelera)
  deletedAt?: number;                 // Timestamp de envío a la papelera
  createdAt: number;
  updatedAt: number;
  initialBaselineConfig?: SessionInitialBaseline; // Configuración inicial intencional de la aventura para nuevos grupos
  sessionNumber?: number;             // Número ordinal dentro de la campaña
  tags?: string[];
}

export interface SessionInitialBaseline {
  state: DisplayState;
  savedAt: number;
  version: number;
  label?: string;
  sourceTemplateId?: string;
  sourceTemplateName?: string;
}

export interface NextSessionOptions {
  newName?: string;
  startSceneId?: string;
  preserveCombatProgress?: boolean;
  preserveNpcHpLoss?: boolean;
  preserveConditions?: boolean;
  carryOverPlanNotes?: boolean;
}

export interface NewGroupSessionOptions {
  newName?: string;
  targetGroupName: string;
  targetGroupId?: string;
  resetRevelations?: boolean;
  resetNpcHp?: boolean;
  resetCombat?: boolean;
  resetInteractions?: boolean;
  baselineSource?: 'session_baseline' | 'template' | 'current_draft';
  templateId?: string;
}

/**
 * Plantilla de sesión: borrador sanitizado sin HP perdidos, combate activo,
 * temporizadores ni condiciones transitorias.
 */
export interface GameSessionTemplate {
  id: string;                         // 'tpl-<uuid>'
  name: string;
  description?: string;
  sourceSessionId: string;
  campaignId: string;
  stagedState: DisplayState;
  frozenScenes?: Scene[];
  frozenCharacters?: Character[];
  frozenConversations?: SavedConversation[];
  frozenHandouts?: HandoutState[];
  frozenMacros?: CinematicMacro[];
  version?: number;
  isDeleted?: boolean;
  deletedAt?: number;
  createdAt: number;
}

/** Opciones para duplicar una sesión. */
export interface DuplicateSessionOptions {
  excludeCombatProgress: boolean;     // Por defecto: true
  excludeConditions: boolean;         // Por defecto: true
  restoreNpcHp?: boolean;             // Si false conserva daño en NPCs
  newName?: string;
}

/** Información de un activo que no pudo ser resuelto localmente ni descargado. */
export interface MissingAssetInfo {
  url: string;
  context: string;                   // p.ej. "Fondo de Escena: Caverna", "Avatar: Valeros"
  assetType: 'image' | 'video' | 'audio';
  errorReason?: string;
}

/** Informe de diagnóstico previo a la exportación. */
export interface ExportPreflightReport {
  totalAssets: number;
  readyLocalCount: number;
  downloadedCount: number;
  missing: MissingAssetInfo[];
  canExportOfflineComplete: boolean;
}

/** Resumen de diferencias previo a la importación segura. */
export interface ImportDiffSummary {
  sessionName: string;
  isCompletePackage: boolean;
  scenesCount: number;
  charactersCount: number;
  newScenesCount: number;
  conflictingScenesCount: number;
  missingAssets: MissingAssetInfo[];
}

/**
 * Paquete portable de sesión (.vpp.json) para exportar/importar
 * entre PC y Android con todos los assets incrustados como DataURL.
 */
export interface GameSessionPackage {
  schemaVersion: 1;
  exportedAt: number;
  type: 'game_session_package';
  session: GameSession;
  assets: Array<{
    id: string;
    name: string;
    type: 'image' | 'video' | 'audio';
    dataUrl: string;
  }>;
  campaignSnippet: {
    id: string;
    title: string;
    scenes: Scene[];
    characters?: Character[];
    savedConversations?: SavedConversation[];
    macros?: CinematicMacro[];
    savedHandouts?: HandoutState[];
  };
  isCompleteOfflinePackage: boolean;
  missingAssets?: MissingAssetInfo[];
}

export interface ReadinessRemediationAction {
  type: 'select_starting_scene' | 'download_missing_assets' | 'fix_character_avatar' | 'repair_dialogue' | 'open_library';
  label: string;
  description: string;
}

export interface SessionReadinessCheckItem {
  id: string;
  title: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  action?: ReadinessRemediationAction;
  actionPayload?: any;
}

export interface SessionReadinessCheck {
  isReady: boolean;
  canPlayOffline: boolean;
  score: number;
  summary: string;
  checks: SessionReadinessCheckItem[];
}

export interface VersionConflictReport {
  hasConflict: boolean;
  conflictType: 'none' | 'local_newer' | 'remote_newer' | 'diverged' | 'diverged_concurrent_branch';
  localRevision: number;
  remoteRevision: number;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  recommendation: 'overwrite' | 'duplicate' | 'keep_local';
  detail: string;
}

export interface TemplateDiffItem {
  id: string;
  type: 'scene' | 'conversation' | 'handout';
  name: string;
  changeType: 'new' | 'modified' | 'identical';
  templateItem: any;
  currentSessionItem?: any;
  description: string;
}

export interface TemplateUpdateDiffReport {
  templateId: string;
  templateName: string;
  templateVersion: number;
  items: TemplateDiffItem[];
  hasModifications: boolean;
}

export interface GranularTemplateUpdateSelection {
  selectedItemIds: string[];
  modifiedResolution: Record<string, 'keep_session' | 'overwrite_with_template' | 'create_copy'>;
}

export interface StorageAuditReport {
  totalAssets: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  inUseCount: number;
  retainedInTrashOrCheckpointsCount: number;
  orphanCount: number;
  orphanAssetIds: string[];
  reclaimableBytes: number;
  reclaimableFormatted: string;
  breakdownByType: {
    images: { count: number; bytes: number };
    audio: { count: number; bytes: number };
  };
}

export interface AuditRestoreReport {
  isSuccess: boolean;
  auditSessionId: string;
  declaredAssetsCount: number;
  restoredAssetsCount: number;
  missingAssetsCount: number;
  isolatedFromLiveTable: boolean;
  details: string;
}

/**
 * Activo individual dentro de un paquete de recursos (.vppack)
 */
export interface ResourcePackAsset {
  id: string;
  name: string;
  type: 'image' | 'video';
  category: 'token' | 'background' | 'prop' | 'character' | 'asset';
  usage?: Array<'scene-background' | 'invoke-character' | 'place-token' | 'show-asset' | 'place-prop'>;
  dataUrl: string;
  thumbnailUrl?: string;
  dimensions?: { width: number; height: number };
  tags?: string[];
  originalFileName?: string;
}

/**
 * Paquete de recursos visuales portable (.vppack / .vppack.json)
 */
export interface VisualResourcePack {
  schemaVersion: 1;
  type: 'visual_resource_pack';
  id: string;
  name: string;
  category: 'tokens' | 'maps' | 'backgrounds' | 'characters' | 'props' | 'assets' | 'mixed';
  author?: string;
  description?: string;
  coverDataUrl?: string;
  createdAt: number;
  itemCount: number;
  totalSizeBytes: number;
  tags?: string[];
  assets: ResourcePackAsset[];
}

/**
 * Registro de paquete de recursos instalado localmente
 */
export interface InstalledResourcePack {
  id: string;
  name: string;
  category: 'tokens' | 'maps' | 'backgrounds' | 'characters' | 'props' | 'assets' | 'mixed';
  author?: string;
  description?: string;
  coverDataUrl?: string;
  installedAt: number;
  itemCount: number;
  totalSizeBytes: number;
  tags?: string[];
}
