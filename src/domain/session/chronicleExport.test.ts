import { describe, it, expect } from 'vitest';
import type { Campaign, DisplayState, PublicChronicleDraft } from '../../types';
import {
  generatePublicChronicleDraft,
  formatChronicleToMarkdown,
  sanitizeExportText,
} from './chronicleExportGenerator';

describe('Session Chronicle Exporter & Allow-List Projection Suite', () => {
  const sampleCampaign: Campaign = {
    id: 'camp-shadows-eldoria',
    title: 'Sombras sobre Eldoria',
    description: 'Una campaña de intriga, magia arcana y supervivencia en los reinos olvidados.',
    createdAt: Date.now(),
    scenes: [],
    characters: [],
    knowledgeEntries: [
      {
        id: 'know-1',
        type: 'clue',
        title: 'El Sello de las Sombras',
        description: 'Un antiguo glifo rúnico que bloquea la entrada a la cripta inferior.',
        revealedAt: Date.now() - 10000,
        source: 'manual_dm',
        isCorrected: false,
      },
      {
        id: 'know-corrected-secret',
        type: 'secret',
        title: 'Boceto Falso de Herejía',
        description: 'Dato preliminar corregido que NO debe salir a la luz pública.',
        revealedAt: Date.now() - 5000,
        source: 'manual_dm',
        isCorrected: true, // MUST BE EXCLUDED!
      },
    ],
    worldStateEntries: [
      {
        id: 'ws-1',
        targetName: 'Tensión en la Ciudadela',
        state: 'Elevada tras la huida del emisario',
        scope: 'campaign',
        lastModifiedAt: Date.now(),
      },
    ],
    sessionPrepDraft: {
      id: 'prep-1',
      campaignId: 'camp-shadows-eldoria',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      selectedSceneId: 'sc-1',
      suggestedReason: 'Continuación',
      worldChoices: {},
      resetTemporaryWeather: true,
      resetTemporaryCombat: true,
      dmSessionGoals: 'Encontrar la llave de obsidiana en el claustro',
      status: 'ready',
    },
    savedRecap: {
      id: 'recap-1',
      title: 'Recap Anterior',
      currentSlideIndex: 0,
      slides: [
        {
          id: 'slide-1',
          title: 'El Asalto al Puente Viejo',
          text: 'Combate en el puente',
          imageUrl: 'https://example.com/bridge.jpg',
          caption: 'Los aventureros repelieron a la vanguardia de cultistas protegiendo la caravana.',
        },
      ],
    },
  };

  const sampleLiveState: DisplayState = {
    currentSceneId: 'sc-crypt',
    sceneName: 'Cripta Olvidada',
    backgroundUrl: 'https://example.com/crypt.jpg',
    characters: [],
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'night',
    locationBanner: { text: 'Cripta', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/ambient.mp3',
    ambientPlaying: true,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
  };

  it('1. Generates public chronicle draft using strictly allowed public fields and excludes secrets', () => {
    const draft = generatePublicChronicleDraft(sampleCampaign, sampleLiveState);

    expect(draft.campaignTitle).toBe('Sombras sobre Eldoria');
    expect(draft.title).toContain('Sombras sobre Eldoria');
    expect(draft.keyMilestones.length).toBeGreaterThan(0);
    expect(draft.keyMilestones[0]).toContain('El Asalto al Puente Viejo');

    // Must include confirmed uncorrected knowledge
    expect(draft.publicKnowledgeEntries).toHaveLength(1);
    expect(draft.publicKnowledgeEntries[0].title).toBe('El Sello de las Sombras');

    // Must strictly EXCLUDE corrected or private items
    expect(
      draft.publicKnowledgeEntries.some((k) => k.title.includes('Boceto Falso'))
    ).toBe(false);

    // Must include active objectives
    expect(draft.activeQuestsOrObjectives).toContain(
      'Encontrar la llave de obsidiana en el claustro'
    );
  }, 15000);

  it('2. Formats draft into portable, clean Markdown with metadata and checklists', () => {
    const draft: PublicChronicleDraft = {
      title: 'Crónica de la Cuarta Sesión',
      campaignTitle: 'Sombras sobre Eldoria',
      sessionDateLabel: '02 de septiembre de 2026',
      generatedAt: Date.now(),
      synopsis: 'Los héroes sellaron la cripta tras una intensa batalla.',
      keyMilestones: ['Victoria contra los cultistas en el claustro.'],
      publicKnowledgeEntries: [
        {
          id: 'k1',
          title: 'El Sello Arcano',
          category: 'Magia',
          summary: 'Requiere la flor de medianoche para disolverse.',
        },
      ],
      activeQuestsOrObjectives: ['Viajar a las Colinas del Viento.'],
      dmClosingNotes: 'Subid a nivel 5 para la próxima semana.',
    };

    const md = formatChronicleToMarkdown(draft);

    expect(md).toContain('# Crónica de la Cuarta Sesión');
    expect(md).toContain('> **Campaña:** Sombras sobre Eldoria');
    expect(md).toContain('## 📖 Sinopsis de la Sesión');
    expect(md).toContain('Los héroes sellaron la cripta tras una intensa batalla.');
    expect(md).toContain('## ⚔️ Hitos y Acontecimientos Clave');
    expect(md).toContain('- Victoria contra los cultistas en el claustro.');
    expect(md).toContain('### 🔹 El Sello Arcano *(Magia)*');
    expect(md).toContain('## 🎯 Objetivos y Próximos Pasos');
    expect(md).toContain('- [ ] Viajar a las Colinas del Viento.');
    expect(md).toContain('*Subid a nivel 5 para la próxima semana.*');
  });

  it('3. Guarantees editorial separation without mutating the original campaign', () => {
    const initialKnowledgeCount = sampleCampaign.knowledgeEntries?.length;
    const initialTitle = sampleCampaign.title;

    const draft = generatePublicChronicleDraft(sampleCampaign, sampleLiveState);

    // Edit the draft heavily
    draft.title = 'Título completamente editado por el DM';
    draft.keyMilestones.push('Hito adicional improvisado');
    draft.synopsis = 'Nueva sinopsis redactada manualmente';
    draft.publicKnowledgeEntries = [];

    // Verify original campaign remained 100% immutable
    expect(sampleCampaign.title).toBe(initialTitle);
    expect(sampleCampaign.knowledgeEntries?.length).toBe(initialKnowledgeCount);
    expect(sampleCampaign.knowledgeEntries?.[0].title).toBe('El Sello de las Sombras');
  });

  it('4. Sanitizes raw scripts and dangerous content from export text', () => {
    const raw = '  <script>alert("hacked")</script> Relato seguro de la sesión  ';
    const clean = sanitizeExportText(raw);
    expect(clean).toBe('Relato seguro de la sesión');
    expect(clean).not.toContain('<script>');
  });
});
