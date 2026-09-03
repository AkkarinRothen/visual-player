import Dexie, { type Table } from 'dexie';
import type {
  Campaign,
  Character,
  Scene,
  SessionCheckpoint,
  SavedEncounter,
  GameSession,
  GameSessionTemplate,
  SceneCompositionPreset,
} from '../types';
import type { FullRecoverySnapshot } from '../services/sessionRecovery';
import type { StoredAsset } from './assetDb';

export type { StoredAsset } from './assetDb';

export interface AppSetting {
  key: string;
  value: string;
}

export class VisualPlayerDB extends Dexie {
  campaigns!: Table<Campaign, string>;
  characters!: Table<Character, string>;
  scenes!: Table<Scene, string>;
  assets!: Table<StoredAsset, string>;
  settings!: Table<AppSetting, string>;
  checkpoints!: Table<SessionCheckpoint, string>;
  encounters!: Table<SavedEncounter, string>;
  recoverySnapshots!: Table<FullRecoverySnapshot, string>;
  sessions!: Table<GameSession, string>;
  sessionTemplates!: Table<GameSessionTemplate, string>;
  scenePresets!: Table<SceneCompositionPreset, string>;

  constructor() {
    super('VisualPlayerDB');
    // v5 — esquema original
    this.version(5).stores({
      campaigns: 'id, title, createdAt, updatedAt',
      characters: 'id, name, roleOrTitle',
      scenes: 'id, name',
      assets: 'id, name, type, createdAt',
      settings: 'key',
      checkpoints: 'id, campaignId, type, createdAt',
      encounters: 'id, campaignId, name, difficulty',
      recoverySnapshots: 'id, roomId, sessionRevision, savedAt, exitType',
    });
    // v6 — añade Biblioteca de Preparaciones y Sesiones
    this.version(6).stores({
      campaigns: 'id, title, createdAt, updatedAt',
      characters: 'id, name, roleOrTitle',
      scenes: 'id, name',
      assets: 'id, name, type, createdAt',
      settings: 'key',
      checkpoints: 'id, campaignId, type, createdAt',
      encounters: 'id, campaignId, name, difficulty',
      recoverySnapshots: 'id, roomId, sessionRevision, savedAt, exitType',
      sessions: 'id, campaignId, status, createdAt, updatedAt',
      sessionTemplates: 'id, campaignId, createdAt',
    });
    // v7 — añade índices para papelera (isDeleted), checkpoints vinculados por sessionId y originUrl de assets
    this.version(7).stores({
      campaigns: 'id, title, createdAt, updatedAt',
      characters: 'id, name, roleOrTitle',
      scenes: 'id, name',
      assets: 'id, name, type, createdAt, originUrl',
      settings: 'key',
      checkpoints: 'id, campaignId, sessionId, type, createdAt',
      encounters: 'id, campaignId, name, difficulty',
      recoverySnapshots: 'id, roomId, sessionRevision, savedAt, exitType',
      sessions: 'id, campaignId, status, isDeleted, createdAt, updatedAt',
      sessionTemplates: 'id, campaignId, isDeleted, createdAt',
    });
    // v8 — añade tabla para Presets de Escena Completa (composiciones reutilizables)
    this.version(8).stores({
      campaigns: 'id, title, createdAt, updatedAt',
      characters: 'id, name, roleOrTitle',
      scenes: 'id, name',
      assets: 'id, name, type, createdAt, originUrl',
      settings: 'key',
      checkpoints: 'id, campaignId, sessionId, type, createdAt',
      encounters: 'id, campaignId, name, difficulty',
      recoverySnapshots: 'id, roomId, sessionRevision, savedAt, exitType',
      sessions: 'id, campaignId, status, isDeleted, createdAt, updatedAt',
      sessionTemplates: 'id, campaignId, isDeleted, createdAt',
      scenePresets: 'id, campaignId, sceneId, isDeleted, createdAt, updatedAt',
    });
  }
}

export const db = new VisualPlayerDB();

// ─── Re-exportaciones Modulares de la Capa de Datos ──────────────────────────

export * from './demoData';
export * from './dbUtils';
export * from './campaignDb';
export * from './checkpointDb';
export * from './assetDb';
export * from './sessionDb';
