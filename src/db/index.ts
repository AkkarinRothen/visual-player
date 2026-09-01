import Dexie, { type Table } from 'dexie';
import type { Campaign, Character, Scene, SFXTrack } from '../types';

export interface StoredAsset {
  id: string;
  name: string;
  type: 'image' | 'audio';
  dataUrl: string;
  createdAt: number;
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

  constructor() {
    super('VisualPlayerDB');
    this.version(2).stores({
      campaigns: 'id, title, createdAt, updatedAt',
      characters: 'id, name, roleOrTitle',
      scenes: 'id, name',
      assets: 'id, name, type, createdAt',
      settings: 'key',
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

// Initial Demo Campaign Data
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
    dmNotes: 'El tabernero Gromm tiene la llave del sótano donde se oculta la entrada a las catacumbas. Hay un bardo cantando en una esquina y dos soldados sospechosos observando a los jugadores.',
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
    dmNotes: 'Tirada de Percepción DC 14 para no perderse. A mitad del camino encontrarán un altar con runas cubiertas de musgo.',
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
    dmNotes: 'Lluvia intensa y relámpagos constantes. La visibilidad está reducida a 10 metros. Un eco mágico resuena cada vez que cae un rayo.',
    ambientAudioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/30/audio_51c6b6d510.mp3?filename=heavy-rain-and-thunder-126296.mp3',
    ambientAudioName: 'Lluvia Fuerte y Truenos',
    suggestedNpcIds: ['char-morwen', 'char-thorin'],
  },
  {
    id: 'scene-snow-mountain',
    name: 'Pico del Viento Helado',
    backgroundUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&auto=format&fit=crop&q=80',
    locationBanner: 'PICO DEL VIENTO HELADO',
    subtitle: 'Cumbre Septentrional - 3.200m de Altitud',
    weather: 'snow',
    weatherIntensity: 0.8,
    lighting: 'normal',
    dmNotes: 'Efecto de Frío Extremo (Tiradas de Salvación de Constitución al final de cada hora). El puente colgante cruje peligrosamente.',
    suggestedNpcIds: ['char-thorin'],
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
    dmNotes: 'El suelo está cubierto de oro y huesos calcinados. El dragón despierta si los jugadores hacen ruido superior a Sigilo DC 16.',
    suggestedNpcIds: ['char-ignis', 'char-morwen'],
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
};

// Campaign CRUD & Multi-Campaign Database Helpers
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
    return DEMO_CAMPAIGN;
  }
  const activeId = await getActiveCampaignId();
  const activeCamp = await db.campaigns.get(activeId);
  if (activeCamp) return activeCamp;

  const campaigns = await db.campaigns.toArray();
  return campaigns[0] || DEMO_CAMPAIGN;
}
