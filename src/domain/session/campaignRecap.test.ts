import { describe, it, expect } from 'vitest';
import type { Campaign, DisplayState } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';
import {
  generateRecapDraftFromCampaign,
  nextRecapSlide,
  prevRecapSlide,
  goToRecapSlide,
} from './campaignRecapGenerator';
import { reduceDisplayCommand } from '../display/displayCommandReducer';

describe('Campaign Opening Cinematic Recap Suite (CampaignRecap)', () => {
  const sampleCampaign: Campaign = {
    id: 'camp-1',
    title: 'Sombras sobre el Valle',
    description: 'Una campaña épica en las tierras prohibidas',
    scenes: [
      {
        id: 'sc-tavern',
        name: 'Taberna del Jabalí Cantor',
        backgroundUrl: 'https://example.com/tavern.jpg',
        weather: 'none',
        lighting: 'normal',
      },
      {
        id: 'sc-crypt',
        name: 'Cripta Olvidada',
        backgroundUrl: 'https://example.com/crypt.jpg',
        weather: 'fog',
        lighting: 'torch_flicker',
      },
    ],
    characters: [],
    knowledgeEntries: [
      {
        id: 'k-secret-1',
        type: 'secret', // SECRET: Must NOT appear in recap!
        title: 'Traición Inminente del Barón',
        description: 'El barón envenenará el pozo a medianoche.',
        source: 'manual_dm',
        revealedAt: 1000,
      },
      {
        id: 'k-public-1',
        type: 'clue', // PUBLIC: Should appear!
        title: 'El Descubrimiento del Medallón',
        description: 'Los aventureros hallaron el medallón dorado en las ruinas.',
        targetId: 'sc-crypt',
        source: 'auto_interaction',
        revealedAt: 2000,
      },
      {
        id: 'k-corrected-1',
        type: 'clue',
        title: 'Rumor Falso de la Bruja',
        description: 'Se decía que la bruja servía al rey, pero fue un engaño.',
        isCorrected: true, // CORRECTED: Must NOT appear!
        source: 'manual_dm',
        revealedAt: 3000,
      },
      {
        id: 'k-public-2',
        type: 'clue', // PUBLIC: Should appear!
        title: 'Pacto con los Enanos del Valle',
        description: 'El clan Thorum prometió forjar las llaves de la ciudadela.',
        targetId: 'sc-tavern',
        source: 'manual_dm',
        revealedAt: 4000,
      },
    ],
    createdAt: 100,
    updatedAt: 5000,
  };

  const initialDisplay: DisplayState = {
    currentSceneId: 'sc-tavern',
    sceneName: 'Taberna del Jabalí Cantor',
    backgroundUrl: 'https://example.com/tavern.jpg',
    characters: [
      {
        id: 'npc-barkeep',
        name: 'Tabernero',
        avatarUrl: 'https://example.com/barkeep.png',
        position: 'center-left',
        isSpeaking: false,
      },
    ],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: { text: 'Taberna', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/tavern-music.mp3',
    ambientPlaying: true,
    ambientVolume: 0.6,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
    activeRecap: null,
  };

  const createMsg = (payload: any): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'm-recap-test',
    commandId: 'cmd-recap-test',
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'critical',
    requiresAck: true,
    type: 'UPDATE_ACTIVE_RECAP',
    payload,
  });

  it('1. Generates zero-spoiler recap draft excluding secret and corrected entries', () => {
    const recap = generateRecapDraftFromCampaign(sampleCampaign);

    expect(recap.slides.length).toBe(2);
    // Secret entry must be absent
    const hasSecret = recap.slides.some((s) => s.title.includes('Traición Inminente'));
    expect(hasSecret).toBe(false);

    // Corrected entry must be absent
    const hasCorrected = recap.slides.some((s) => s.title.includes('Rumor Falso'));
    expect(hasCorrected).toBe(false);

    // Public entries must be present
    expect(recap.slides[0].title).toBe('El Descubrimiento del Medallón');
    expect(recap.slides[1].title).toBe('Pacto con los Enanos del Valle');
    expect(recap.slides[0].imageUrl).toBe('https://example.com/crypt.jpg');
    expect(recap.slides[1].imageUrl).toBe('https://example.com/tavern.jpg');
  });

  it('2. Navigates slides safely with nextRecapSlide, prevRecapSlide, and goToRecapSlide', () => {
    const recap = generateRecapDraftFromCampaign(sampleCampaign);
    expect(recap.currentSlideIndex).toBe(0);

    // Next slide
    const slide1 = nextRecapSlide(recap);
    expect(slide1.currentSlideIndex).toBe(1);

    // Clamps at max
    const slideClampedMax = nextRecapSlide(slide1);
    expect(slideClampedMax.currentSlideIndex).toBe(1);

    // Prev slide
    const slidePrev = prevRecapSlide(slideClampedMax);
    expect(slidePrev.currentSlideIndex).toBe(0);

    // Clamps at min
    const slideClampedMin = prevRecapSlide(slidePrev);
    expect(slideClampedMin.currentSlideIndex).toBe(0);

    // Direct jump
    const slideDirect = goToRecapSlide(recap, 1);
    expect(slideDirect.currentSlideIndex).toBe(1);
  });

  it('3. Projects and dismisses recap on Mesa preserving underlying scene, audio, and NPCs', () => {
    const recap = generateRecapDraftFromCampaign(sampleCampaign);

    // 1. Project
    const projectResult = reduceDisplayCommand(initialDisplay, createMsg(recap));
    expect(projectResult.success).toBe(true);
    if (projectResult.success) {
      expect(projectResult.nextState.activeRecap).toBeDefined();
      expect(projectResult.nextState.activeRecap?.slides).toHaveLength(2);

      // Verify underlying scene state is completely unharmed
      expect(projectResult.nextState.backgroundUrl).toBe('https://example.com/tavern.jpg');
      expect(projectResult.nextState.characters).toHaveLength(1);
      expect(projectResult.nextState.ambientPlaying).toBe(true);
    }

    // 2. Dismiss
    const stateWithRecap: DisplayState = {
      ...initialDisplay,
      activeRecap: recap,
    };
    const dismissResult = reduceDisplayCommand(stateWithRecap, createMsg(null));
    expect(dismissResult.success).toBe(true);
    if (dismissResult.success) {
      expect(dismissResult.nextState.activeRecap).toBeNull();
      expect(dismissResult.nextState.sceneName).toBe('Taberna del Jabalí Cantor');
    }
  });
});
