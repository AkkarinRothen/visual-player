import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db';
import {
  saveCheckpoint,
  getLatestCheckpoints,
  cleanOldAutoCheckpoints,
  createSessionCheckpoint,
  deleteCheckpoint,
} from '../db/checkpointDb';
import type { DisplayState, SessionCheckpoint } from '../types';
import { soundEngine } from './soundEngine';
import { useCombatCoordinator } from '../components/master/controller/useCombatCoordinator';

describe('Session Checkpoints & Full State Restore Suite (Sprint B)', () => {
  beforeEach(async () => {
    await db.checkpoints.clear();
    vi.restoreAllMocks();
  });

  const createMockFullState = (overrides?: Partial<DisplayState>): DisplayState => ({
    currentSceneId: 'scene-crypt',
    sceneName: 'Cripta de los Antiguos',
    backgroundUrl: 'https://images.unsplash.com/photo-crypt.jpg',
    characters: [
      {
        id: 'c-valeros',
        name: 'Valeros el Guerrero',
        avatarUrl: 'https://images.unsplash.com/valeros.png',
        position: 'center',
        normalizedX: 45,
        normalizedY: 55,
        isSpeaking: true,
        activeExpression: 'angry',
        statusBadge: 'En guardia',
      },
      {
        id: 'c-merisiel',
        name: 'Merisiel la Pícara',
        avatarUrl: 'https://images.unsplash.com/merisiel.png',
        position: 'left',
        normalizedX: 20,
        normalizedY: 60,
        isSpeaking: false,
        activeExpression: 'neutral',
      },
    ],
    weather: 'rain',
    weatherIntensity: 0.8,
    lighting: 'dark',
    locationBanner: {
      text: 'Cripta Olvidada',
      subtitle: 'Nivel 2',
      visible: true,
    },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://cdn.example.com/audio/dungeon_ambience.mp3',
    ambientPlaying: true,
    ambientVolume: 0.75,
    lastSfx: null,
    combatState: {
      isActive: true,
      round: 3,
      currentTurnIndex: 1,
      turnTimerSeconds: 60,
      showTurnTimerToPlayers: true,
      combatants: [
        {
          id: 'cb-valeros',
          characterId: 'c-valeros',
          name: 'Valeros',
          avatarUrl: 'https://images.unsplash.com/valeros.png',
          initiative: 18,
          currentHp: 28,
          maxHp: 45,
          showHpToPlayers: true,
          isMonster: false,
          isDeployed: true,
          conditions: ['blessed'],
        },
        {
          id: 'cb-lich',
          name: 'Señor del Sudario',
          avatarUrl: 'https://images.unsplash.com/lich.png',
          initiative: 14,
          currentHp: 65,
          maxHp: 120,
          showHpToPlayers: false,
          isMonster: true,
          isDeployed: true,
          conditions: ['invisible', 'poisoned'],
        },
      ],
    },
    ...overrides,
  });

  it('1. Persists complete DisplayState including combatants, HP, conditions and active music', async () => {
    const fullState = createMockFullState();
    const cp: SessionCheckpoint = {
      id: 'cp-manual-test-1',
      campaignId: 'camp-123',
      name: 'Punto antes del combate con el Lich',
      type: 'manual',
      trigger: 'Manual',
      createdAt: Date.now(),
      state: fullState,
    };

    await saveCheckpoint(cp);

    const saved = await db.checkpoints.get('cp-manual-test-1');
    expect(saved).toBeDefined();
    expect(saved?.name).toBe('Punto antes del combate con el Lich');
    expect(saved?.state.sceneName).toBe('Cripta de los Antiguos');
    expect(saved?.state.characters.length).toBe(2);
    expect(saved?.state.characters[0].normalizedX).toBe(45);
    expect(saved?.state.characters[0].activeExpression).toBe('angry');

    // Combat state check
    expect(saved?.state.combatState?.isActive).toBe(true);
    expect(saved?.state.combatState?.round).toBe(3);
    expect(saved?.state.combatState?.currentTurnIndex).toBe(1);
    expect(saved?.state.combatState?.combatants.length).toBe(2);
    expect(saved?.state.combatState?.combatants[1].name).toBe('Señor del Sudario');
    expect(saved?.state.combatState?.combatants[1].currentHp).toBe(65);
    expect(saved?.state.combatState?.combatants[1].conditions).toContain('invisible');

    // Music check
    expect(saved?.state.ambientAudioUrl).toBe('https://cdn.example.com/audio/dungeon_ambience.mp3');
    expect(saved?.state.ambientPlaying).toBe(true);
    expect(saved?.state.ambientVolume).toBe(0.75);
  });

  it('2. getLatestCheckpoints returns top N checkpoints sorted by reverse chronological order', async () => {
    const baseTime = 1700000000000;
    for (let i = 1; i <= 8; i++) {
      const cp: SessionCheckpoint = {
        id: `cp-item-${i}`,
        campaignId: 'camp-test',
        name: `Checkpoint #${i}`,
        type: i % 2 === 0 ? 'auto' : 'manual',
        trigger: 'Test',
        createdAt: baseTime + i * 1000,
        state: createMockFullState({ sceneName: `Escena ${i}` }),
      };
      await db.checkpoints.put(cp);
    }

    const latest5 = await getLatestCheckpoints(5);
    expect(latest5.length).toBe(5);
    expect(latest5[0].id).toBe('cp-item-8');
    expect(latest5[1].id).toBe('cp-item-7');
    expect(latest5[2].id).toBe('cp-item-6');
    expect(latest5[3].id).toBe('cp-item-5');
    expect(latest5[4].id).toBe('cp-item-4');
  });

  it('3. cleanOldAutoCheckpoints prunes auto-checkpoints to limit of 5 and preserves manual ones', async () => {
    const baseTime = Date.now();
    // Insert 2 manual checkpoints
    await db.checkpoints.put({
      id: 'cp-man-1',
      campaignId: 'camp-limit',
      name: 'Manual 1',
      type: 'manual',
      trigger: 'Manual',
      createdAt: baseTime - 10000,
      state: createMockFullState(),
    });
    await db.checkpoints.put({
      id: 'cp-man-2',
      campaignId: 'camp-limit',
      name: 'Manual 2',
      type: 'manual',
      trigger: 'Manual',
      createdAt: baseTime - 9000,
      state: createMockFullState(),
    });

    // Insert 8 auto checkpoints sequentially
    for (let i = 1; i <= 8; i++) {
      await saveCheckpoint({
        id: `cp-auto-${i}`,
        campaignId: 'camp-limit',
        name: `Auto Turno ${i}`,
        type: 'auto',
        trigger: `Turno ${i}`,
        createdAt: baseTime + i * 100,
        state: createMockFullState(),
      });
    }

    const allInDb = await db.checkpoints.where('campaignId').equals('camp-limit').toArray();
    const manuals = allInDb.filter((c) => c.type === 'manual');
    const autos = allInDb.filter((c) => c.type === 'auto');

    // Both manuals must be preserved
    expect(manuals.length).toBe(2);

    // Autos must be trimmed down to 5
    expect(autos.length).toBe(5);

    // The oldest autos (1, 2, 3) must have been deleted; 4, 5, 6, 7, 8 kept
    const autoIds = autos.map((a) => a.id);
    expect(autoIds).not.toContain('cp-auto-1');
    expect(autoIds).not.toContain('cp-auto-2');
    expect(autoIds).not.toContain('cp-auto-3');
    expect(autoIds).toContain('cp-auto-8');
  });

  it('4. createSessionCheckpoint correctly assigns unique ID, timestamp and deep cloned state', async () => {
    const state = createMockFullState();
    const created = await createSessionCheckpoint(
      'sess-alpha',
      'camp-alpha',
      'Punto de Prueba',
      state,
      'manual',
      'Snapshot'
    );

    expect(created.id.startsWith('cp')).toBe(true);
    expect(created.sessionId).toBe('sess-alpha');
    expect(created.campaignId).toBe('camp-alpha');
    expect(created.state.characters[0].name).toBe('Valeros el Guerrero');

    // Ensure deep clone so modifying source does not mutate stored checkpoint
    state.characters[0].name = 'Mutated Name';
    const fetched = await db.checkpoints.get(created.id);
    expect(fetched?.state.characters[0].name).toBe('Valeros el Guerrero');
  });

  it('5. Ambient music resumption triggers soundEngine.setAmbient correctly', () => {
    const setAmbientSpy = vi.spyOn(soundEngine, 'setAmbient').mockImplementation(() => {});
    const stateWithMusic = createMockFullState({
      ambientAudioUrl: 'https://stream.example.com/boss.mp3',
      ambientPlaying: true,
      ambientVolume: 0.85,
    });

    if (stateWithMusic.ambientAudioUrl && stateWithMusic.ambientPlaying) {
      soundEngine.setAmbient(
        stateWithMusic.ambientAudioUrl,
        true,
        stateWithMusic.ambientVolume ?? 0.5,
        true
      );
    }

    expect(setAmbientSpy).toHaveBeenCalledWith(
      'https://stream.example.com/boss.mp3',
      true,
      0.85,
      true
    );
  });

  it('6. useCombatCoordinator triggers onCombatTurnAdvanced callback on next turn', () => {
    const onCombatTurnAdvanced = vi.fn();
    const updateDisplay = vi.fn();
    const handleSetCameraTransform = vi.fn().mockResolvedValue(undefined);

    const liveState = createMockFullState({
      combatState: {
        isActive: true,
        round: 1,
        currentTurnIndex: 0,
        turnTimerSeconds: 60,
        combatants: [
          {
            id: 'c1',
            name: 'Guerrero',
            initiative: 20,
            currentHp: 30,
            maxHp: 30,
            isDeployed: true,
          },
          {
            id: 'c2',
            name: 'Orco',
            initiative: 12,
            currentHp: 15,
            maxHp: 15,
            isDeployed: true,
          },
        ],
      },
    });

    // coordinator instance
    const coordinator = useCombatCoordinator({
      liveState,
      updateDisplay,
      handleSetCameraTransform,
      onCombatTurnAdvanced,
    });

    coordinator.handleNextCombatTurn();

    expect(onCombatTurnAdvanced).toHaveBeenCalledTimes(1);
    const [desc, nextState] = onCombatTurnAdvanced.mock.calls[0];
    expect(desc).toContain('Turno: Ronda 1 - Turno 2 (Orco)');
    expect(nextState.combatState.currentTurnIndex).toBe(1);
    expect(nextState.combatState.round).toBe(1);
  });

  it('7. useCombatCoordinator advances to next round and triggers callback on last combatant', () => {
    const onCombatTurnAdvanced = vi.fn();
    const updateDisplay = vi.fn();
    const handleSetCameraTransform = vi.fn().mockResolvedValue(undefined);

    const liveState = createMockFullState({
      combatState: {
        isActive: true,
        round: 1,
        currentTurnIndex: 1, // On last combatant
        turnTimerSeconds: 60,
        combatants: [
          {
            id: 'c1',
            name: 'Guerrero',
            initiative: 20,
            currentHp: 30,
            maxHp: 30,
            isDeployed: true,
          },
          {
            id: 'c2',
            name: 'Orco',
            initiative: 12,
            currentHp: 15,
            maxHp: 15,
            isDeployed: true,
          },
        ],
      },
    });

    const coordinator = useCombatCoordinator({
      liveState,
      updateDisplay,
      handleSetCameraTransform,
      onCombatTurnAdvanced,
    });

    coordinator.handleNextCombatTurn();

    expect(onCombatTurnAdvanced).toHaveBeenCalledTimes(1);
    const [desc, nextState] = onCombatTurnAdvanced.mock.calls[0];
    expect(desc).toContain('Turno: Ronda 2 - Turno 1 (Guerrero)');
    expect(nextState.combatState.currentTurnIndex).toBe(0);
    expect(nextState.combatState.round).toBe(2);
  });
});
