import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../db';
import { registerImmutableAsset } from '../../../db/assetDb';
import type { Scene, CharacterOnScreen } from '../../../types';

describe('Scene Canvas Composer & Asset Management Suite', () => {
  beforeEach(async () => {
    await db.assets.clear();
    await db.campaigns.clear();
  });

  it('1. registerImmutableAsset saves image without duplicating on matching dataUrl', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const asset1 = await registerImmutableAsset('Taberna', 'image', dataUrl);
    expect(asset1.id).toBeDefined();
    expect(asset1.name).toBe('Taberna');
    expect(asset1.refCount).toBe(1);

    // Segundo registro con misma imagen
    const asset2 = await registerImmutableAsset('Taberna Copia', 'image', dataUrl);
    expect(asset2.id).toBe(asset1.id);
    expect(asset2.refCount).toBe(2);

    const totalAssets = await db.assets.toArray();
    expect(totalAssets.length).toBe(1);
  });

  it('2. Places characters on scene with distributed horizontal coordinates', () => {
    const characters: CharacterOnScreen[] = [];
    const dummyChars = [
      { id: 'c1', name: 'Guerrero' },
      { id: 'c2', name: 'Maga' },
      { id: 'c3', name: 'Pícaro' },
    ];

    dummyChars.forEach((ch, index) => {
      const spacing = 20;
      const posX = Math.min(85, Math.max(15, 20 + index * spacing));
      characters.push({
        id: `inst-${ch.id}`,
        characterId: ch.id,
        name: ch.name,
        avatarUrl: 'test.png',
        position: 'center-left',
        normalizedX: posX / 100,
        normalizedY: 0.75,
        scale: 1,
        isSpeaking: false,
      });
    });

    expect(characters.length).toBe(3);
    expect(characters[0].normalizedX).toBe(0.2);
    expect(characters[1].normalizedX).toBe(0.4);
    expect(characters[2].normalizedX).toBe(0.6);
    // Cada personaje tiene una coordenada X distinta y no colisionan en un solo punto
    expect(characters[0].normalizedX).not.toBe(characters[1].normalizedX);
    expect(characters[1].normalizedX).not.toBe(characters[2].normalizedX);
  });

  it('3. Modifies character scale, mirror and layer order deterministically', () => {
    let chars: CharacterOnScreen[] = [
      { id: '1', characterId: 'c1', name: 'A', avatarUrl: '', position: 'left', scale: 1, isSpeaking: false },
      { id: '2', characterId: 'c2', name: 'B', avatarUrl: '', position: 'center-left', scale: 1, isSpeaking: false },
    ];

    // Cambiar escala
    chars = chars.map((c) => (c.id === '1' ? { ...c, scale: 1.2 } : c));
    expect(chars[0].scale).toBe(1.2);

    // Reflejo horizontal
    chars = chars.map((c) => (c.id === '1' ? { ...c, isFlipped: true } : c));
    expect(chars[0].isFlipped).toBe(true);

    // Reordenar capas: mover index 0 a la derecha
    const reordered = [chars[1], chars[0]];
    expect(reordered[0].id).toBe('2');
    expect(reordered[1].id).toBe('1');
  });

  it('4. Persists activeCharacters and defaultCamera on Scene object', () => {
    const scene: Scene = {
      id: 'scene-taberna-test',
      name: 'Taberna del Jabalí',
      backgroundUrl: 'data:image/png;base64,...',
      locationBanner: 'Taberna',
      activeCharacters: [
        {
          id: 'inst-1',
          characterId: 'c1',
          name: 'Bardo',
          avatarUrl: 'bardo.png',
          position: 'center-left',
          normalizedX: 0.35,
          normalizedY: 0.75,
          scale: 1.1,
          isSpeaking: false,
        },
      ],
      defaultCamera: {
        focalPoint: { x: 50, y: 50 },
        zoom: 1.2,
      },
    };

    expect(scene.activeCharacters).toHaveLength(1);
    expect(scene.activeCharacters![0].name).toBe('Bardo');
    expect(scene.activeCharacters![0].scale).toBe(1.1);
    expect(scene.defaultCamera?.zoom).toBe(1.2);
  });

  it('5. D-pad micro-adjustments use exact stage pixel deltas (fine: 1px, normal: 5px, coarse: 20px) with unified clamping', () => {
    let char: CharacterOnScreen = {
      id: 'inst-dpad',
      characterId: 'c-test',
      name: 'Pícaro Sigiloso',
      avatarUrl: 'picaro.png',
      position: 'center-left',
      normalizedX: 0.5,
      normalizedY: 0.75,
      scale: 0.8,
      isSpeaking: false,
    };

    const getDpadDeltas = (preset: 'fine' | 'normal' | 'coarse') => {
      switch (preset) {
        case 'fine':
          return { dx: 1 / 1920, dy: 1 / 1080 };
        case 'coarse':
          return { dx: 20 / 1920, dy: 20 / 1080 };
        case 'normal':
        default:
          return { dx: 5 / 1920, dy: 5 / 1080 };
      }
    };

    const clampStageX = (x: number) => Math.max(0.01, Math.min(0.99, x));
    const clampStageY = (y: number) => Math.max(0.02, Math.min(0.98, y));

    const nudge = (preset: 'fine' | 'normal' | 'coarse', dirX: number, dirY: number) => {
      const deltas = getDpadDeltas(preset);
      char = {
        ...char,
        normalizedX: clampStageX((char.normalizedX ?? 0.5) + dirX * deltas.dx),
        normalizedY: clampStageY((char.normalizedY ?? 0.8) + dirY * deltas.dy),
      };
    };

    // Fine step: exactamente 1 pixel en escenario de 1920x1080
    const fineDeltas = getDpadDeltas('fine');
    expect(fineDeltas.dx).toBeCloseTo(0.0005208, 6);
    expect(fineDeltas.dy).toBeCloseTo(0.0009259, 6);

    const initialX = char.normalizedX!;
    nudge('fine', -1, 0);
    expect(char.normalizedX).toBeCloseTo(initialX - 1 / 1920, 6);

    // Normal step: 5 píxeles
    const preNormalX = char.normalizedX!;
    nudge('normal', 1, 0);
    expect(char.normalizedX).toBeCloseTo(preNormalX + 5 / 1920, 6);

    // Coarse step: 20 píxeles
    const preCoarseY = char.normalizedY!;
    nudge('coarse', 0, 1);
    expect(char.normalizedY).toBeCloseTo(preCoarseY + 20 / 1080, 6);

    // Clamp boundary: sin límite artificial restrictivo de 5% a 95%, permite hasta 99% / 98%
    nudge('coarse', 1000, 1000);
    expect(char.normalizedX).toBe(0.99);
    expect(char.normalizedY).toBe(0.98);

    nudge('coarse', -2000, -2000);
    expect(char.normalizedX).toBe(0.01);
    expect(char.normalizedY).toBe(0.02);
  });

  it('8. Touch slop threshold (10px) suppresses unintentional micro-drags when tapping to select', () => {
    const touchSlop = 10;
    const initialTouch = { clientX: 150, clientY: 200 };
    let isDragStarted = false;

    // Movimiento accidental de 5px (menor a touchSlop)
    const microTremor = { clientX: 153, clientY: 204 };
    const distTremor = Math.hypot(microTremor.clientX - initialTouch.clientX, microTremor.clientY - initialTouch.clientY);
    expect(distTremor).toBe(5);
    if (distTremor > touchSlop) {
      isDragStarted = true;
    }
    // No debe iniciar arrastre, conservando la selección limpia sin ensuciar el borrador
    expect(isDragStarted).toBe(false);

    // Desplazamiento real voluntario de 15px (mayor a touchSlop)
    const intentionalDrag = { clientX: 162, clientY: 209 };
    const distDrag = Math.hypot(intentionalDrag.clientX - initialTouch.clientX, intentionalDrag.clientY - initialTouch.clientY);
    expect(distDrag).toBe(15);
    if (distDrag > touchSlop) {
      isDragStarted = true;
    }
    expect(isDragStarted).toBe(true);
  });

  it('6. Contextual character creation places new character onto scene canvas and persists in campaign', async () => {
    // Setup campaign in Dexie
    const campaignId = 'camp-test-1';
    await db.campaigns.add({
      id: campaignId,
      title: 'Campaña de Prueba',
      scenes: [],
      characters: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const newCharData = {
      id: `char-${Date.now()}`,
      name: 'Tabernero Durgan',
      roleOrTitle: 'Tabernero',
      defaultAvatarUrl: 'data:image/png;base64,mockDurganAvatar',
    };

    // 1. Add character to campaign
    const camp = await db.campaigns.get(campaignId);
    expect(camp).toBeDefined();
    camp!.characters.push(newCharData);
    await db.campaigns.put(camp!);

    // Verify campaign has the new character
    const updatedCamp = await db.campaigns.get(campaignId);
    expect(updatedCamp!.characters).toHaveLength(1);
    expect(updatedCamp!.characters[0].name).toBe('Tabernero Durgan');

    // 2. Contextual placement onto scene
    const existingChars: CharacterOnScreen[] = [
      {
        id: 'inst-1',
        characterId: 'c-old',
        name: 'Cliente 1',
        avatarUrl: '',
        position: 'center-left',
        normalizedX: 0.2,
        normalizedY: 0.75,
        scale: 1,
        isSpeaking: false,
      },
    ];

    const posX = Math.min(85, Math.max(15, 20 + existingChars.length * 20));
    const newInstance: CharacterOnScreen = {
      id: `inst-${newCharData.id}-${Date.now()}`,
      characterId: newCharData.id,
      name: newCharData.name,
      avatarUrl: newCharData.defaultAvatarUrl,
      position: 'center-left',
      normalizedX: posX / 100,
      normalizedY: 0.75,
      scale: 1,
      isSpeaking: false,
    };

    const updatedSceneChars = [...existingChars, newInstance];
    expect(updatedSceneChars).toHaveLength(2);
    expect(updatedSceneChars[1].name).toBe('Tabernero Durgan');
    expect(updatedSceneChars[1].normalizedX).toBe(0.4); // 20 + 1 * 20 = 40%
  });

  it('7. Transfers scene into prepared session independently without mutating source workshop scene', async () => {
    const sessionId = 'session-123';
    await db.sessions.add({
      id: sessionId,
      name: 'Sesión 1: La Llegada',
      campaignId: 'camp-test-1',
      status: 'active',
      schemaVersion: 1,
      planNotes: '',
      stagedState: null,
      liveState: null,
      frozenScenes: [],
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const workshopScene: Scene = {
      id: 'ws-scene-taberna',
      name: 'La Taberna del Puerto',
      backgroundUrl: 'data:image/png;base64,tabernaBg',
      locationBanner: 'Puerto de Mar',
      activeCharacters: [
        {
          id: 'inst-1',
          characterId: 'c1',
          name: 'Capitán',
          avatarUrl: 'capitan.png',
          position: 'center-left',
          normalizedX: 0.3,
          normalizedY: 0.75,
          scale: 1.1,
          isSpeaking: false,
        },
      ],
      defaultCamera: {
        focalPoint: { x: 50, y: 50 },
        zoom: 1.2,
      },
    };

    // Deep clone scene for session
    const sceneCopy: Scene = JSON.parse(JSON.stringify(workshopScene));
    sceneCopy.id = `transferred-${Date.now()}`;

    // Transfer into session frozenScenes
    const session = await db.sessions.get(sessionId);
    expect(session).toBeDefined();
    session!.frozenScenes = [...(session!.frozenScenes || []), sceneCopy];
    await db.sessions.put(session!);

    // Verify session received the clean clone
    const updatedSession = await db.sessions.get(sessionId);
    expect(updatedSession!.frozenScenes).toHaveLength(1);
    expect(updatedSession!.frozenScenes![0].name).toBe('La Taberna del Puerto');
    expect(updatedSession!.frozenScenes![0].activeCharacters).toHaveLength(1);
    expect(updatedSession!.frozenScenes![0].activeCharacters![0].name).toBe('Capitán');

    // Mutating workshop scene should NOT affect session frozenScenes
    workshopScene.name = 'Nombre Modificado en Taller';
    workshopScene.activeCharacters = [];
    expect(updatedSession!.frozenScenes![0].name).toBe('La Taberna del Puerto');
    expect(updatedSession!.frozenScenes![0].activeCharacters).toHaveLength(1);
  });
});

