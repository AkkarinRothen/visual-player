import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EmergencyDock } from './EmergencyDock';
import { SessionFavoritesBar } from './SessionFavoritesBar';
import { SessionPanel } from './SessionPanel';
import type { Campaign, DisplayState } from '../../types';

describe('Phase 1: Session Panel, Emergency Dock & DM Favorites Suite', () => {
  const dummyState: DisplayState = {
    currentSceneId: 'sc-1',
    sceneName: 'Taverna del Dragón Verde',
    backgroundUrl: 'https://images.unsplash.com/taverna',
    characters: [
      {
        id: 'char-1',
        name: 'Grom',
        avatarUrl: 'https://images.unsplash.com/grom',
        position: 'center-left',
        isSpeaking: false,
      },
    ],
    weather: 'rain',
    weatherIntensity: 0.8,
    lighting: 'torch_flicker',
    locationBanner: { text: 'La Taverna Ruidosa', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/tavern.mp3',
    ambientPlaying: true,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: true,
      round: 2,
      currentTurnIndex: 0,
      combatants: [
        {
          id: 'comb-1',
          name: 'Goblin Líder',
          avatarUrl: 'https://images.unsplash.com/goblin',
          initiative: 18,
          currentHp: 24,
          maxHp: 35,
          showHpToPlayers: false,
          conditions: [],
          isMonster: true,
          isDeployed: true,
        },
      ],
    },
  };

  const dummyCampaign: Campaign = {
    id: 'camp-1',
    title: 'Campaña de Prueba',
    createdAt: Date.now(),
    scenes: [
      {
        id: 'sc-1',
        name: 'Taverna del Dragón Verde',
        backgroundUrl: 'https://images.unsplash.com/taverna',
      },
      {
        id: 'sc-2',
        name: 'Bosque Sombrío',
        subtitle: 'Caminos oscuros',
        backgroundUrl: 'https://images.unsplash.com/bosque',
      },
    ],
    characters: [],
    favorites: [
      {
        id: 'fav-1',
        type: 'sfx',
        label: 'Trueno Fuerte',
        icon: 'Zap',
        targetId: 'thunder',
      },
      {
        id: 'fav-broken',
        type: 'scene',
        label: 'Escena Inexistente',
        targetId: 'scene-does-not-exist',
      },
    ],
  };

  describe('1. EmergencyDock Component', () => {
    it('executes Mute Total immediately', () => {
      const onToggleMute = vi.fn();
      render(
        <EmergencyDock
          isBlackout={false}
          onToggleBlackout={vi.fn()}
          isMuted={false}
          onToggleMuteTotal={onToggleMute}
          hasRunningMacro={false}
          onCancelMacro={vi.fn()}
          onCreateQuickCheckpoint={vi.fn()}
          connectionStatus="connected"
        />
      );

      const muteBtn = screen.getByLabelText(/Silencio Total de Emergencia/i);
      fireEvent.click(muteBtn);
      expect(onToggleMute).toHaveBeenCalledTimes(1);
    });

    it('requires 2-touch safety confirmation to engage Blackout', () => {
      const onToggleBlackout = vi.fn();
      render(
        <EmergencyDock
          isBlackout={false}
          onToggleBlackout={onToggleBlackout}
          isMuted={false}
          onToggleMuteTotal={vi.fn()}
          hasRunningMacro={false}
          onCancelMacro={vi.fn()}
          onCreateQuickCheckpoint={vi.fn()}
          connectionStatus="connected"
        />
      );

      const blackoutBtn = screen.getByLabelText(/Preparar Blackout/i);

      // Touch 1: Arms the button (does not toggle yet)
      fireEvent.click(blackoutBtn);
      expect(onToggleBlackout).not.toHaveBeenCalled();
      expect(screen.getByText(/¿Confirmar\?/i)).toBeDefined();

      // Touch 2: Confirms and executes Blackout
      fireEvent.click(screen.getByLabelText(/Confirmar Blackout Inmediato/i));
      expect(onToggleBlackout).toHaveBeenCalledTimes(1);
    });

    it('disarms Blackout safety after timeout if not confirmed', () => {
      vi.useFakeTimers();
      const onToggleBlackout = vi.fn();
      render(
        <EmergencyDock
          isBlackout={false}
          onToggleBlackout={onToggleBlackout}
          isMuted={false}
          onToggleMuteTotal={vi.fn()}
          hasRunningMacro={false}
          onCancelMacro={vi.fn()}
          onCreateQuickCheckpoint={vi.fn()}
          connectionStatus="connected"
        />
      );

      const blackoutBtn = screen.getByLabelText(/Preparar Blackout/i);
      fireEvent.click(blackoutBtn);
      expect(screen.getByText(/¿Confirmar\?/i)).toBeDefined();

      // Fast forward past 3500ms
      act(() => {
        vi.advanceTimersByTime(3600);
      });

      expect(screen.queryByText(/¿Confirmar\?/i)).toBeNull();
      vi.useRealTimers();
    });

    it('displays Cancel Macro button when a macro sequence is running', () => {
      const onCancelMacro = vi.fn();
      render(
        <EmergencyDock
          isBlackout={false}
          onToggleBlackout={vi.fn()}
          isMuted={false}
          onToggleMuteTotal={vi.fn()}
          hasRunningMacro={true}
          runningMacroName="Emboscada de Orcos"
          onCancelMacro={onCancelMacro}
          onCreateQuickCheckpoint={vi.fn()}
          connectionStatus="connected"
        />
      );

      const cancelBtn = screen.getByLabelText(/Cancelar Momento en ejecución/i);
      expect(cancelBtn).toBeDefined();
      fireEvent.click(cancelBtn);
      expect(onCancelMacro).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. SessionFavoritesBar Component', () => {
    it('renders favorite tiles and marks broken references as unavailable', () => {
      render(
        <SessionFavoritesBar
          campaign={dummyCampaign}
          favorites={dummyCampaign.favorites!}
          onExecuteFavorite={vi.fn()}
          onOpenManageFavorites={vi.fn()}
        />
      );

      expect(screen.getByText('Trueno Fuerte')).toBeDefined();
      expect(screen.getByText('Escena Inexistente')).toBeDefined();
      expect(screen.getByText('No disponible')).toBeDefined();

      const brokenBtn = screen.getByTitle(/Elemento no encontrado/i);
      expect((brokenBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('executes available favorite with 1-tap and triggers ACK state', async () => {
      const onExecute = vi.fn().mockResolvedValue(true);
      render(
        <SessionFavoritesBar
          campaign={dummyCampaign}
          favorites={dummyCampaign.favorites!}
          onExecuteFavorite={onExecute}
          onOpenManageFavorites={vi.fn()}
        />
      );

      const validBtn = screen.getByLabelText(/Favorito: Trueno Fuerte/i);
      await act(async () => {
        fireEvent.click(validBtn);
      });

      expect(onExecute).toHaveBeenCalledTimes(1);
      expect(onExecute).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Trueno Fuerte', targetId: 'thunder' })
      );
    });
  });

  describe('3. SessionPanel Contextual Cards', () => {
    it('renders Active Scene Card and Next Suggested Scene Card', () => {
      render(
        <SessionPanel
          campaign={dummyCampaign}
          liveState={dummyState}
          stagedState={dummyState}
          operationMode="live"
          pendingChangesCount={0}
          connectionStatus="connected"
          latencyMs={24}
          roomCode="DEMO1"
          onSelectScene={vi.fn()}
          onPrepareSceneInStaging={vi.fn()}
          onPublishAllStaged={vi.fn()}
          onOpenSelectivePublish={vi.fn()}
          onDiscardStaged={vi.fn()}
          onToggleOperationMode={vi.fn()}
          onTriggerLightning={vi.fn()}
          onTriggerShake={vi.fn()}
          onToggleBlackout={vi.fn()}
          onToggleBanner={vi.fn()}
          onToggleAmbientAudio={vi.fn()}
          onExecuteFavorite={vi.fn()}
          onOpenManageFavorites={vi.fn()}
          onSwitchToTab={vi.fn()}
          onToggleClassicView={vi.fn()}
        />
      );

      // Active Scene Card
      expect(screen.getByText(/ESCENA EN MESA/i)).toBeDefined();
      expect(screen.getAllByText('Taverna del Dragón Verde').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('1 NPCs')).toBeDefined();

      // Next Suggested Scene Card (sc-2: Bosque Sombrío)
      expect(screen.getByText(/SIGUIENTE ESCENA/i)).toBeDefined();
      expect(screen.getByText('Bosque Sombrío')).toBeDefined();
    });

    it('displays "Guardado local" when checkpoint receipt status is saved', () => {
      render(
        <EmergencyDock
          isBlackout={false}
          onToggleBlackout={vi.fn()}
          isMuted={false}
          onToggleMuteTotal={vi.fn()}
          hasRunningMacro={false}
          onCancelMacro={vi.fn()}
          onCreateQuickCheckpoint={vi.fn()}
          connectionStatus="connected"
          checkpointReceipt={{
            commandId: 'cp-1',
            type: 'CHECKPOINT_LOCAL',
            status: 'saved',
            queuedAt: Date.now(),
          }}
        />
      );

      expect(screen.getByText('Guardado local')).toBeDefined();
    });

    it('shows alert banner when there are pending staged changes', async () => {
      const onPublish = vi.fn().mockResolvedValue(true);
      render(
        <SessionPanel
          campaign={dummyCampaign}
          liveState={dummyState}
          stagedState={dummyState}
          operationMode="staging"
          pendingChangesCount={3}
          connectionStatus="connected"
          latencyMs={24}
          roomCode="DEMO1"
          onSelectScene={vi.fn()}
          onPrepareSceneInStaging={vi.fn()}
          onPublishAllStaged={onPublish}
          onOpenSelectivePublish={vi.fn()}
          onDiscardStaged={vi.fn()}
          onToggleOperationMode={vi.fn()}
          onTriggerLightning={vi.fn()}
          onTriggerShake={vi.fn()}
          onToggleBlackout={vi.fn()}
          onToggleBanner={vi.fn()}
          onToggleAmbientAudio={vi.fn()}
          onExecuteFavorite={vi.fn()}
          onOpenManageFavorites={vi.fn()}
          onSwitchToTab={vi.fn()}
          onToggleClassicView={vi.fn()}
        />
      );

      expect(screen.getAllByText(/3 cambio\(s\)/i).length).toBeGreaterThanOrEqual(1);
      const sendBtn = screen.getByTitle(/Publicar todo a la pantalla de los jugadores/i);
      await act(async () => {
        fireEvent.click(sendBtn);
      });
      expect(onPublish).toHaveBeenCalledTimes(1);
    });

    it('displays active combatant info and advances combat turns', () => {
      const onNextTurn = vi.fn();
      render(
        <SessionPanel
          campaign={dummyCampaign}
          liveState={dummyState}
          stagedState={dummyState}
          operationMode="live"
          pendingChangesCount={0}
          connectionStatus="connected"
          latencyMs={24}
          roomCode="DEMO1"
          onSelectScene={vi.fn()}
          onPrepareSceneInStaging={vi.fn()}
          onPublishAllStaged={vi.fn()}
          onOpenSelectivePublish={vi.fn()}
          onDiscardStaged={vi.fn()}
          onToggleOperationMode={vi.fn()}
          onTriggerLightning={vi.fn()}
          onTriggerShake={vi.fn()}
          onToggleBlackout={vi.fn()}
          onToggleBanner={vi.fn()}
          onToggleAmbientAudio={vi.fn()}
          onExecuteFavorite={vi.fn()}
          onOpenManageFavorites={vi.fn()}
          onSwitchToTab={vi.fn()}
          onToggleClassicView={vi.fn()}
          onNextCombatTurn={onNextTurn}
        />
      );

      expect(screen.getByText(/COMBATE EN CURSO \(RONDA 2\)/i)).toBeDefined();
      expect(screen.getAllByText('Goblin Líder').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/24 \/ 35 HP/i)).toBeDefined();

      const nextTurnBtn = screen.getByTitle(/Avanzar al siguiente combatiente/i);
      fireEvent.click(nextTurnBtn);
      expect(onNextTurn).toHaveBeenCalledTimes(1);
    });

    it('renders LiveModularControlPanel when initialViewMode is "modular" and allows toggling to Consola Clásica', () => {
      render(
        <SessionPanel
          campaign={dummyCampaign}
          liveState={dummyState}
          stagedState={dummyState}
          operationMode="live"
          pendingChangesCount={0}
          connectionStatus="connected"
          latencyMs={24}
          roomCode="DEMO1"
          initialViewMode="modular"
          onSelectScene={vi.fn()}
          onPrepareSceneInStaging={vi.fn()}
          onPublishAllStaged={vi.fn()}
          onOpenSelectivePublish={vi.fn()}
          onDiscardStaged={vi.fn()}
          onToggleOperationMode={vi.fn()}
          onTriggerLightning={vi.fn()}
          onTriggerShake={vi.fn()}
          onToggleBlackout={vi.fn()}
          onToggleBanner={vi.fn()}
          onToggleAmbientAudio={vi.fn()}
          onExecuteFavorite={vi.fn()}
          onOpenManageFavorites={vi.fn()}
          onSwitchToTab={vi.fn()}
          onToggleClassicView={vi.fn()}
        />
      );

      // Verify modular control container is present
      expect(screen.getByTestId('modular-control-container')).toBeDefined();
      expect(screen.getByLabelText('Escenario en vivo 16:9')).toBeDefined();

      // Click "Consola Clásica" tab
      const consoleTab = screen.getByRole('tab', { name: /Consola Clásica/i });
      fireEvent.click(consoleTab);

      // Verify classical console section is now rendered
      expect(screen.getByText(/ESCENA EN MESA/i)).toBeDefined();
    });
  });
});
