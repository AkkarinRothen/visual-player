import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LiveQuickSessionView } from './LiveQuickSessionView';
import type { Campaign, DisplayState, Scene } from '../../types';

describe('LiveQuickSessionView Suite (Hoy juego)', () => {
  const mockScene1: Scene = {
    id: 'scene-tavern',
    name: 'Taberna del Dragón',
    backgroundUrl: 'https://example.com/tavern.jpg',
    weather: 'none',
    lighting: 'normal',
  };

  const mockScene2: Scene = {
    id: 'scene-forest',
    name: 'Bosque Sombrío',
    backgroundUrl: 'https://example.com/forest.jpg',
    weather: 'rain',
    lighting: 'night',
  };

  const mockCampaign: Campaign = {
    id: 'camp-1',
    title: 'Campaña Épica',
    createdAt: Date.now(),
    scenes: [mockScene1, mockScene2],
    characters: [],
    macros: [],
    favorites: [
      {
        id: 'fav-1',
        type: 'sfx',
        label: 'Trueno',
        icon: 'Zap',
      },
    ],
  };

  const defaultLiveState: DisplayState = {
    currentSceneId: 'scene-tavern',
    sceneName: 'Taberna del Dragón',
    backgroundUrl: 'https://example.com/tavern.jpg',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: { text: 'Taberna del Dragón', subtitle: '', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: true,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: false,
      round: 1,
      currentTurnIndex: 0,
      combatants: [],
      turnTimerSeconds: 60,
      showTurnTimerToPlayers: true,
    },
  };

  it('1. Renders active live scene, green LIVE badge, and audio/banner pills', () => {
    render(
      <LiveQuickSessionView
        campaign={mockCampaign}
        liveState={defaultLiveState}
        stagedState={defaultLiveState}
        pendingChangesCount={0}
        isConnected={true}
        onSelectScene={vi.fn()}
        onPrepareSceneInStaging={vi.fn()}
        onPublishAllStaged={vi.fn()}
        onDiscardStaged={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBlackout={vi.fn()}
        onToggleBanner={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onExecuteFavorite={vi.fn()}
        onOpenManageFavorites={vi.fn()}
        onStartCombat={vi.fn()}
        onEndCombat={vi.fn()}
        onNextCombatTurn={vi.fn()}
        onPrevCombatTurn={vi.fn()}
        onOpenCombatTab={vi.fn()}
      />
    );

    expect(screen.getByText('En Mesa')).toBeDefined();
    expect(screen.getAllByText('Taberna del Dragón').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cartel: ON')).toBeDefined();
    expect(screen.getByText('Música: ON')).toBeDefined();
  });

  it('2. Clicking on a scene chip in the carousel invokes onPrepareSceneInStaging', () => {
    const onPrepare = vi.fn();
    render(
      <LiveQuickSessionView
        campaign={mockCampaign}
        liveState={defaultLiveState}
        stagedState={defaultLiveState}
        pendingChangesCount={0}
        onSelectScene={vi.fn()}
        onPrepareSceneInStaging={onPrepare}
        onPublishAllStaged={vi.fn()}
        onDiscardStaged={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBlackout={vi.fn()}
        onToggleBanner={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onExecuteFavorite={vi.fn()}
        onOpenManageFavorites={vi.fn()}
        onStartCombat={vi.fn()}
        onEndCombat={vi.fn()}
        onNextCombatTurn={vi.fn()}
        onPrevCombatTurn={vi.fn()}
        onOpenCombatTab={vi.fn()}
      />
    );

    const forestChip = screen.getByTitle('Preparar "Bosque Sombrío"');
    fireEvent.click(forestChip);
    expect(onPrepare).toHaveBeenCalledWith(mockScene2);
  });

  it('3. Clicking the giant publish button triggers onPublishAllStaged when staged changes exist', async () => {
    const onPublish = vi.fn().mockResolvedValue(true);
    const stagedState: DisplayState = {
      ...defaultLiveState,
      currentSceneId: 'scene-forest',
      sceneName: 'Bosque Sombrío',
    };

    render(
      <LiveQuickSessionView
        campaign={mockCampaign}
        liveState={defaultLiveState}
        stagedState={stagedState}
        pendingChangesCount={1}
        onSelectScene={vi.fn()}
        onPrepareSceneInStaging={vi.fn()}
        onPublishAllStaged={onPublish}
        onDiscardStaged={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBlackout={vi.fn()}
        onToggleBanner={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onExecuteFavorite={vi.fn()}
        onOpenManageFavorites={vi.fn()}
        onStartCombat={vi.fn()}
        onEndCombat={vi.fn()}
        onNextCombatTurn={vi.fn()}
        onPrevCombatTurn={vi.fn()}
        onOpenCombatTab={vi.fn()}
      />
    );

    const publishBtn = screen.getByRole('button', { name: /Publicar cambios preparados a la mesa/i });
    await act(async () => {
      fireEvent.click(publishBtn);
    });

    expect(onPublish).toHaveBeenCalled();
  });

  it('4. Emergency blackout requires 2 clicks to confirm and invoke onToggleBlackout', () => {
    const onToggleBlackout = vi.fn();
    render(
      <LiveQuickSessionView
        campaign={mockCampaign}
        liveState={defaultLiveState}
        stagedState={defaultLiveState}
        pendingChangesCount={0}
        onSelectScene={vi.fn()}
        onPrepareSceneInStaging={vi.fn()}
        onPublishAllStaged={vi.fn()}
        onDiscardStaged={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBlackout={onToggleBlackout}
        onToggleBanner={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onExecuteFavorite={vi.fn()}
        onOpenManageFavorites={vi.fn()}
        onStartCombat={vi.fn()}
        onEndCombat={vi.fn()}
        onNextCombatTurn={vi.fn()}
        onPrevCombatTurn={vi.fn()}
        onOpenCombatTab={vi.fn()}
      />
    );

    const blackoutBtn = screen.getByTitle(/Blackout inmediato/i);

    // 1st click: arms blackout
    fireEvent.click(blackoutBtn);
    expect(onToggleBlackout).not.toHaveBeenCalled();
    expect(screen.getByText('¿Confirmar?')).toBeDefined();

    // 2nd click: confirms blackout
    fireEvent.click(blackoutBtn);
    expect(onToggleBlackout).toHaveBeenCalledTimes(1);
  });
});
