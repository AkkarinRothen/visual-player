import React from 'react';
import type {
  Campaign,
  CharacterOnScreen,
  CameraTransform,
  Scene,
  SceneProp,
  SceneOcclusionRegion,
  StageWaypoint,
  DisplayState,
} from '../../../types';
import { db } from '../../../db';
import { sessionCommandBus } from '../../../services/sessionCommandBus';

export interface UseDirectorHandlersOptions {
  operationMode: 'live' | 'staging';
  previewTab: 'live' | 'staged';
  liveState: DisplayState;
  sessionRevision: number;
  currentScene: Scene | null;
  campaign: Campaign | null;
  setCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;
  updateDisplay: (
    fn: (prev: DisplayState) => DisplayState,
    description: string,
    syncImmediate?: boolean
  ) => void;
  handleSetCameraTransform: (camera: CameraTransform, durationMs?: number) => Promise<void>;
}

export function useDirectorHandlers({
  operationMode,
  previewTab,
  liveState,
  sessionRevision,
  currentScene,
  campaign,
  setCampaign,
  updateDisplay,
  handleSetCameraTransform,
}: UseDirectorHandlersOptions) {
  const handleDirectorUpdateCharacter = async (
    characterId: string,
    updates: Partial<CharacterOnScreen>,
    description: string
  ) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';
    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) =>
          c.id === characterId ? { ...c, ...updates } : c
        ),
      }),
      description,
      !isTargetStaged
    );

    if (!isTargetStaged) {
      const nextCharacters = liveState.characters.map((c) =>
        c.id === characterId ? { ...c, ...updates } : c
      );
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, characters: nextCharacters },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  const handleDirectorUpdateMultiplePositions = async (
    updates: { id: string; normalizedX: number; normalizedY: number }[],
    description: string
  ) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';
    const updatesMap = new Map(updates.map((u) => [u.id, u]));

    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) => {
          const u = updatesMap.get(c.id);
          return u ? { ...c, normalizedX: u.normalizedX, normalizedY: u.normalizedY } : c;
        }),
      }),
      description,
      !isTargetStaged
    );

    if (!isTargetStaged) {
      const nextCharacters = liveState.characters.map((c) => {
        const u = updatesMap.get(c.id);
        return u ? { ...c, normalizedX: u.normalizedX, normalizedY: u.normalizedY } : c;
      });
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, characters: nextCharacters },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  const handleDirectorFocusCamera = async (focalX: number, focalY: number) => {
    await handleSetCameraTransform({ focalPoint: { x: focalX, y: focalY }, zoom: 1.35 }, 600);
  };

  const handleSaveCameraPreset = async (name: string, camera: CameraTransform) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';
    const newPreset = { id: `cam-${Date.now()}`, name, camera };
    updateDisplay(
      (prev) => ({
        ...prev,
        savedCameraPresets: [...(prev.savedCameraPresets || []), newPreset],
        camera,
        manualCameraOverride: true,
      }),
      `Guardar encuadre "${name}"`,
      !isTargetStaged
    );

    if (!isTargetStaged) {
      const nextPresets = [...(liveState.savedCameraPresets || []), newPreset];
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, savedCameraPresets: nextPresets, camera, manualCameraOverride: true },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  const handleDirectorReorderLayers = async (
    items: { id: string; type: 'character' | 'prop' | 'occlusion'; zIndex: number }[],
    description: string
  ) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';
    const charZMap = new Map(items.filter((i) => i.type === 'character').map((i) => [i.id, i.zIndex]));
    const propZMap = new Map(items.filter((i) => i.type === 'prop').map((i) => [i.id, i.zIndex]));
    const occZMap = new Map(items.filter((i) => i.type === 'occlusion').map((i) => [i.id, i.zIndex]));

    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) => {
          const newZ = charZMap.get(c.id);
          return newZ !== undefined ? { ...c, zIndex: newZ } : c;
        }),
        props: (prev.props || []).map((p) => {
          const newZ = propZMap.get(p.id);
          return newZ !== undefined ? { ...p, zIndex: newZ } : p;
        }),
        occlusionRegions: (prev.occlusionRegions || []).map((o) => {
          const newZ = occZMap.get(o.id);
          return newZ !== undefined ? { ...o, zIndex: newZ } : o;
        }),
      }),
      description,
      !isTargetStaged
    );

    if (!isTargetStaged) {
      const nextCharacters = liveState.characters.map((c) => {
        const newZ = charZMap.get(c.id);
        return newZ !== undefined ? { ...c, zIndex: newZ } : c;
      });
      const nextProps = (liveState.props || []).map((p) => {
        const newZ = propZMap.get(p.id);
        return newZ !== undefined ? { ...p, zIndex: newZ } : p;
      });
      const nextOcc = (liveState.occlusionRegions || []).map((o) => {
        const newZ = occZMap.get(o.id);
        return newZ !== undefined ? { ...o, zIndex: newZ } : o;
      });
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, characters: nextCharacters, props: nextProps, occlusionRegions: nextOcc },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  const handleDirectorUpdateProp = async (
    propId: string,
    updates: Partial<SceneProp>,
    description: string
  ) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';

    updateDisplay(
      (prev) => ({
        ...prev,
        props: (prev.props || []).map((p) => (p.id === propId ? { ...p, ...updates } : p)),
      }),
      description,
      !isTargetStaged
    );

    if (!isTargetStaged) {
      const nextProps = (liveState.props || []).map((p) => (p.id === propId ? { ...p, ...updates } : p));
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, props: nextProps },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  const handleDirectorSaveWaypoint = async (waypointData: Omit<StageWaypoint, 'id'>) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';
    const newWaypoint: StageWaypoint = {
      ...waypointData,
      id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    updateDisplay(
      (prev) => ({
        ...prev,
        waypoints: [...(prev.waypoints || []), newWaypoint],
      }),
      `Guardar punto narrativo "${newWaypoint.name}"`,
      !isTargetStaged
    );

    if (currentScene && campaign) {
      const updatedScenes = campaign.scenes.map((s) => {
        if (s.id !== currentScene.id) return s;
        return {
          ...s,
          waypoints: [...(s.waypoints || []), newWaypoint],
        };
      });
      const updatedCampaign: Campaign = { ...campaign, scenes: updatedScenes, updatedAt: Date.now() };
      await db.campaigns.put(updatedCampaign);
      setCampaign(updatedCampaign);
    }

    if (!isTargetStaged) {
      const nextWaypoints = [...(liveState.waypoints || []), newWaypoint];
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, waypoints: nextWaypoints },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  const handleDirectorDeleteWaypoint = async (waypointId: string) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';

    updateDisplay(
      (prev) => ({
        ...prev,
        waypoints: (prev.waypoints || []).filter((w) => w.id !== waypointId),
      }),
      `Eliminar punto narrativo`,
      !isTargetStaged
    );

    if (currentScene && campaign) {
      const updatedScenes = campaign.scenes.map((s) => {
        if (s.id !== currentScene.id) return s;
        return {
          ...s,
          waypoints: (s.waypoints || []).filter((w) => w.id !== waypointId),
        };
      });
      const updatedCampaign: Campaign = { ...campaign, scenes: updatedScenes, updatedAt: Date.now() };
      await db.campaigns.put(updatedCampaign);
      setCampaign(updatedCampaign);
    }

    if (!isTargetStaged) {
      const nextWaypoints = (liveState.waypoints || []).filter((w) => w.id !== waypointId);
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, waypoints: nextWaypoints },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  const handleDirectorSaveOcclusionRegion = async (regionData: Omit<SceneOcclusionRegion, 'id'>) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';
    const newRegion: SceneOcclusionRegion = {
      ...regionData,
      id: `occ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    updateDisplay(
      (prev) => ({
        ...prev,
        occlusionRegions: [...(prev.occlusionRegions || []), newRegion],
      }),
      `Crear región de oclusión "${newRegion.name}"`,
      !isTargetStaged
    );

    if (currentScene && campaign) {
      const updatedScenes = campaign.scenes.map((s) => {
        if (s.id !== currentScene.id) return s;
        return {
          ...s,
          occlusionRegions: [...(s.occlusionRegions || []), newRegion],
        };
      });
      const updatedCampaign: Campaign = { ...campaign, scenes: updatedScenes, updatedAt: Date.now() };
      await db.campaigns.put(updatedCampaign);
      setCampaign(updatedCampaign);
    }

    if (!isTargetStaged) {
      const nextRegions = [...(liveState.occlusionRegions || []), newRegion];
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, occlusionRegions: nextRegions },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  const handleDirectorDeleteOcclusionRegion = async (regionId: string) => {
    const isTargetStaged = operationMode === 'staging' && previewTab === 'staged';

    updateDisplay(
      (prev) => ({
        ...prev,
        occlusionRegions: (prev.occlusionRegions || []).filter((r) => r.id !== regionId),
      }),
      `Eliminar región de oclusión`,
      !isTargetStaged
    );

    if (currentScene && campaign) {
      const updatedScenes = campaign.scenes.map((s) => {
        if (s.id !== currentScene.id) return s;
        return {
          ...s,
          occlusionRegions: (s.occlusionRegions || []).filter((r) => r.id !== regionId),
        };
      });
      const updatedCampaign: Campaign = { ...campaign, scenes: updatedScenes, updatedAt: Date.now() };
      await db.campaigns.put(updatedCampaign);
      setCampaign(updatedCampaign);
    }

    if (!isTargetStaged) {
      const nextRegions = (liveState.occlusionRegions || []).filter((r) => r.id !== regionId);
      const cmdId = sessionCommandBus.dispatchFullState(
        { ...liveState, occlusionRegions: nextRegions },
        sessionRevision + 1
      );
      await sessionCommandBus.waitForResult(cmdId, 5000);
    }
  };

  return {
    handleDirectorUpdateCharacter,
    handleDirectorUpdateMultiplePositions,
    handleDirectorFocusCamera,
    handleSaveCameraPreset,
    handleDirectorReorderLayers,
    handleDirectorUpdateProp,
    handleDirectorSaveWaypoint,
    handleDirectorDeleteWaypoint,
    handleDirectorSaveOcclusionRegion,
    handleDirectorDeleteOcclusionRegion,
  };
}
