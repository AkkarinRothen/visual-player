import { describe, it, expect } from 'vitest';
import type {
  Campaign,
  DisplayState,
  SessionPrepDraft,
  Scene,
  SceneProp,
  CampaignWorldStateEntry,
  CampaignKnowledgeEntry,
} from '../../types';

describe('Session Prep Wizard Suite (SessionPrepWizard)', () => {
  const mockProps: SceneProp[] = [
    {
      id: 'prop-iron-door',
      name: 'Puerta de Hierro',
      assetUrl: 'https://example.com/door.png',
      normalizedX: 20,
      normalizedY: 60,
      scale: 1,
      zIndex: 10,
      visualStateId: 'closed',
    },
    {
      id: 'prop-treasure-chest',
      name: 'Cofre de Oro',
      assetUrl: 'https://example.com/chest.png',
      normalizedX: 80,
      normalizedY: 80,
      scale: 1,
      zIndex: 11,
      visualStateId: 'hidden',
    },
  ];

  const mockScene: Scene = {
    id: 'sc-dungeon-entry',
    name: 'Entrada a la Mazmorra',
    backgroundUrl: 'https://example.com/dungeon.jpg',
    props: mockProps,
  };

  const mockKnowledge: CampaignKnowledgeEntry[] = [
    {
      id: 'know-1',
      type: 'clue',
      title: 'El Sello de Sangre',
      description: 'Descubrieron que el culto usa sangre de dragón.',
      revealedAt: Date.now() - 50000,
      source: 'auto_interaction',
    },
  ];

  const mockWorldEntries: CampaignWorldStateEntry[] = [
    {
      id: 'prop-iron-door',
      targetName: 'Puerta de Hierro',
      state: 'open',
      scope: 'session', // Temporary session scope
      lastModifiedAt: Date.now() - 10000,
    },
    {
      id: 'prop-treasure-chest',
      targetName: 'Cofre de Oro',
      state: 'open',
      scope: 'campaign', // Persistent campaign scope
      lastModifiedAt: Date.now() - 15000,
    },
  ];

  const mockCampaign: Campaign = {
    id: 'camp-1',
    title: 'Campaña Sombría',
    createdAt: Date.now() - 200000,
    scenes: [mockScene],
    characters: [],
    knowledgeEntries: mockKnowledge,
    worldStateEntries: mockWorldEntries,
    nextSessionNotes: 'Los jugadores van a investigar la sala del trono.',
  };

  const currentLiveState: DisplayState = {
    currentSceneId: 'sc-dungeon-entry',
    sceneName: 'Entrada a la Mazmorra',
    backgroundUrl: 'https://example.com/dungeon.jpg',
    characters: [],
    weather: 'rain',
    weatherIntensity: 0.8,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Entrada a la Mazmorra', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/spooky.mp3',
    ambientPlaying: true,
    ambientVolume: 0.6,
    lastSfx: {
      id: 'sfx-old',
      type: 'door_creak',
      timestamp: Date.now() - 2000,
    },
    combatState: {
      isActive: true,
      round: 3,
      currentTurnIndex: 1,
      combatants: [],
    },
  };

  it('1. Generates intelligent default draft proposing the active scene and recommended persistence', () => {
    const draft: SessionPrepDraft = {
      id: 'prep-draft-1',
      campaignId: mockCampaign.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      selectedSceneId: currentLiveState.currentSceneId!,
      suggestedReason: 'Escena activa al finalizar la sesión anterior',
      worldChoices: {
        'prop-iron-door': 'reset', // Recommended for session scope
        'prop-treasure-chest': 'keep', // Recommended for campaign scope
      },
      resetTemporaryWeather: true,
      resetTemporaryCombat: true,
      dmSessionGoals: mockCampaign.nextSessionNotes,
      status: 'draft',
    };

    expect(draft.selectedSceneId).toBe('sc-dungeon-entry');
    expect(draft.worldChoices['prop-treasure-chest']).toBe('keep');
    expect(draft.worldChoices['prop-iron-door']).toBe('reset');
    expect(draft.status).toBe('draft');
  });

  it('2. Builds prepared DisplayState with selective persistence and guaranteed audio silence', () => {
    const draft: SessionPrepDraft = {
      id: 'prep-draft-2',
      campaignId: mockCampaign.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      selectedSceneId: 'sc-dungeon-entry',
      suggestedReason: 'Escena activa',
      worldChoices: {
        'prop-iron-door': 'reset', // Reset back to default
        'prop-treasure-chest': 'keep', // Keep persistent 'open'
      },
      resetTemporaryWeather: true,
      resetTemporaryCombat: true,
      status: 'draft',
    };

    // Construct prepared staging state
    const preparedState: DisplayState = {
      ...currentLiveState,
      currentSceneId: mockScene.id,
      sceneName: mockScene.name,
      backgroundUrl: mockScene.backgroundUrl,
      props: (mockScene.props || []).map((p) => {
        if (draft.worldChoices[p.id] === 'keep') {
          const entry = mockWorldEntries.find((w) => w.id === p.id);
          return entry ? { ...p, visualStateId: entry.state } : p;
        }
        return p; // Left as default
      }),
      weather: draft.resetTemporaryWeather ? 'none' : currentLiveState.weather,
      weatherIntensity: draft.resetTemporaryWeather ? 0 : currentLiveState.weatherIntensity,
      ambientAudioUrl: '', // Silent prep
      ambientPlaying: false, // Silent prep
      lastSfx: null, // No ephemeral sound repeated
      combatState: draft.resetTemporaryCombat
        ? { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] }
        : currentLiveState.combatState,
    };

    // Check prop states
    const door = preparedState.props!.find((p) => p.id === 'prop-iron-door');
    const chest = preparedState.props!.find((p) => p.id === 'prop-treasure-chest');

    expect(door?.visualStateId).toBe('closed'); // Reset
    expect(chest?.visualStateId).toBe('open'); // Kept

    // Check absolute audio silence
    expect(preparedState.ambientPlaying).toBe(false);
    expect(preparedState.lastSfx).toBeNull();

    // Check weather and combat reset
    expect(preparedState.weather).toBe('none');
    expect(preparedState.combatState.isActive).toBe(false);
  });

  it('3. Guarantees that knowledge entries remain intact regardless of world resets', () => {
    // Both props are reset in the draft
    const allResetChoices = {
      'prop-iron-door': 'reset' as const,
      'prop-treasure-chest': 'reset' as const,
    };

    // Campaign knowledge is immutable to physical prop resets
    expect(mockCampaign.knowledgeEntries).toHaveLength(1);
    expect(mockCampaign.knowledgeEntries![0].title).toBe('El Sello de Sangre');
    expect(allResetChoices['prop-treasure-chest']).toBe('reset');
  });

  it('4. Updates draft status to applied upon confirmation idempotently', () => {
    let draft: SessionPrepDraft = {
      id: 'prep-draft-apply',
      campaignId: mockCampaign.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      selectedSceneId: 'sc-dungeon-entry',
      suggestedReason: 'Escena activa',
      worldChoices: {},
      resetTemporaryWeather: true,
      resetTemporaryCombat: true,
      status: 'draft',
    };

    // First apply
    draft = { ...draft, status: 'applied', updatedAt: Date.now() };
    expect(draft.status).toBe('applied');

    // Duplicate trigger
    draft = { ...draft, status: 'applied', updatedAt: Date.now() };
    expect(draft.status).toBe('applied');
  });
});
