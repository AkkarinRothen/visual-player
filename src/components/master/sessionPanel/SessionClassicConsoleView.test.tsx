import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionClassicConsoleView } from './SessionClassicConsoleView';
import type { Campaign, DisplayState } from '../../../types';

describe('SessionClassicConsoleView Suite', () => {
  const dummyState: DisplayState = {
    currentSceneId: 'sc-1',
    sceneName: 'Bosque Antiguo',
    backgroundUrl: 'https://example.com/forest.jpg',
    characters: [],
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: { text: 'Bosque Antiguo', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
    },
  };

  const dummyCampaign: Campaign = {
    id: 'camp-1',
    title: 'Campaña 1',
    createdAt: Date.now(),
    scenes: [
      { id: 'sc-1', name: 'Bosque Antiguo', backgroundUrl: 'https://example.com/forest.jpg' },
      { id: 'sc-2', name: 'Cueva Oscura', backgroundUrl: 'https://example.com/cave.jpg' },
    ],
    characters: [],
    favorites: [],
  };

  it('1. Renderiza el encabezado de modo, la tira Ahora y Después, y las acciones rápidas', () => {
    render(
      <SessionClassicConsoleView
        campaign={dummyCampaign}
        liveState={dummyState}
        activeScene={dummyCampaign.scenes[0]}
        stagedSceneObj={null}
        sceneToDisplayAsNext={dummyCampaign.scenes[1]}
        isStagedSceneDifferent={false}
        operationMode="live"
        pendingChangesCount={0}
        publishStatus="idle"
        lastQuickAction={null}
        recentScenes={[]}
        pastEvents={[]}
        panelCombatRemaining={60}
        currentCombatant={null}
        onToggleOperationMode={vi.fn()}
        onToggleClassicView={vi.fn()}
        handlePublishClick={vi.fn()}
        onOpenSelectivePublish={vi.fn()}
        onDiscardStaged={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBanner={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onQuickActionTriggered={vi.fn()}
        onSwitchToTab={vi.fn()}
        handlePrepareNext={vi.fn()}
        onSelectScene={vi.fn()}
        onExecuteFavorite={vi.fn()}
        onOpenManageFavorites={vi.fn()}
      />
    );

    expect(screen.getByText(/Ahora · En Mesa/i)).toBeDefined();
    expect(screen.getByText(/Después · Preparado/i)).toBeDefined();
    expect(screen.getByText('Acciones rápidas')).toBeDefined();
    expect(screen.getByText('Relámpago')).toBeDefined();
    expect(screen.getByText('Sacudir')).toBeDefined();
    expect(screen.getByText('Cartel')).toBeDefined();
  });

  it('2. Abre y cierra el cajón "Más acciones" al pulsar el botón Más', () => {
    render(
      <SessionClassicConsoleView
        campaign={dummyCampaign}
        liveState={dummyState}
        activeScene={dummyCampaign.scenes[0]}
        stagedSceneObj={null}
        sceneToDisplayAsNext={dummyCampaign.scenes[1]}
        isStagedSceneDifferent={false}
        operationMode="live"
        pendingChangesCount={0}
        publishStatus="idle"
        lastQuickAction={null}
        recentScenes={[]}
        pastEvents={[]}
        panelCombatRemaining={60}
        currentCombatant={null}
        onToggleOperationMode={vi.fn()}
        onToggleClassicView={vi.fn()}
        handlePublishClick={vi.fn()}
        onOpenSelectivePublish={vi.fn()}
        onDiscardStaged={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBanner={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onQuickActionTriggered={vi.fn()}
        onSwitchToTab={vi.fn()}
        handlePrepareNext={vi.fn()}
        onSelectScene={vi.fn()}
        onExecuteFavorite={vi.fn()}
        onOpenManageFavorites={vi.fn()}
      />
    );

    const moreBtn = screen.getByRole('button', { name: /Más/i });
    fireEvent.click(moreBtn);

    expect(screen.getByRole('dialog', { name: /Más acciones/i })).toBeDefined();
    expect(screen.getByText('Iluminación')).toBeDefined();
    expect(screen.getByText('Cámara y escena')).toBeDefined();

    // Cerrar
    const closeBtn = screen.getByLabelText(/Cerrar acciones rápidas/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: /Más acciones/i })).toBeNull();
  });

  it('3. Dispara callbacks de acciones rápidas (Relámpago y Sacudir)', () => {
    const onTriggerLightning = vi.fn();
    const onTriggerShake = vi.fn();
    const onQuickActionTriggered = vi.fn();

    render(
      <SessionClassicConsoleView
        campaign={dummyCampaign}
        liveState={dummyState}
        activeScene={dummyCampaign.scenes[0]}
        stagedSceneObj={null}
        sceneToDisplayAsNext={dummyCampaign.scenes[1]}
        isStagedSceneDifferent={false}
        operationMode="live"
        pendingChangesCount={0}
        publishStatus="idle"
        lastQuickAction={null}
        recentScenes={[]}
        pastEvents={[]}
        panelCombatRemaining={60}
        currentCombatant={null}
        onToggleOperationMode={vi.fn()}
        onToggleClassicView={vi.fn()}
        handlePublishClick={vi.fn()}
        onOpenSelectivePublish={vi.fn()}
        onDiscardStaged={vi.fn()}
        onTriggerLightning={onTriggerLightning}
        onTriggerShake={onTriggerShake}
        onToggleBanner={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onQuickActionTriggered={onQuickActionTriggered}
        onSwitchToTab={vi.fn()}
        handlePrepareNext={vi.fn()}
        onSelectScene={vi.fn()}
        onExecuteFavorite={vi.fn()}
        onOpenManageFavorites={vi.fn()}
      />
    );

    const lightningBtn = screen.getByRole('button', { name: /Relámpago/i });
    fireEvent.click(lightningBtn);
    expect(onTriggerLightning).toHaveBeenCalledTimes(1);
    expect(onQuickActionTriggered).toHaveBeenCalledWith('Relámpago activado');

    const shakeBtn = screen.getByRole('button', { name: /Sacudir/i });
    fireEvent.click(shakeBtn);
    expect(onTriggerShake).toHaveBeenCalledTimes(1);
    expect(onQuickActionTriggered).toHaveBeenCalledWith('Sacudida activada');
  });
});
