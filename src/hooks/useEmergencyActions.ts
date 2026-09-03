import { useState, useCallback } from 'react';
import type { DisplayState, SessionCheckpoint } from '../types';
import { soundEngine } from '../services/soundEngine';
import { sessionCommandBus } from '../services/sessionCommandBus';
import { useCommandReceipt } from './useCommandReceipt';

export interface UseEmergencyActionsOptions {
  isBlackout: boolean;
  updateDisplay: (fn: (prev: DisplayState) => DisplayState, desc: string) => void;
  runningMacro: { macro: { name: string } } | null;
  cancelMacro: (cb: (backup: DisplayState) => void) => void;
  restoreSnapshot: (snapshot: DisplayState, desc: string) => void;
  liveState: DisplayState;
  campaignId: string;
  saveCheckpoint: (cp: SessionCheckpoint) => Promise<void>;
}

export function useEmergencyActions({
  isBlackout,
  updateDisplay,
  runningMacro,
  cancelMacro,
  restoreSnapshot,
  liveState,
  campaignId,
  saveCheckpoint,
}: UseEmergencyActionsOptions) {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeCheckpointCmdId, setActiveCheckpointCmdId] = useState<string | null>(null);
  const [activeMuteCmdId, setActiveMuteCmdId] = useState<string | null>(null);
  const [activeBlackoutCmdId, setActiveBlackoutCmdId] = useState<string | null>(null);

  const checkpointReceipt = useCommandReceipt(activeCheckpointCmdId);
  const muteReceipt = useCommandReceipt(activeMuteCmdId);
  const blackoutReceipt = useCommandReceipt(activeBlackoutCmdId);

  const toggleMuteTotal = useCallback(async () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    updateDisplay((prev) => ({ ...prev, ambientPlaying: !nextMute }), nextMute ? 'Mute Total Activado' : 'Audio Reactivado');

    if (nextMute) {
      if (liveState.ambientAudioUrl) {
        soundEngine.setAmbient(liveState.ambientAudioUrl, false, liveState.ambientVolume, false);
      }
    } else {
      if (liveState.ambientAudioUrl) {
        soundEngine.setAmbient(liveState.ambientAudioUrl, true, liveState.ambientVolume, true);
      }
    }

    const cmdId = sessionCommandBus.dispatchFullState({
      ...liveState,
      ambientPlaying: !nextMute,
    });
    setActiveMuteCmdId(cmdId);
  }, [isMuted, liveState, updateDisplay]);

  const toggleBlackout = useCallback(async () => {
    const next = !isBlackout;
    updateDisplay((prev) => ({ ...prev, isBlackout: next }), next ? 'Blackout Activado' : 'Blackout Desactivado');
    const cmdId = sessionCommandBus.dispatchBlackout(next);
    setActiveBlackoutCmdId(cmdId);
  }, [isBlackout, updateDisplay]);

  const cancelRunningMacro = useCallback(() => {
    if (!runningMacro) return;
    const macroName = runningMacro.macro.name;
    cancelMacro((backup) => {
      restoreSnapshot(backup, `Cancelada macro: ${macroName}`);
    });
  }, [runningMacro, cancelMacro, restoreSnapshot]);

  const createQuickCheckpoint = useCallback(async () => {
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const cmdId = await sessionCommandBus.dispatchLocalCheckpoint(
      `Rápido ${timeLabel}`,
      liveState,
      saveCheckpoint,
      campaignId
    );
    setActiveCheckpointCmdId(cmdId);
  }, [liveState, saveCheckpoint, campaignId]);

  return {
    isMuted,
    toggleMuteTotal,
    isBlackout,
    toggleBlackout,
    hasRunningMacro: !!runningMacro,
    runningMacroName: runningMacro?.macro.name,
    cancelRunningMacro,
    createQuickCheckpoint,
    checkpointReceipt,
    muteReceipt,
    blackoutReceipt,
  };
}
