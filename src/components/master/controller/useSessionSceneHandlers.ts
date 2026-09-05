import React, { useState } from 'react';
import type {
  Campaign,
  Character,
  CharacterOnScreen,
  CinematicDialogue,
  DialogueLineActions,
  DisplayState,
  ElementTransitionDirective,
  HandoutState,
  CampaignRecap,
  SavedConversation,
  SceneLight,
  SceneZoneEmitter,
  SceneInteraction,
  SceneInteractionTransition,
  CampaignKnowledgeEntry,
  CampaignWorldStateEntry,
  SceneVariant,
  SceneSituation,
  SceneLightingPreset,
  LightingApplyMode,
  BiomeSoundProfile,
  SessionPrepDraft,
  SceneProp,
  SceneCompositionPreset,
} from '../../../types';
import { db } from '../../../db';
import { soundEngine } from '../../../services/soundEngine';
import { sessionCommandBus } from '../../../services/sessionCommandBus';
import { findBiomeProfile, resolveBiomeTrackLayer } from '../../../domain/audio/biomeDefaults';
import { resolveAudioTransitionPlan } from '../../../domain/audio/biomeSoundCoordinator';
import { calculateGroupFraming } from '../../../domain/display/cameraFraming';

export interface UseSessionSceneHandlersOptions {
  campaign: Campaign | null;
  setCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;
  liveState: DisplayState;
  activeDisplay: DisplayState;
  sessionRevision: number;
  updateDisplay: (
    updater: (prev: DisplayState) => DisplayState,
    description: string,
    syncImmediate?: boolean
  ) => void;
  setOperationMode: (mode: 'live' | 'staging') => void;
  handleExecuteMacro: (macro: any) => void;
  handleSetCameraTransform: (camera: any, durationMs?: number) => Promise<void>;
  handleResetCamera: () => Promise<void>;
}

export function useSessionSceneHandlers({
  campaign,
  setCampaign,
  liveState,
  activeDisplay,
  sessionRevision,
  updateDisplay,
  setOperationMode,
  handleExecuteMacro,
  handleSetCameraTransform,
  handleResetCamera,
}: UseSessionSceneHandlersOptions) {
  const [executedActionLineIds, setExecutedActionLineIds] = useState<Record<string, string>>({});
  const [selectedChoiceIds, setSelectedChoiceIds] = useState<Record<string, string>>({});
  const [executingInteractionId, setExecutingInteractionId] = useState<string | null>(null);

  const handleSelectSceneVariant = async (variant: SceneVariant) => {
    updateDisplay(
      (prev) => ({
        ...prev,
        backgroundUrl: variant.backgroundUrl,
        activeVariantId: variant.id,
        fitMode: variant.fitMode || prev.fitMode,
        focalPoint: variant.focalPoint || prev.focalPoint,
        zoom: variant.zoom !== undefined ? variant.zoom : prev.zoom,
        lighting: variant.lighting || prev.lighting,
        weather: variant.weather || prev.weather,
        weatherIntensity: variant.weatherIntensity !== undefined ? variant.weatherIntensity : prev.weatherIntensity,
        ambientAudioUrl: variant.ambientAudioUrl || prev.ambientAudioUrl,
        occlusionRegions: variant.occlusionRegions !== undefined ? variant.occlusionRegions : prev.occlusionRegions,
        waypoints: variant.waypoints !== undefined ? variant.waypoints : prev.waypoints,
      }),
      `Variante: "${variant.name}"`,
      true
    );

    const cmdId = sessionCommandBus.dispatchFullState(
      {
        ...activeDisplay,
        backgroundUrl: variant.backgroundUrl,
        activeVariantId: variant.id,
        fitMode: variant.fitMode,
        focalPoint: variant.focalPoint,
        zoom: variant.zoom,
        lighting: variant.lighting || activeDisplay.lighting,
        weather: variant.weather || activeDisplay.weather,
        weatherIntensity: variant.weatherIntensity ?? activeDisplay.weatherIntensity,
        ambientAudioUrl: variant.ambientAudioUrl || activeDisplay.ambientAudioUrl,
        occlusionRegions: variant.occlusionRegions !== undefined ? variant.occlusionRegions : activeDisplay.occlusionRegions,
        waypoints: variant.waypoints !== undefined ? variant.waypoints : activeDisplay.waypoints,
      },
      sessionRevision + 1
    );
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleSelectSituation = async (situation: SceneSituation) => {
    const activeScene = campaign?.scenes?.find((s) => s.id === liveState.currentSceneId);
    const profile = findBiomeProfile(
      campaign?.biomeProfiles,
      activeScene?.biomeProfileId || activeScene?.name?.toLowerCase() || 'tavern'
    );
    if (!profile) return;

    const targetLayer = resolveBiomeTrackLayer(profile, situation);
    const plan = resolveAudioTransitionPlan(
      {
        url: liveState.ambientAudioUrl,
        volume: liveState.ambientVolume,
        playing: liveState.ambientPlaying,
      },
      targetLayer
    );

    if (plan.url) {
      updateDisplay(
        (prev) => ({
          ...prev,
          ambientAudioUrl: plan.url,
          ambientVolume: plan.volume,
          ambientPlaying: true,
          currentSituation: situation,
        }),
        `Tono: ${situation}`
      );
      soundEngine.setAmbient(plan.url, true, plan.volume, plan.crossfade);
    } else {
      updateDisplay(
        (prev) => ({
          ...prev,
          currentSituation: situation,
        }),
        `Tono: ${situation}`
      );
    }
  };

  const handleApplySoundtrack = async (url: string, volume: number, crossfade: boolean) => {
    updateDisplay(
      (prev) => ({
        ...prev,
        ambientAudioUrl: url,
        ambientVolume: volume,
        ambientPlaying: true,
      }),
      'Banda Sonora Aplicada'
    );
    soundEngine.setAmbient(url, true, volume, crossfade);
  };

  const handleSaveBiomeProfiles = async (newProfiles: BiomeSoundProfile[]) => {
    if (!campaign) return;
    const updatedCampaign: Campaign = {
      ...campaign,
      biomeProfiles: newProfiles,
    };
    await db.campaigns.put(updatedCampaign);
    setCampaign(updatedCampaign);
  };

  const handleApplyLightingPreset = async (
    preset: SceneLightingPreset,
    mode: LightingApplyMode,
    newLights: SceneLight[]
  ) => {
    updateDisplay(
      (prev) => ({
        ...prev,
        lights: newLights,
        lighting: preset.lightingFilter || prev.lighting,
      }),
      `Preset Luz: ${preset.name} (${mode === 'replace' ? 'Reemplazado' : 'Combinado'})`
    );
    sessionCommandBus.dispatchSceneLights(newLights);
  };

  const handleSaveLightingPreset = async (newPreset: SceneLightingPreset) => {
    if (!campaign) return;
    const updatedCampaign: Campaign = {
      ...campaign,
      lightingPresets: [...(campaign.lightingPresets || []), newPreset],
    };
    await db.campaigns.put(updatedCampaign);
    setCampaign(updatedCampaign);
  };

  const handleUpdateSceneLights = async (lights: SceneLight[]) => {
    updateDisplay((prev) => ({ ...prev, lights }), `Luces de escena actualizadas (${lights.length})`, true);
    const cmdId = sessionCommandBus.dispatchSceneLights(lights);
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleUpdateZoneEmitters = async (emitters: SceneZoneEmitter[]) => {
    updateDisplay(
      (prev) => ({ ...prev, emitters }),
      `Emisores de ambiente actualizados (${emitters.length})`,
      true
    );
    const cmdId = sessionCommandBus.dispatchZoneEmitters(emitters);
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleSaveCompositorCharacters = async (
    updatedCharacters: CharacterOnScreen[],
    updatedProps: SceneProp[],
    applyDirectlyToLive: boolean,
    transitions?: ElementTransitionDirective[],
    backgroundUrl?: string,
    tacticalGrid?: import('../../../types').TacticalGridConfig
  ) => {
    if (applyDirectlyToLive) {
      updateDisplay(
        (prev) => ({
          ...prev,
          characters: updatedCharacters,
          props: updatedProps,
          backgroundUrl: backgroundUrl || prev.backgroundUrl,
          tacticalGrid: tacticalGrid || prev.tacticalGrid,
          activeTransitions: transitions || prev.activeTransitions,
        }),
        'Composición de personajes y objetos actualizada',
        true
      );
      const cmdId = sessionCommandBus.dispatchFullState(
        {
          ...liveState,
          characters: updatedCharacters,
          props: updatedProps,
          backgroundUrl: backgroundUrl || liveState.backgroundUrl,
          tacticalGrid: tacticalGrid || liveState.tacticalGrid,
          activeTransitions: transitions,
        },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    } else {
      setOperationMode('staging');
      updateDisplay(
        (prev) => ({
          ...prev,
          characters: updatedCharacters,
          props: updatedProps,
          backgroundUrl: backgroundUrl || prev.backgroundUrl,
          tacticalGrid: tacticalGrid || prev.tacticalGrid,
          activeTransitions: transitions || prev.activeTransitions,
        }),
        'Borrador de composición preparado'
      );
    }
  };

  const handleSaveCompositionPreset = async (preset: SceneCompositionPreset) => {
    if (!campaign) return;
    const existing = campaign.savedCompositions || [];
    const updatedCompositions = [...existing.filter((c) => c.id !== preset.id), preset];
    const updatedCampaign: Campaign = {
      ...campaign,
      savedCompositions: updatedCompositions,
      updatedAt: Date.now(),
    };
    await db.campaigns.put(updatedCampaign);
    setCampaign(updatedCampaign);
  };

  const handleUpdateCampaignCharacter = async (
    characterId: string,
    updates: Partial<Character>
  ) => {
    if (!campaign) return;
    const updatedChars = campaign.characters.map((c) =>
      c.id === characterId ? { ...c, ...updates } : c
    );
    const updatedCampaign: Campaign = {
      ...campaign,
      characters: updatedChars,
      updatedAt: Date.now(),
    };
    await db.campaigns.put(updatedCampaign);
    setCampaign(updatedCampaign);
  };

  const executeDialogueActions = async (
    actions: DialogueLineActions,
    lineId: string,
    attempt: number = 1
  ) => {
    setExecutedActionLineIds((prev) => ({
      ...prev,
      [lineId]: `att-${lineId}-${attempt}-${Date.now()}`,
    }));

    // 1. Camera action
    if (actions.cameraPreset) {
      if (actions.cameraPreset === 'general') {
        await handleResetCamera();
      } else if (actions.cameraPreset === 'speaker') {
        const speaking =
          liveState.characters.find((c) => c.isSpeaking) || liveState.characters[0];
        if (speaking) {
          const targetX = speaking.normalizedX ?? 50;
          const targetY = Math.max(25, (speaking.normalizedY ?? 50) - 15);
          await handleSetCameraTransform({ focalPoint: { x: targetX, y: targetY }, zoom: 1.45 });
        }
      } else if (actions.cameraPreset === 'group') {
        if (liveState.characters.length >= 2) {
          const framing = calculateGroupFraming(liveState.characters, {
            hasActiveDialogue: true,
            hasActiveInitiative: !!liveState.combatState?.isActive,
            hasActiveBanner: !!liveState.locationBanner?.visible,
          });
          await handleSetCameraTransform(framing.camera);
        }
      } else if (actions.cameraPreset === 'custom' && actions.customCamera) {
        await handleSetCameraTransform(actions.customCamera);
      }
    }

    // 2. Character expression update
    if (actions.expression) {
      const targetSpeaker =
        liveState.characters.find((c) => c.isSpeaking) || liveState.characters[0];
      if (targetSpeaker) {
        const updatedChars = liveState.characters.map((c) =>
          c.id === targetSpeaker.id ? { ...c, activeExpression: actions.expression } : c
        );
        updateDisplay(
          (prev) => ({ ...prev, characters: updatedChars }),
          `Expresión: ${actions.expression}`,
          true
        );
      }
    }

    // 3. Moment / Macro trigger
    if (actions.momentId && campaign?.macros) {
      const macro = campaign.macros.find((m) => m.id === actions.momentId);
      if (macro) {
        handleExecuteMacro(macro);
      } else {
        console.warn(`[DialogueActions] Momento ${actions.momentId} no encontrado en campaña.`);
      }
    }
  };

  const handlePublishDialogue = async (
    dialogue: CinematicDialogue,
    actions?: DialogueLineActions,
    lineId?: string
  ) => {
    updateDisplay((prev) => ({ ...prev, dialogue }), 'Diálogo en pantalla proyectado', true);
    const cmdId = sessionCommandBus.dispatchDialogue(dialogue);
    await sessionCommandBus.waitForResult(cmdId, 5000);

    if (actions && lineId) {
      const alreadyExecuted = executedActionLineIds[lineId];
      if (!alreadyExecuted) {
        await executeDialogueActions(actions, lineId, 1);
      }
    }
  };

  const handleRepeatDialogueActions = async (actions: DialogueLineActions, lineId: string) => {
    await executeDialogueActions(actions, lineId, Date.now());
  };

  const handleDismissDialogue = async () => {
    updateDisplay((prev) => ({ ...prev, dialogue: null }), 'Diálogo ocultado', true);
    const cmdId = sessionCommandBus.dispatchDismissDialogue();
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleCompleteDialogueText = async () => {
    if (!liveState.dialogue) return;
    const updated = { ...liveState.dialogue, isCompleted: true };
    updateDisplay((prev) => ({ ...prev, dialogue: updated }), 'Texto completado', true);
    const cmdId = sessionCommandBus.dispatchDialogue(updated);
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleSaveConversation = async (conversationToSave: SavedConversation) => {
    if (!campaign) return;
    const existing = campaign.savedConversations || [];
    const updatedConversations = [
      ...existing.filter((c) => c.id !== conversationToSave.id),
      conversationToSave,
    ];
    const updatedCampaign: Campaign = {
      ...campaign,
      savedConversations: updatedConversations,
      updatedAt: Date.now(),
    };
    await db.campaigns.put(updatedCampaign);
    setCampaign(updatedCampaign);
  };

  const handleTriggerInteraction = async (
    interaction: SceneInteraction,
    transition: SceneInteractionTransition
  ) => {
    if (executingInteractionId) return;
    setExecutingInteractionId(transition.id);

    try {
      const updatedInteractions = (liveState.interactions || []).map((i) =>
        i.id === interaction.id ? { ...i, currentState: transition.toState } : i
      );

      let updatedProps = liveState.props || [];
      if (transition.visualStateId && interaction.targetInstanceId) {
        updatedProps = updatedProps.map((p) =>
          p.id === interaction.targetInstanceId
            ? { ...p, visualStateId: transition.visualStateId }
            : p
        );
      }

      let updatedLights = liveState.lights || [];
      if (transition.lightId) {
        updatedLights = updatedLights.map((l) =>
          l.id === transition.lightId
            ? { ...l, visible: transition.toState === 'lit' || transition.toState === 'open' }
            : l
        );
      }

      let updatedEmitters = liveState.emitters || [];
      if (transition.emitterId) {
        updatedEmitters = updatedEmitters.map((e) =>
          e.id === transition.emitterId
            ? { ...e, enabled: transition.toState === 'lit' || transition.toState === 'open' }
            : e
        );
      }

      if ((interaction.scope === 'session' || interaction.scope === 'campaign') && campaign) {
        const existingStates = campaign.interactionStates || {};
        const existingWorld = campaign.worldStateEntries || [];
        const updatedWorld: CampaignWorldStateEntry[] = [
          ...existingWorld.filter((w) => w.id !== interaction.targetInstanceId),
          {
            id: interaction.targetInstanceId,
            targetName: interaction.name,
            state: transition.toState,
            scope: interaction.scope,
            lastModifiedAt: Date.now(),
          },
        ];
        const updatedCampaign: Campaign = {
          ...campaign,
          interactionStates: {
            ...existingStates,
            [interaction.targetInstanceId]: transition.toState,
          },
          worldStateEntries: updatedWorld,
          updatedAt: Date.now(),
        };
        await db.campaigns.put(updatedCampaign);
        setCampaign(updatedCampaign);
      }

      const nextDisplay: DisplayState = {
        ...liveState,
        props: updatedProps,
        lights: updatedLights,
        emitters: updatedEmitters,
        interactions: updatedInteractions,
      };

      updateDisplay(
        () => nextDisplay,
        `Interacción: ${interaction.name} -> ${transition.label}`,
        true
      );
      const cmdId = sessionCommandBus.dispatchFullState(nextDisplay);
      await sessionCommandBus.waitForResult(cmdId, 5000);

      if (transition.sfxPreset || transition.sfxAudioUrl) {
        sessionCommandBus.dispatchSfx(
          transition.sfxPreset || 'interaction',
          transition.sfxAudioUrl,
          transition.label
        );
      }
    } catch (err) {
      console.error('[SceneInteraction] Error executing interaction:', err);
    } finally {
      setExecutingInteractionId(null);
    }
  };

  const handleApplySessionPrepDraft = async (
    draft: SessionPrepDraft,
    preparedState: DisplayState
  ) => {
    setOperationMode('staging');
    updateDisplay(() => preparedState, 'Borrador de sesión preparado en Staging', false);

    if (campaign) {
      const updatedCampaign: Campaign = {
        ...campaign,
        sessionPrepDraft: {
          ...draft,
          status: 'applied',
          updatedAt: Date.now(),
        },
        updatedAt: Date.now(),
      };
      await db.campaigns.put(updatedCampaign);
      setCampaign(updatedCampaign);
    }
  };

  const handleSaveSessionPrepDraft = async (draft: SessionPrepDraft) => {
    if (campaign) {
      const updatedCampaign: Campaign = {
        ...campaign,
        sessionPrepDraft: draft,
        updatedAt: Date.now(),
      };
      await db.campaigns.put(updatedCampaign);
      setCampaign(updatedCampaign);
    }
  };

  const handleProjectHandout = async (handout: HandoutState) => {
    updateDisplay((prev) => ({ ...prev, activeHandout: handout }), `Handout: "${handout.title}" proyectado`, true);
    const cmdId = sessionCommandBus.dispatchActiveHandout(handout);
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleDismissHandout = async () => {
    updateDisplay((prev) => ({ ...prev, activeHandout: null }), 'Handout retirado de la Mesa', true);
    const cmdId = sessionCommandBus.dispatchActiveHandout(null);
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleProjectRecap = async (recap: CampaignRecap) => {
    updateDisplay(
      (prev) => ({ ...prev, activeRecap: recap }),
      `Crónica de apertura proyectada (Diapositiva ${recap.currentSlideIndex + 1})`,
      true
    );
    const cmdId = sessionCommandBus.dispatchActiveRecap(recap);
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleDismissRecap = async () => {
    updateDisplay((prev) => ({ ...prev, activeRecap: null }), 'Crónica de apertura cerrada', true);
    const cmdId = sessionCommandBus.dispatchActiveRecap(null);
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleSaveRecap = async (recap: CampaignRecap) => {
    if (campaign) {
      const updatedCampaign: Campaign = {
        ...campaign,
        savedRecap: recap,
        updatedAt: Date.now(),
      };
      await db.campaigns.put(updatedCampaign);
      setCampaign(updatedCampaign);
    }
  };

  const handleRevealCharacterAppearance = async (instanceId: string) => {
    const updatedChars = liveState.characters.map((c) =>
      c.id === instanceId && c.revelation
        ? {
            ...c,
            revelation: {
              ...c.revelation,
              isAppearanceRevealed: true,
            },
          }
        : c
    );
    updateDisplay((prev) => ({ ...prev, characters: updatedChars }), 'Rostro de personaje revelado', true);

    if (campaign) {
      const existing = campaign.knowledgeEntries || [];
      const target = liveState.characters.find((c) => c.id === instanceId);
      const entryId = `know-app-${instanceId}`;
      if (!existing.some((k) => k.id === entryId)) {
        const newEntry: CampaignKnowledgeEntry = {
          id: entryId,
          type: 'npc_appearance',
          title: `Rostro de ${target?.name || 'Personaje'} revelado`,
          description: `Los jugadores vieron por primera vez la apariencia real de ${target?.name || 'este personaje'}.`,
          targetId: instanceId,
          revealedAt: Date.now(),
          source: 'auto_interaction',
        };
        const updatedCamp: Campaign = {
          ...campaign,
          knowledgeEntries: [newEntry, ...existing],
          updatedAt: Date.now(),
        };
        await db.campaigns.put(updatedCamp);
        setCampaign(updatedCamp);
      }
    }
  };

  const handleRevealCharacterIdentity = async (instanceId: string) => {
    const updatedChars = liveState.characters.map((c) =>
      c.id === instanceId && c.revelation
        ? {
            ...c,
            revelation: {
              ...c.revelation,
              isIdentityRevealed: true,
            },
          }
        : c
    );
    updateDisplay((prev) => ({ ...prev, characters: updatedChars }), 'Identidad de personaje revelada', true);

    if (campaign) {
      const existing = campaign.knowledgeEntries || [];
      const target = liveState.characters.find((c) => c.id === instanceId);
      const entryId = `know-id-${instanceId}`;
      if (!existing.some((k) => k.id === entryId)) {
        const newEntry: CampaignKnowledgeEntry = {
          id: entryId,
          type: 'npc_identity',
          title: `Identidad de ${target?.name || 'Personaje'} revelada`,
          description: `Se reveló el verdadero nombre e identidad de ${target?.name || 'este personaje'}.`,
          targetId: instanceId,
          revealedAt: Date.now(),
          source: 'auto_interaction',
        };
        const updatedCamp: Campaign = {
          ...campaign,
          knowledgeEntries: [newEntry, ...existing],
          updatedAt: Date.now(),
        };
        await db.campaigns.put(updatedCamp);
        setCampaign(updatedCamp);
      }
    }
  };

  return {
    executedActionLineIds,
    selectedChoiceIds,
    setSelectedChoiceIds,
    executingInteractionId,
    handleSelectSceneVariant,
    handleSelectSituation,
    handleApplySoundtrack,
    handleSaveBiomeProfiles,
    handleApplyLightingPreset,
    handleSaveLightingPreset,
    handleUpdateSceneLights,
    handleUpdateZoneEmitters,
    handleSaveCompositorCharacters,
    handleSaveCompositionPreset,
    handleUpdateCampaignCharacter,
    handlePublishDialogue,
    handleRepeatDialogueActions,
    handleDismissDialogue,
    handleCompleteDialogueText,
    handleSaveConversation,
    handleTriggerInteraction,
    handleApplySessionPrepDraft,
    handleSaveSessionPrepDraft,
    handleProjectHandout,
    handleDismissHandout,
    handleProjectRecap,
    handleDismissRecap,
    handleSaveRecap,
    handleRevealCharacterAppearance,
    handleRevealCharacterIdentity,
  };
}
