import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db';
import { normalizeHandoutState } from '../domain/display/handoutNormalizer';
import { reduceDisplayCommand } from '../domain/display/displayCommandReducer';
import type { DisplayState, HandoutState, Campaign } from '../types';
import type { VersionedSyncMessage } from '../domain/protocol/types';

describe('Handouts Multi-Tipo Suite: Imágenes, Mapas con Fog y Documentos Temáticos (Sprint C)', () => {
  beforeEach(async () => {
    await db.campaigns.clear();
    vi.restoreAllMocks();
  });

  const createInitialDisplay = (): DisplayState => ({
    currentSceneId: 'scene-tavern',
    sceneName: 'Taberna del Jabalí Alado',
    backgroundUrl: 'https://images.unsplash.com/photo-tavern.jpg',
    characters: [
      {
        id: 'char-elena',
        name: 'Elena',
        avatarUrl: 'https://images.unsplash.com/elena.png',
        position: 'center',
        isSpeaking: true,
      },
    ],
    weather: 'clear',
    weatherIntensity: 0,
    lighting: 'warm_candle',
    locationBanner: { text: 'Taberna', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/tavern-ambience.mp3',
    ambientPlaying: true,
    ambientVolume: 0.7,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
    activeHandout: null,
  });

  const createSyncMessage = (handout: HandoutState | null): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'msg-handout-sync',
    commandId: 'cmd-handout-sync',
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'critical',
    requiresAck: true,
    type: 'UPDATE_ACTIVE_HANDOUT',
    payload: handout,
  });

  it('1. Normalizes multi-type handouts and infers types correctly', () => {
    // A: Document with text content
    const textDoc: HandoutState = {
      id: 'doc-letter-1',
      title: 'Carta Confidencial de la Corona',
      subtitle: 'Encontrada en el escritorio del Canciller',
      textContent: 'Por orden de Su Majestad, las fronteras quedan selladas al anochecer...',
      theme: 'royal',
      typography: 'medieval',
      authorSeal: '👑 Sello Real de Eldoria',
    };

    const normDoc = normalizeHandoutState(textDoc);
    expect(normDoc.pages).toHaveLength(1);
    expect(normDoc.activePage.type).toBe('document');
    expect(normDoc.activePage.theme).toBe('royal');
    expect(normDoc.activePage.typography).toBe('medieval');
    expect(normDoc.activePage.authorSeal).toBe('👑 Sello Real de Eldoria');
    expect(normDoc.activePage.textContent).toContain('Por orden de Su Majestad');

    // B: Map with fog of war regions
    const mapHandout: HandoutState = {
      id: 'map-catacombs-1',
      title: 'Mapa de las Catacumbas Inferiores',
      imageUrl: 'https://example.com/catacombs-grid.webp',
      revealedRects: [{ id: 'r1', x: 10, y: 15, width: 25, height: 30 }],
      revealedCircles: [{ id: 'c1', cx: 50, cy: 50, r: 8 }],
      isFullyRevealed: false,
    };

    const normMap = normalizeHandoutState(mapHandout);
    expect(normMap.activePage.type).toBe('map');
    expect(normMap.activePage.revealedRects).toHaveLength(1);
    expect(normMap.activePage.revealedCircles).toHaveLength(1);
    expect(normMap.activePage.isFullyRevealed).toBe(false);

    // C: Standard Image handout
    const imageHandout: HandoutState = {
      id: 'img-artifact-1',
      title: 'Amuleto de las Sombras',
      imageUrl: 'https://example.com/amulet.png',
    };

    const normImg = normalizeHandoutState(imageHandout);
    expect(normImg.activePage.type).toBe('image');
    expect(normImg.activePage.imageUrl).toBe('https://example.com/amulet.png');
  });

  it('2. Supports thematic styling, typography, and wax seal customization for documents', () => {
    const grimoireDoc: HandoutState = {
      id: 'doc-grimoire-1',
      title: 'Página Arrancada del Necronomicón',
      subtitle: 'Capítulo IV: La Invocación de las Sombras',
      textContent: 'Klaatu Barada Nikto...',
      theme: 'dark',
      typography: 'medieval',
      authorSeal: '🩸 Sello de Sangre',
      pages: [
        {
          id: 'p-1',
          pageNumber: 1,
          title: 'Invocación Primordial',
          imageUrl: '',
          textContent: 'Las sombras responderán a quien derrame su esencia...',
          theme: 'dark',
          typography: 'medieval',
          authorSeal: '🩸 Sello de Sangre',
          revealedRects: [],
          isFullyRevealed: true,
          zoom: 1.0,
          panOffset: { x: 0, y: 0 },
        },
      ],
    };

    const normalized = normalizeHandoutState(grimoireDoc);
    expect(normalized.activePage.theme).toBe('dark');
    expect(normalized.activePage.typography).toBe('medieval');
    expect(normalized.activePage.authorSeal).toBe('🩸 Sello de Sangre');
    expect(normalized.activePage.textContent).toContain('Las sombras responderán');
  });

  it('3. Persists handouts collection in campaign and supports CRUD operations in IndexedDB', async () => {
    const mockCampaign: Campaign = {
      id: 'camp-handouts-test',
      name: 'Campaña de la Niebla',
      scenes: [],
      characters: [],
      savedHandouts: [
        {
          id: 'h-saved-1',
          title: 'Mapa Antiguo',
          type: 'map',
          imageUrl: 'https://example.com/ancient-map.jpg',
          revealedRects: [],
          revealedCircles: [],
          isFullyRevealed: false,
          zoom: 1.0,
          panOffset: { x: 0, y: 0 },
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.campaigns.put(mockCampaign);

    // Verify initial retrieval
    const retrieved = await db.campaigns.get('camp-handouts-test');
    expect(retrieved?.savedHandouts).toHaveLength(1);
    expect(retrieved?.savedHandouts?.[0].title).toBe('Mapa Antiguo');

    // Add new document handout
    const newDocument: HandoutState = {
      id: 'h-doc-new',
      title: 'Edicto Imperial',
      type: 'document',
      textContent: 'Se convoca a todos los aventureros a la corte...',
      theme: 'royal',
      authorSeal: '⚜️ Sello Real',
    };

    const updatedList = [newDocument, ...(retrieved?.savedHandouts || [])];
    await db.campaigns.update('camp-handouts-test', {
      savedHandouts: updatedList,
      updatedAt: Date.now(),
    });

    const afterAdd = await db.campaigns.get('camp-handouts-test');
    expect(afterAdd?.savedHandouts).toHaveLength(2);
    expect(afterAdd?.savedHandouts?.[0].id).toBe('h-doc-new');
    expect(afterAdd?.savedHandouts?.[0].type).toBe('document');

    // Delete first handout
    const afterDeleteList = (afterAdd?.savedHandouts || []).filter((h) => h.id !== 'h-saved-1');
    await db.campaigns.update('camp-handouts-test', {
      savedHandouts: afterDeleteList,
      updatedAt: Date.now(),
    });

    const finalRetrieved = await db.campaigns.get('camp-handouts-test');
    expect(finalRetrieved?.savedHandouts).toHaveLength(1);
    expect(finalRetrieved?.savedHandouts?.[0].id).toBe('h-doc-new');
  });

  it('4. Projects and dismisses handout on Mesa display state cleanly without collateral effects', () => {
    const initialDisplay = createInitialDisplay();

    const textHandout: HandoutState = {
      id: 'doc-treaty',
      title: 'Tratado de Paz de Cormyr',
      type: 'document',
      textContent: 'Firmado por los delegados de las tres casas...',
      theme: 'parchment',
      authorSeal: '📜 Sello de Cormyr',
    };

    // 1. Project handout
    const projectResult = reduceDisplayCommand(initialDisplay, createSyncMessage(textHandout));
    expect(projectResult.success).toBe(true);
    const projectedDisplay = projectResult.nextState!;

    expect(projectedDisplay.activeHandout).toBeDefined();
    expect(projectedDisplay.activeHandout?.id).toBe('doc-treaty');
    expect(projectedDisplay.activeHandout?.title).toBe('Tratado de Paz de Cormyr');

    // Verify collateral state preservation
    expect(projectedDisplay.currentSceneId).toBe('scene-tavern');
    expect(projectedDisplay.backgroundUrl).toBe('https://images.unsplash.com/photo-tavern.jpg');
    expect(projectedDisplay.characters).toHaveLength(1);
    expect(projectedDisplay.characters[0].name).toBe('Elena');
    expect(projectedDisplay.ambientAudioUrl).toBe('https://example.com/tavern-ambience.mp3');
    expect(projectedDisplay.ambientPlaying).toBe(true);

    // 2. Dismiss handout
    const dismissResult = reduceDisplayCommand(projectedDisplay, createSyncMessage(null));
    expect(dismissResult.success).toBe(true);
    const dismissedDisplay = dismissResult.nextState!;
    expect(dismissedDisplay.activeHandout).toBeNull();
    expect(dismissedDisplay.currentSceneId).toBe('scene-tavern');
    expect(dismissedDisplay.ambientPlaying).toBe(true);
  });

  it('5. Map Handout with Progressive Fog-of-War reveals regions without changing base image', () => {
    const initialDisplay = createInitialDisplay();

    const mapHandout: HandoutState = {
      id: 'map-dungeon-layer',
      title: 'Nivel 1: Criptas',
      type: 'map',
      imageUrl: 'https://example.com/dungeon.png',
      revealedRects: [],
      revealedCircles: [],
      isFullyRevealed: false,
      zoom: 1.0,
      panOffset: { x: 0, y: 0 },
    };

    const initialMapResult = reduceDisplayCommand(initialDisplay, createSyncMessage(mapHandout));
    expect(initialMapResult.success).toBe(true);
    const initialMapDisplay = initialMapResult.nextState!;
    expect(initialMapDisplay.activeHandout?.revealedRects).toHaveLength(0);

    // Reveal entrance room
    const revealedMap: HandoutState = {
      ...mapHandout,
      revealedRects: [{ id: 'rect-entry', x: 20, y: 30, width: 15, height: 15 }],
      revealedCircles: [{ id: 'circle-torch', cx: 27, cy: 37, r: 6 }],
      zoom: 1.25,
      panOffset: { x: 10, y: -5 },
    };

    const updatedResult = reduceDisplayCommand(initialMapDisplay, createSyncMessage(revealedMap));
    expect(updatedResult.success).toBe(true);
    const updatedDisplay = updatedResult.nextState!;
    expect(updatedDisplay.activeHandout?.revealedRects).toHaveLength(1);
    expect(updatedDisplay.activeHandout?.revealedCircles).toHaveLength(1);
    expect(updatedDisplay.activeHandout?.zoom).toBe(1.25);
    expect(updatedDisplay.activeHandout?.panOffset.x).toBe(10);
  });

  it('6. Preserves backward compatibility with legacy single-page handouts', () => {
    const legacyHandout: HandoutState = {
      id: 'h-legacy-single',
      title: 'Boceto Antiguo',
      imageUrl: 'https://example.com/sketch.jpg',
    };

    const normalized = normalizeHandoutState(legacyHandout);
    expect(normalized.pages).toHaveLength(1);
    expect(normalized.activePage.pageNumber).toBe(1);
    expect(normalized.activePage.imageUrl).toBe('https://example.com/sketch.jpg');
    expect(normalized.activePage.type).toBe('image');
    expect(normalized.activePage.zoom).toBe(1.0);
    expect(normalized.activePage.revealedRects).toEqual([]);
    expect(normalized.activePage.revealedCircles).toEqual([]);
  });
});
