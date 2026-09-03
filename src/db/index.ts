import Dexie, { type Table } from 'dexie';
import type {
  Campaign,
  Character,
  Scene,
  SFXTrack,
  SessionCheckpoint,
  CinematicMacro,
  SavedEncounter,
  GameSession,
  GameSessionTemplate,
  DuplicateSessionOptions,
  GameSessionPackage,
  DisplayState,
  CombatState,
  MissingAssetInfo,
  ExportPreflightReport,
  ImportDiffSummary,
} from '../types';
import type { FullRecoverySnapshot } from '../services/sessionRecovery';

export interface StoredAsset {
  id: string;
  name: string;
  type: 'image' | 'audio';
  dataUrl: string;
  createdAt: number;
  originUrl?: string;
  refCount?: number;
}

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

  constructor() {
    super('VisualPlayerDB');
    // v5 — esquema original (sin cambios)
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
  }
}

export const db = new VisualPlayerDB();

// Built-in Synthesizer SFX list
export const BUILTIN_SFX: SFXTrack[] = [
  { id: 'sfx-thunder', name: 'Trueno / Tormenta', category: 'environment', icon: 'Zap', soundType: 'synthesized', synthPreset: 'thunder' },
  { id: 'sfx-sword', name: 'Choque de Espadas', category: 'combat', icon: 'ShieldAlert', soundType: 'synthesized', synthPreset: 'sword_clash' },
  { id: 'sfx-magic', name: 'Hechizo Mágico', category: 'magic', icon: 'Sparkles', soundType: 'synthesized', synthPreset: 'magic_spell' },
  { id: 'sfx-gong', name: 'Gong de Combate', category: 'combat', icon: 'Swords', soundType: 'synthesized', synthPreset: 'gong' },
  { id: 'sfx-roar', name: 'Rugido de Monstruo', category: 'combat', icon: 'Skull', soundType: 'synthesized', synthPreset: 'monster_roar' },
  { id: 'sfx-door', name: 'Puerta Chirriante', category: 'mystery', icon: 'DoorOpen', soundType: 'synthesized', synthPreset: 'door_creak' },
  { id: 'sfx-bell', name: 'Campana de Templo', category: 'social', icon: 'Bell', soundType: 'synthesized', synthPreset: 'church_bell' },
  { id: 'sfx-fanfare', name: 'Fanfarria de Victoria', category: 'social', icon: 'Trophy', soundType: 'synthesized', synthPreset: 'fanfare_victory' },
  { id: 'sfx-heartbeat', name: 'Latido / Tensión', category: 'mystery', icon: 'Heart', soundType: 'synthesized', synthPreset: 'heartbeat' },
];

// Initial Demo Campaign Characters
export const DEMO_CHARACTERS: Character[] = [
  {
    id: 'char-eldrin',
    name: 'Eldrin Sombrasusurro',
    roleOrTitle: 'Pícaro Elfo Silvano',
    defaultAvatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    expressions: {
      'Neutral': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      'Alerta': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    },
    bio: 'Un explorador sigiloso con conocimiento del bosque prohibido.',
    tags: ['Elfo', 'Pícaro', 'Aliado'],
    maxHp: 38,
  },
  {
    id: 'char-morwen',
    name: 'Morwen del Fuego Carmesí',
    roleOrTitle: 'Archimaga del Cónclave',
    defaultAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    expressions: {
      'Serena': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      'Lanzando Magia': 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80',
    },
    bio: 'Custodia runas arcanas y secretos de la era primordial.',
    tags: ['Maga', 'Noble', 'Neutral'],
    maxHp: 32,
  },
  {
    id: 'char-thorin',
    name: 'Bromir Rompehierro',
    roleOrTitle: 'Capitán Enano Guardián',
    defaultAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    expressions: {
      'Firme': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    },
    bio: 'Veterano de mil batallas subterráneas contra las hordas oscuras.',
    tags: ['Enano', 'Guerrero'],
    maxHp: 58,
  },
  {
    id: 'char-tavernero',
    name: 'Gromm el Tabernero',
    roleOrTitle: 'Dueño del Dragón Durmiente',
    defaultAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
    bio: 'Sabe todos los rumores de la región... a cambio de unas monedas de oro.',
    tags: ['NPC', 'Taberna'],
    maxHp: 24,
  },
  {
    id: 'char-ignis',
    name: 'Vaelthazar el Devorador',
    roleOrTitle: 'Dragón Anciano Rojo',
    defaultAvatarUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    bio: 'Reposa en su lecho de oro fundido esperando intrusos.',
    tags: ['Jefe', 'Dragón', 'Enemigo'],
    maxHp: 180,
  },
];

// Initial Demo Scenes
export const DEMO_SCENES: Scene[] = [
  {
    id: 'scene-tavern',
    name: 'Taberna del Dragón Durmiente',
    backgroundUrl: 'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=1600&auto=format&fit=crop&q=80',
    locationBanner: 'TABERNA DEL DRAGÓN DURMIENTE',
    subtitle: 'Valle de Oakhaven - Rumores y Cerveza Enana',
    weather: 'embers',
    weatherIntensity: 0.4,
    lighting: 'torch_flicker',
    dmNotes: 'El tabernero Gromm tiene la llave del sótano donde se oculta la entrada a las catacumbas.',
    ambientAudioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=medieval-tavern-music-112349.mp3',
    ambientAudioName: 'Música de Taberna Medieval',
    suggestedNpcIds: ['char-tavernero', 'char-eldrin'],
  },
  {
    id: 'scene-forest',
    name: 'Bosque de los Susurros',
    backgroundUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1600&auto=format&fit=crop&q=80',
    locationBanner: 'BOSQUE DE LOS SUSURROS',
    subtitle: 'Tierras Salvajes - Sendero de la Niebla Eterna',
    weather: 'fog',
    weatherIntensity: 0.7,
    lighting: 'mystic_violet',
    dmNotes: 'Tirada de Percepción DC 14 para no perderse.',
    ambientAudioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=forest-wind-and-birds-6881.mp3',
    ambientAudioName: 'Viento en el Bosque Mágico',
    suggestedNpcIds: ['char-eldrin', 'char-morwen'],
  },
  {
    id: 'scene-storm-ruins',
    name: 'Ruinas de la Torre Quebrada',
    backgroundUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    locationBanner: 'RUINAS DE LA TORRE QUEBRADA',
    subtitle: 'Tempestad en el Paso del Trueno',
    weather: 'storm',
    weatherIntensity: 0.9,
    lighting: 'night',
    dmNotes: 'Lluvia intensa y relámpagos constantes.',
    ambientAudioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/30/audio_51c6b6d510.mp3?filename=heavy-rain-and-thunder-126296.mp3',
    ambientAudioName: 'Lluvia Fuerte y Truenos',
    suggestedNpcIds: ['char-morwen', 'char-thorin'],
  },
  {
    id: 'scene-dragon-lair',
    name: 'Guarida de Vaelthazar',
    backgroundUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80',
    locationBanner: 'SANTUARIO DEL FUEGO ETERNO',
    subtitle: 'Corazón Volcánico de la Montaña Roja',
    weather: 'embers',
    weatherIntensity: 1.0,
    lighting: 'blood_moon',
    dmNotes: 'El suelo está cubierto de oro y huesos calcinados.',
    suggestedNpcIds: ['char-ignis', 'char-morwen'],
  },
];

// Initial Demo Macros
export const DEMO_MACROS: CinematicMacro[] = [
  {
    id: 'macro-dragon-awakens',
    name: 'Despertar de Vaelthazar',
    description: 'Blackout, rugido aterrador, temblor y revelación del dragón ancestral entre ascuas y fuego carmesí.',
    icon: 'Skull',
    steps: [
      {
        id: 'step-1',
        delayMs: 1800,
        actionLabel: 'Blackout & Rugido Aterrador',
        blackout: true,
        sfxPreset: 'monster_roar',
        shake: true,
      },
      {
        id: 'step-2',
        delayMs: 0,
        actionLabel: 'Revelación del Santuario del Dragón',
        sceneId: 'scene-dragon-lair',
        backgroundUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80',
        weather: 'embers',
        weatherIntensity: 1.0,
        lighting: 'blood_moon',
        blackout: false,
        locationBanner: {
          text: '¡DESPIERTA VAELTHAZAR!',
          subtitle: 'Corazón Volcánico de la Montaña Roja',
          visible: true,
        },
        charactersToAdd: [
          {
            id: 'macro-char-dragon',
            characterId: 'char-ignis',
            name: 'Vaelthazar el Devorador',
            avatarUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
            position: 'center-right',
            isSpeaking: true,
          },
        ],
        sfxPreset: 'thunder',
        shake: true,
      },
    ],
  },
  {
    id: 'macro-ruins-storm',
    name: 'Tempestad en las Ruinas',
    description: 'Tormenta nocturna, relámpago con trueno y llegada de Bromir en posición de guardia.',
    icon: 'CloudLightning',
    steps: [
      {
        id: 'step-1',
        delayMs: 1400,
        actionLabel: 'Comienzo de la Tormenta',
        sceneId: 'scene-storm-ruins',
        backgroundUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
        weather: 'storm',
        weatherIntensity: 0.9,
        lighting: 'night',
        ambientAudioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/30/audio_51c6b6d510.mp3?filename=heavy-rain-and-thunder-126296.mp3',
        ambientAudioName: 'Lluvia Fuerte y Truenos',
        ambientPlaying: true,
        ambientVolume: 0.6,
      },
      {
        id: 'step-2',
        delayMs: 0,
        actionLabel: 'Rayo & Aparición del Capitán Enano',
        lightning: true,
        shake: true,
        sfxPreset: 'thunder',
        locationBanner: {
          text: 'RUINAS DE LA TORRE QUEBRADA',
          subtitle: 'Tempestad en el Paso del Trueno',
          visible: true,
        },
        charactersToAdd: [
          {
            id: 'macro-char-thorin',
            characterId: 'char-thorin',
            name: 'Bromir Rompehierro',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
            position: 'center-left',
            isSpeaking: false,
          },
        ],
      },
    ],
  },
  {
    id: 'macro-tavern-arrival',
    name: 'Llegada a la Taberna',
    description: 'Campanadas de fondo, calor de antorchas, música festiva y bienvenida del tabernero Gromm.',
    icon: 'Flame',
    steps: [
      {
        id: 'step-1',
        delayMs: 1200,
        actionLabel: 'Campana & Puerta',
        sfxPreset: 'church_bell',
      },
      {
        id: 'step-2',
        delayMs: 0,
        actionLabel: 'Ambiente Cálido y Bienvenida',
        sceneId: 'scene-tavern',
        backgroundUrl: 'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=1600&auto=format&fit=crop&q=80',
        weather: 'embers',
        weatherIntensity: 0.4,
        lighting: 'torch_flicker',
        ambientAudioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=medieval-tavern-music-112349.mp3',
        ambientAudioName: 'Música de Taberna Medieval',
        ambientPlaying: true,
        ambientVolume: 0.5,
        locationBanner: {
          text: 'TABERNA DEL DRAGÓN DURMIENTE',
          subtitle: 'Valle de Oakhaven - Rumores y Cerveza Enana',
          visible: true,
        },
        charactersToAdd: [
          {
            id: 'macro-char-tavernero',
            characterId: 'char-tavernero',
            name: 'Gromm el Tabernero',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
            position: 'center-left',
            isSpeaking: true,
          },
        ],
      },
    ],
  },
];

// Initial Demo Saved Encounters
export const DEMO_ENCOUNTERS: SavedEncounter[] = [
  {
    id: 'enc-wolves',
    campaignId: 'campaign-demo',
    name: 'Emboscada de los Lobos Sombríos',
    description: 'Una jauría de lobos hambrientos rodea el campamento mientras el lobo alfa acecha en las sombras.',
    difficulty: 'medio',
    rewardsSummary: '350 XP, 45 PO, 2 Pieles de Lobo Huargo de Calidad',
    turnTimerSeconds: 60,
    dmNotes: 'Los lobos atacan en manada (tienen ventaja si hay otro lobo a 1.5m de la víctima). El Alfa entra en la Ronda 2.',
    combatants: [
      {
        id: 'wolf-1',
        name: 'Lobo Huargo A',
        avatarUrl: 'https://images.unsplash.com/photo-1564865878688-9a244444042a?w=600&auto=format&fit=crop&q=80',
        maxHp: 26,
        currentHp: 26,
        isMonster: true,
        showHpToPlayers: false,
        initiativeType: 'roll_d20',
        initiativeModifier: 2,
      },
      {
        id: 'wolf-2',
        name: 'Lobo Huargo B',
        avatarUrl: 'https://images.unsplash.com/photo-1564865878688-9a244444042a?w=600&auto=format&fit=crop&q=80',
        maxHp: 26,
        currentHp: 26,
        isMonster: true,
        showHpToPlayers: false,
        initiativeType: 'roll_d20',
        initiativeModifier: 2,
      },
      {
        id: 'wolf-alpha',
        name: '🐺 Lobo Alfa Garraoscura (Refuerzo)',
        avatarUrl: 'https://images.unsplash.com/photo-1590424744299-eb38b97d264e?w=600&auto=format&fit=crop&q=80',
        maxHp: 48,
        currentHp: 48,
        isMonster: true,
        showHpToPlayers: false,
        initiativeType: 'roll_d20',
        initiativeModifier: 3,
        isWaveReinforcement: true,
        triggerRound: 2,
      },
      {
        id: 'player-eldrin',
        name: 'Eldrin Sombrasusurro',
        avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        maxHp: 38,
        currentHp: 38,
        isMonster: false,
        showHpToPlayers: true,
        initiativeType: 'roll_d20',
        initiativeModifier: 4,
      },
      {
        id: 'player-bromir',
        name: 'Bromir Rompehierro',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
        maxHp: 58,
        currentHp: 58,
        isMonster: false,
        showHpToPlayers: true,
        initiativeType: 'roll_d20',
        initiativeModifier: 1,
      },
    ],
  },
  {
    id: 'enc-dragon',
    campaignId: 'campaign-demo',
    name: 'El Juicio de Vaelthazar el Devorador',
    description: 'Enfrentamiento culminante contra el dragón anciano en su trono de lava ardiente.',
    difficulty: 'letal',
    rewardsSummary: '3.800 XP, 2.400 PO, Corona de Rubíes del Rey Enano, Daga Llameante +2',
    turnTimerSeconds: 60,
    dmNotes: 'Aliento de Fuego (Recarga 5-6): 12d6 daño de fuego en cono de 18m (DC 18 Destreza mitad).',
    combatants: [
      {
        id: 'boss-vaelthazar',
        name: '🐉 Vaelthazar el Devorador',
        avatarUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
        maxHp: 180,
        currentHp: 180,
        isMonster: true,
        showHpToPlayers: true,
        initiativeType: 'fixed',
        fixedInitiative: 20,
      },
      {
        id: 'cultist-1',
        name: 'Fanático del Fuego A',
        avatarUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80',
        maxHp: 32,
        currentHp: 32,
        isMonster: true,
        showHpToPlayers: false,
        initiativeType: 'roll_d20',
        initiativeModifier: 2,
      },
      {
        id: 'cultist-2',
        name: 'Fanático del Fuego B (Refuerzo)',
        avatarUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80',
        maxHp: 32,
        currentHp: 32,
        isMonster: true,
        showHpToPlayers: false,
        initiativeType: 'roll_d20',
        initiativeModifier: 2,
        isWaveReinforcement: true,
        triggerRound: 3,
      },
      {
        id: 'p-morwen',
        name: 'Morwen del Fuego Carmesí',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        maxHp: 32,
        currentHp: 32,
        isMonster: false,
        showHpToPlayers: true,
        initiativeType: 'roll_d20',
        initiativeModifier: 2,
      },
    ],
  },
];

export const DEMO_CAMPAIGN: Campaign = {
  id: 'campaign-demo',
  title: 'La Crónica de las Gemas de Fuego',
  description: 'Aventura de prueba que viaja desde una cálida taberna hasta la guarida de un dragón milenario cruzando bosques y tempestades.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  scenes: DEMO_SCENES,
  characters: DEMO_CHARACTERS,
  customSfx: BUILTIN_SFX,
  macros: DEMO_MACROS,
  encounters: DEMO_ENCOUNTERS,
};

// Campaign CRUD
export async function getAllCampaigns(): Promise<Campaign[]> {
  return await db.campaigns.toArray();
}

export async function getActiveCampaignId(): Promise<string> {
  const setting = await db.settings.get('activeCampaignId');
  if (setting) return setting.value;
  return DEMO_CAMPAIGN.id;
}

export async function setActiveCampaignId(id: string): Promise<void> {
  await db.settings.put({ key: 'activeCampaignId', value: id });
}

export async function createCampaign(camp: Campaign): Promise<void> {
  await db.campaigns.put(camp);
  await setActiveCampaignId(camp.id);
}

export async function updateCampaign(camp: Campaign): Promise<void> {
  camp.updatedAt = Date.now();
  await db.campaigns.put(camp);
}

export async function duplicateCampaign(id: string): Promise<Campaign | null> {
  const original = await db.campaigns.get(id);
  if (!original) return null;

  const duplicated: Campaign = {
    ...original,
    id: `campaign-${Date.now()}`,
    title: `${original.title} (Copia)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.campaigns.put(duplicated);
  return duplicated;
}

export async function deleteCampaign(id: string): Promise<void> {
  await db.campaigns.delete(id);
  const remaining = await getAllCampaigns();
  if (remaining.length > 0) {
    await setActiveCampaignId(remaining[0].id);
  }
}

// Checkpoints
export async function getCampaignCheckpoints(campaignId: string): Promise<SessionCheckpoint[]> {
  const all = await db.checkpoints.where('campaignId').equals(campaignId).toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSessionCheckpoints(sessionId: string): Promise<SessionCheckpoint[]> {
  const all = await db.checkpoints.where('sessionId').equals(sessionId).toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveCheckpoint(cp: SessionCheckpoint): Promise<void> {
  await db.checkpoints.put(cp);
  if (cp.type === 'auto') {
    await cleanOldAutoCheckpoints(cp.campaignId, 30);
  }
}

export async function deleteCheckpoint(id: string): Promise<void> {
  await db.checkpoints.delete(id);
}

export async function cleanOldAutoCheckpoints(campaignId: string, limit: number = 30): Promise<void> {
  const autoCheckpoints = await db.checkpoints
    .where('campaignId')
    .equals(campaignId)
    .filter((cp) => cp.type === 'auto')
    .toArray();

  autoCheckpoints.sort((a, b) => b.createdAt - a.createdAt);
  if (autoCheckpoints.length > limit) {
    const toDelete = autoCheckpoints.slice(limit);
    for (const item of toDelete) {
      await db.checkpoints.delete(item.id);
    }
  }
}

/**
 * Crea un punto de control (checkpoint) explícitamente vinculado a una sesión concreta.
 */
export async function createSessionCheckpoint(
  sessionId: string,
  campaignId: string,
  name: string,
  state: DisplayState,
  type: 'manual' | 'auto' = 'manual',
  trigger: string = 'manual_snapshot'
): Promise<SessionCheckpoint> {
  const cp: SessionCheckpoint = {
    id: generateId('cp'),
    campaignId,
    sessionId,
    name,
    type,
    trigger,
    createdAt: Date.now(),
    state: JSON.parse(JSON.stringify(state)),
  };
  await saveCheckpoint(cp);
  return cp;
}

/**
 * Restaura un checkpoint como una NUEVA preparación por defecto,
 * sin sobrescribir la sesión actual ni publicar nada en la Mesa.
 */
export async function restoreCheckpointAsNewSession(
  checkpointId: string,
  customName?: string
): Promise<GameSession> {
  const cp = await db.checkpoints.get(checkpointId);
  if (!cp) throw new Error(`Punto de control ${checkpointId} no encontrado`);

  const campaign = await db.campaigns.get(cp.campaignId);
  const existing = await getSessionsByCampaign(cp.campaignId);
  const sessionNumber = existing.filter((s) => s.status !== 'archived' && !s.isDeleted).length + 1;

  const newSession: GameSession = {
    id: generateId('gs'),
    campaignId: cp.campaignId,
    name: customName || `${cp.name} (Restaurada)`,
    status: 'preparing',
    schemaVersion: 1,
    planNotes: `Restaurada desde el punto de control: ${cp.name} (${new Date(cp.createdAt).toLocaleString()})`,
    stagedState: JSON.parse(JSON.stringify(cp.state)),
    liveState: null,
    frozenScenes: campaign?.scenes ? JSON.parse(JSON.stringify(campaign.scenes)) : [],
    frozenCharacters: campaign?.characters ? JSON.parse(JSON.stringify(campaign.characters)) : [],
    revision: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber,
  };

  await db.sessions.put(newSession);
  return newSession;
}

// Saved Encounters
export async function getCampaignEncounters(campaignId: string): Promise<SavedEncounter[]> {
  return await db.encounters.where('campaignId').equals(campaignId).toArray();
}

export async function saveEncounter(encounter: SavedEncounter): Promise<void> {
  await db.encounters.put(encounter);
}

export async function deleteEncounter(id: string): Promise<void> {
  await db.encounters.delete(id);
}

// ─── Registro de Assets Inmutables ──────────────────────────────────────────

/**
 * Registra o reutiliza un asset inmutable. Si ya existe un asset con el mismo dataUrl o originUrl,
 * incrementa su contador de referencias y lo reutiliza sin duplicar espacio.
 */
export async function registerImmutableAsset(
  name: string,
  type: 'image' | 'audio',
  dataUrl: string,
  originUrl?: string
): Promise<StoredAsset> {
  const existing = await db.assets.filter((a) => a.dataUrl === dataUrl || (!!originUrl && a.originUrl === originUrl)).first();
  if (existing) {
    const updated: StoredAsset = {
      ...existing,
      refCount: (existing.refCount || 1) + 1,
    };
    await db.assets.put(updated);
    return updated;
  }
  const asset: StoredAsset = {
    id: generateId('asset'),
    name,
    type,
    dataUrl,
    originUrl,
    refCount: 1,
    createdAt: Date.now(),
  };
  await db.assets.put(asset);
  return asset;
}

// ─── Escáner de Dependencias y Pre-flight ─────────────────────────────────────

export interface AssetDependencyItem {
  url: string;
  context: string;
  type: 'image' | 'audio';
}

/**
 * Inspecciona exhaustivamente una GameSession para encontrar todas las URLs de fondos,
 * retratos, expresiones, estados visuales, props, handouts y audios requeridos.
 */
export function scanSessionAssetDependencies(session: GameSession): AssetDependencyItem[] {
  const map = new Map<string, AssetDependencyItem>();

  const add = (url: string | undefined | null, context: string, type: 'image' | 'audio') => {
    if (!url || typeof url !== 'string' || !url.trim()) return;
    const trimmed = url.trim();
    if (!map.has(trimmed)) {
      map.set(trimmed, { url: trimmed, context, type });
    }
  };

  const scanState = (state: DisplayState | null, prefix: string) => {
    if (!state) return;
    add(state.backgroundUrl, `${prefix}: Fondo "${state.sceneName || 'Escena'}"`, 'image');
    add(state.ambientAudioUrl, `${prefix}: Audio ambiental`, 'audio');
    if (state.lastSfx?.audioUrl) {
      add(state.lastSfx.audioUrl, `${prefix}: SFX "${state.lastSfx.type}"`, 'audio');
    }
    state.characters?.forEach((c) => {
      add(c.avatarUrl, `${prefix}: Avatar de "${c.name}"`, 'image');
      if (c.expressions) {
        Object.entries(c.expressions).forEach(([exp, url]) => {
          add(url, `${prefix}: Expresión [${exp}] de "${c.name}"`, 'image');
        });
      }
      c.visualStates?.forEach((v) => {
        add(v.assetUrl, `${prefix}: Estado [${v.name}] de "${c.name}"`, 'image');
      });
    });
    state.props?.forEach((p) => {
      add(p.customUrl, `${prefix}: Prop personalizado "${p.name}"`, 'image');
      p.visualStates?.forEach((v) => {
        add(v.assetUrl, `${prefix}: Estado [${v.name}] de prop "${p.name}"`, 'image');
      });
    });
    if (state.handoutState) {
      add(state.handoutState.imageUrl, `${prefix}: Handout "${state.handoutState.title}"`, 'image');
      state.handoutState.pages?.forEach((page, i) => {
        add(page.imageUrl, `${prefix}: Handout "${state.handoutState?.title}" Pág ${i + 1}`, 'image');
      });
    }
    if (state.cinematicDialogue?.avatarUrl) {
      add(state.cinematicDialogue.avatarUrl, `${prefix}: Avatar de diálogo "${state.cinematicDialogue.speakerName || 'Voz'}"`, 'image');
    }
  };

  scanState(session.stagedState, 'Borrador');
  scanState(session.liveState, 'En Vivo');

  // Escenas congeladas
  session.frozenScenes?.forEach((sc) => {
    add(sc.backgroundUrl, `Escena congelada: Fondo "${sc.name}"`, 'image');
    add(sc.ambientAudioUrl, `Escena congelada: Audio de "${sc.name}"`, 'audio');
    sc.variants?.forEach((v) => {
      add(v.backgroundUrl, `Variante "${v.name}" de escena "${sc.name}"`, 'image');
      add(v.ambientAudioUrl, `Audio variante "${v.name}" de "${sc.name}"`, 'audio');
    });
    sc.props?.forEach((p) => {
      add(p.customUrl, `Prop en escena congelada "${sc.name}"`, 'image');
      p.visualStates?.forEach((v) => {
        add(v.assetUrl, `Estado prop "${p.name}" en escena "${sc.name}"`, 'image');
      });
    });
  });

  // Personajes congelados
  session.frozenCharacters?.forEach((ch) => {
    add(ch.defaultAvatarUrl, `Personaje congelado: Avatar de "${ch.name}"`, 'image');
    if (ch.expressions) {
      Object.entries(ch.expressions).forEach(([exp, url]) => {
        add(url, `Expresión [${exp}] de personaje "${ch.name}"`, 'image');
      });
    }
    ch.visualStates?.forEach((v) => {
      add(v.assetUrl, `Estado [${v.name}] de personaje "${ch.name}"`, 'image');
    });
  });

  return Array.from(map.values());
}

/**
 * Intenta descargar todas las URLs remotas (http/https) de las dependencias
 * convirtiéndolas a DataURL y almacenándolas en el registro de assets inmutables.
 */
export async function downloadExternalAssetsForSession(
  dependencies: AssetDependencyItem[],
  onProgress?: (current: number, total: number, currentItem: AssetDependencyItem) => void
): Promise<ExportPreflightReport> {
  const allStored = await db.assets.toArray();
  const storedByUrl = new Map<string, StoredAsset>();
  for (const a of allStored) {
    storedByUrl.set(a.id, a);
    storedByUrl.set(a.dataUrl, a);
    if (a.originUrl) storedByUrl.set(a.originUrl, a);
  }

  const missing: MissingAssetInfo[] = [];
  let readyLocalCount = 0;
  let downloadedCount = 0;

  for (let i = 0; i < dependencies.length; i++) {
    const item = dependencies[i];
    onProgress?.(i + 1, dependencies.length, item);

    if (item.url.startsWith('data:')) {
      readyLocalCount++;
      continue;
    }

    const existing = storedByUrl.get(item.url);
    if (existing) {
      readyLocalCount++;
      continue;
    }

    if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(item.url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          missing.push({
            url: item.url,
            context: item.context,
            assetType: item.type,
            errorReason: `HTTP ${res.status}: ${res.statusText}`,
          });
          continue;
        }

        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const assetName = item.context.slice(0, 40);
        const saved = await registerImmutableAsset(assetName, item.type, dataUrl, item.url);
        storedByUrl.set(item.url, saved);
        downloadedCount++;
      } catch (err: any) {
        missing.push({
          url: item.url,
          context: item.context,
          assetType: item.type,
          errorReason: err?.message || 'Error de red o CORS al descargar',
        });
      }
    } else {
      missing.push({
        url: item.url,
        context: item.context,
        assetType: item.type,
        errorReason: 'Ruta no válida o inaccesible sin conexión',
      });
    }
  }

  return {
    totalAssets: dependencies.length,
    readyLocalCount,
    downloadedCount,
    missing,
    canExportOfflineComplete: missing.length === 0,
  };
}

// ─── Game Sessions CRUD ──────────────────────────────────────────────────────

/**
 * Genera un ID único con prefijo dado.
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
    combatState: sanitizedCombat,
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
    await db.sessions.update(id, {
      stagedState,
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
    revision: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber,
  };

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

  // Registrar timestamp de exportación en la sesión
  await db.sessions.update(sessionId, { lastExportedAt: Date.now() });

  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    type: 'game_session_package',
    session,
    assets: packedAssets,
    campaignSnippet: {
      id: campaign?.id ?? session.campaignId,
      title: campaign?.title ?? 'Campaña',
      scenes,
      characters,
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
    };
    await db.campaigns.put(newCampaign);
  } else if (asIndependentCopy) {
    // Incorporar escenas o personajes ausentes de manera no destructiva
    const existingSceneIds = new Set(existingCampaign.scenes.map((s) => s.id));
    const newScenes = (pkg.campaignSnippet.scenes || []).filter((s) => !existingSceneIds.has(s.id));
    const existingCharIds = new Set(existingCampaign.characters.map((c) => c.id));
    const newChars = (pkg.campaignSnippet.characters || []).filter((c) => !existingCharIds.has(c.id));

    if (newScenes.length > 0 || newChars.length > 0) {
      await db.campaigns.update(targetCampaignId, {
        scenes: [...existingCampaign.scenes, ...newScenes],
        characters: [...existingCampaign.characters, ...newChars],
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


export async function initDefaultDataIfNeeded(): Promise<Campaign> {
  const count = await db.campaigns.count();
  if (count === 0) {
    await db.campaigns.put(DEMO_CAMPAIGN);
    await setActiveCampaignId(DEMO_CAMPAIGN.id);
    for (const char of DEMO_CHARACTERS) {
      await db.characters.put(char);
    }
    for (const sc of DEMO_SCENES) {
      await db.scenes.put(sc);
    }
    for (const enc of DEMO_ENCOUNTERS) {
      await db.encounters.put(enc);
    }
    return DEMO_CAMPAIGN;
  }
  const activeId = await getActiveCampaignId();
  const activeCamp = await db.campaigns.get(activeId);
  if (activeCamp) {
    if (!activeCamp.macros || activeCamp.macros.length === 0) {
      activeCamp.macros = DEMO_MACROS;
      await db.campaigns.put(activeCamp);
    }
    if (!activeCamp.encounters || activeCamp.encounters.length === 0) {
      activeCamp.encounters = DEMO_ENCOUNTERS;
      await db.campaigns.put(activeCamp);
      for (const enc of DEMO_ENCOUNTERS) {
        await db.encounters.put(enc);
      }
    }
    return activeCamp;
  }

  const campaigns = await db.campaigns.toArray();
  return campaigns[0] || DEMO_CAMPAIGN;
}
