import { useState, useEffect, useCallback } from 'react';
import type { Campaign, Scene, GameSession, DisplayState, WeatherType } from '../../../../types';
import { getSessionsByCampaign, createGameSession } from '../../../../db/sessionDb';
import { db } from '../../../../db';
import type { TransferMode, TransferredSessionInfo } from './transferSceneTypes';

interface UseTransferSceneProps {
  scene: Scene | null;
  propCampaign?: Campaign | null;
  currentCampaignId?: string;
  isOpen?: boolean;
  onSuccess?: (targetSessionName: string, mode: TransferMode) => void;
  onTransferred?: (targetSessionName: string, mode: TransferMode) => void;
}

export function useTransferScene({
  scene,
  propCampaign,
  currentCampaignId,
  isOpen = true,
  onSuccess,
  onTransferred,
}: UseTransferSceneProps) {
  const [resolvedCampaign, setResolvedCampaign] = useState<Campaign | null>(propCampaign || null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [transferMode, setTransferMode] = useState<TransferMode>('repertoire');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showNewSessionInput, setShowNewSessionInput] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [transferredSession, setTransferredSession] = useState<TransferredSessionInfo | null>(null);

  // Resolver campaña si solo vino currentCampaignId
  useEffect(() => {
    if (propCampaign) {
      setResolvedCampaign(propCampaign);
    } else if (currentCampaignId) {
      db.campaigns.get(currentCampaignId).then((c) => {
        if (c) setResolvedCampaign(c);
      });
    }
  }, [propCampaign, currentCampaignId]);

  const loadSessions = useCallback(async (campaignId: string) => {
    setIsLoading(true);
    try {
      const list = await getSessionsByCampaign(campaignId);
      const activeList = list.filter((s: GameSession) => !s.isDeleted);
      setSessions(activeList);
      if (activeList.length > 0) {
        setSelectedSessionId(activeList[0].id);
      } else {
        setSelectedSessionId('');
      }
    } catch (err) {
      console.warn('Error cargando sesiones para traslado:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && resolvedCampaign) {
      loadSessions(resolvedCampaign.id);
      setTransferredSession(null);
      setShowNewSessionInput(false);
      setNewSessionTitle('');
    }
  }, [isOpen, resolvedCampaign, loadSessions]);

  const handleCreateNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim() || !resolvedCampaign) return;

    try {
      const created = await createGameSession(resolvedCampaign.id, newSessionTitle.trim());
      await loadSessions(resolvedCampaign.id);
      setSelectedSessionId(created.id);
      setShowNewSessionInput(false);
      setNewSessionTitle('');
    } catch (err) {
      console.error('Error creando nueva preparación:', err);
      alert('No se pudo crear la nueva preparación.');
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedSessionId || !scene) {
      alert('Por favor selecciona una preparación de destino.');
      return;
    }

    setIsTransferring(true);
    try {
      // 1. Obtener la sesión destino desde Dexie
      const targetSession = await db.sessions.get(selectedSessionId);
      if (!targetSession) {
        throw new Error('Sesión no encontrada en la base de datos');
      }

      // 2. Crear copia profunda independiente de la escena
      const sceneCopy: Scene = JSON.parse(JSON.stringify(scene));
      const existingScenes = targetSession.frozenScenes || [];
      const updatedFrozenScenes = existingScenes.some((s) => s.id === sceneCopy.id)
        ? existingScenes.map((s) => (s.id === sceneCopy.id ? sceneCopy : s))
        : [...existingScenes, sceneCopy];

      // 3. Si el modo es 'staging', configurar el borrador de preparación activo
      let updatedStagedState = targetSession.stagedState;
      if (transferMode === 'staging') {
        const baseState: DisplayState = targetSession.stagedState || targetSession.liveState || {
          currentSceneId: sceneCopy.id,
          sceneName: sceneCopy.name,
          backgroundUrl: sceneCopy.backgroundUrl,
          characters: sceneCopy.activeCharacters || [],
          locationBanner: {
            text: sceneCopy.locationBanner || sceneCopy.name,
            subtitle: sceneCopy.subtitle || '',
            visible: !!sceneCopy.locationBanner,
          },
          weather: (sceneCopy.weather && sceneCopy.weather !== 'none' ? sceneCopy.weather : 'clear') as WeatherType,
          weatherIntensity: 1,
          lighting: sceneCopy.lighting || 'normal',
          isBlackout: false,
          shakeTrigger: 0,
          lightningTrigger: 0,
          ambientAudioUrl: sceneCopy.ambientAudioUrl || '',
          ambientPlaying: !!sceneCopy.ambientAudioUrl,
          ambientVolume: 0.8,
          lastSfx: null,
          combatState: {
            isActive: false,
            round: 1,
            currentTurnIndex: 0,
            combatants: [],
          },
        };

        updatedStagedState = {
          ...baseState,
          currentSceneId: sceneCopy.id,
          sceneName: sceneCopy.name,
          backgroundUrl: sceneCopy.backgroundUrl,
          characters: sceneCopy.activeCharacters || [],
          locationBanner: {
            text: sceneCopy.locationBanner || sceneCopy.name,
            subtitle: sceneCopy.subtitle || '',
            visible: true,
          },
          weather: (sceneCopy.weather && sceneCopy.weather !== 'none' ? sceneCopy.weather : baseState.weather) as WeatherType,
          lighting: sceneCopy.lighting || baseState.lighting,
          ambientAudioUrl: sceneCopy.ambientAudioUrl || baseState.ambientAudioUrl,
          ambientPlaying: !!sceneCopy.ambientAudioUrl,
        };
      }

      // 4. Guardar transaccionalmente en Dexie
      await db.transaction('rw', db.sessions, async () => {
        await db.sessions.update(selectedSessionId, {
          frozenScenes: updatedFrozenScenes,
          ...(transferMode === 'staging' ? { stagedState: updatedStagedState } : {}),
          revision: (targetSession.revision || 1) + 1,
          updatedAt: Date.now(),
        });
      });

      // 5. Estado de éxito
      setTransferredSession({
        id: targetSession.id,
        name: targetSession.name,
        mode: transferMode,
      });

      onSuccess?.(targetSession.name, transferMode);
      onTransferred?.(targetSession.name, transferMode);
    } catch (err) {
      console.error('Error al transferir escena a sesión:', err);
      alert('Hubo un error al trasladar la escena a la preparación.');
    } finally {
      setIsTransferring(false);
    }
  };

  return {
    resolvedCampaign,
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    transferMode,
    setTransferMode,
    isLoading,
    isTransferring,
    showNewSessionInput,
    setShowNewSessionInput,
    newSessionTitle,
    setNewSessionTitle,
    transferredSession,
    handleCreateNewSession,
    handleConfirmTransfer,
  };
}
