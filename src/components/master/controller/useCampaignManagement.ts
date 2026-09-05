import React, { useState } from 'react';
import type {
  Campaign,
  Character,
  CharacterOnScreen,
  CharacterPosition,
  DisplayState,
  SavedEncounter,
  Scene,
  SessionCheckpoint,
} from '../../../types';
import {
  db,
  DEMO_CAMPAIGN,
  DEMO_ENCOUNTERS,
  getAllCampaigns,
  duplicateCampaign,
  deleteCampaign,
  setActiveCampaignId,
  getCampaignCheckpoints,
  getCampaignEncounters,
} from '../../../db';
import { soundEngine } from '../../../services/soundEngine';

export interface UseCampaignManagementOptions {
  campaign: Campaign | null;
  setCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;
  campaignList: Campaign[];
  setCampaignList: React.Dispatch<React.SetStateAction<Campaign[]>>;
  setCheckpointsList: React.Dispatch<React.SetStateAction<SessionCheckpoint[]>>;
  setEncountersList: React.Dispatch<React.SetStateAction<SavedEncounter[]>>;
  activeDisplay: DisplayState;
  updateDisplay: (
    updater: (prev: DisplayState) => DisplayState,
    description: string,
    syncImmediate?: boolean
  ) => void;
  selectScene: (scene: Scene) => void;
  setShowCampaignPickerModal: (show: boolean) => void;
  setShowSummonModal: (show: boolean) => void;
  setEditingScene: (scene: Scene | null) => void;
  setShowNewSceneModal: (show: boolean) => void;
  setEditingChar: (char: Character | null) => void;
  setShowNewCharModal: (show: boolean) => void;
}

export function useCampaignManagement({
  campaign,
  setCampaign,
  campaignList,
  setCampaignList,
  setCheckpointsList,
  setEncountersList,
  activeDisplay,
  updateDisplay,
  selectScene,
  setShowCampaignPickerModal,
  setShowSummonModal,
  setEditingScene,
  setShowNewSceneModal,
  setEditingChar,
  setShowNewCharModal,
}: UseCampaignManagementOptions) {
  const [diceLog, setDiceLog] = useState<{ id: string; text: string; time: string }[]>([]);

  const handleSwitchCampaign = async (selected: Campaign) => {
    setCampaign(selected);
    await setActiveCampaignId(selected.id);
    const cps = await getCampaignCheckpoints(selected.id);
    setCheckpointsList(cps);
    const encs = await getCampaignEncounters(selected.id);
    setEncountersList(encs);
    if (selected.scenes.length > 0) {
      selectScene(selected.scenes[0]);
    }
    setShowCampaignPickerModal(false);
  };

  const handleDuplicateCampaign = async (id: string) => {
    const dup = await duplicateCampaign(id);
    if (dup) {
      const all = await getAllCampaigns();
      setCampaignList(all);
      alert(`¡Campaña "${dup.title}" duplicada con éxito!`);
    }
  };

  const handleDeleteCampaign = async (id: string, title: string) => {
    if (campaignList.length <= 1) {
      alert('Debe existir al menos una campaña.');
      return;
    }
    if (window.confirm(`¿Estás seguro de eliminar permanentemente la campaña "${title}"?`)) {
      await deleteCampaign(id);
      const all = await getAllCampaigns();
      setCampaignList(all);
      if (campaign?.id === id) {
        setCampaign(all[0]);
        selectScene(all[0].scenes[0]);
      }
    }
  };

  const openEditSceneModal = (sc: Scene) => {
    setEditingScene(sc);
    setShowNewSceneModal(true);
  };

  const openEditCharModal = (ch: Character) => {
    setEditingChar(ch);
    setShowNewCharModal(true);
  };

  const summonCharacter = (char: Character) => {
    const positions: CharacterPosition[] = ['left', 'center-left', 'center-right', 'right'];
    const usedPositions = activeDisplay.characters.map((c) => c.position);
    const availablePos = positions.find((p) => !usedPositions.includes(p)) || 'center-left';
    const occupiedX = activeDisplay.characters
      .filter((character) => character.presence !== 'in_reserve')
      .map((character) => character.normalizedX)
      .filter((x): x is number => x !== undefined);
    const spawnCandidates = [50, 35, 65, 20, 80, 10, 90];
    const normalizedX = spawnCandidates.reduce((best, candidate) => {
      const nearestDistance = (x: number) =>
        occupiedX.length === 0 ? 100 : Math.min(...occupiedX.map((occupied) => Math.abs(occupied - x)));
      return nearestDistance(candidate) > nearestDistance(best) ? candidate : best;
    }, spawnCandidates[0]);

    const initialAnchor =
      char.expressionAnchors?.default ??
      char.expressionAnchors?.neutral ??
      (char.expressionAnchors ? Object.values(char.expressionAnchors)[0] : undefined) ??
      0;

    const newOnScreen: CharacterOnScreen = {
      id: `active-${char.id}-${Date.now()}`,
      characterId: char.id,
      name: char.name,
      avatarUrl: char.defaultAvatarUrl,
      position: availablePos,
      normalizedX,
      normalizedY: 0,
      presence: 'on_stage',
      isSpeaking: false,
      visualAnchorOffsetY: initialAnchor,
      instanceVariantAnchors: char.expressionAnchors ? { ...char.expressionAnchors } : undefined,
    };

    updateDisplay(
      (prev) => ({
        ...prev,
        characters: [...prev.characters, newOnScreen],
      }),
      `Invocado ${char.name}`
    );
    setShowSummonModal(false);
  };

  const dismissCharacter = (id: string) => {
    const charName = activeDisplay.characters.find((c) => c.id === id)?.name || 'Personaje';
    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.filter((c) => c.id !== id),
      }),
      `Retirado ${charName}`
    );
  };

  const dismissCharacters = (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.filter((character) => !idSet.has(character.id)),
      }),
      ids.length === 1 ? 'Personaje quitado de la escena' : `${ids.length} personajes quitados de la escena`
    );
  };

  const toggleSpeaking = (id: string) => {
    const char = activeDisplay.characters.find((c) => c.id === id);
    const newSpeaking = !char?.isSpeaking;

    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) => ({
          ...c,
          isSpeaking: c.id === id ? newSpeaking : false,
        })),
      }),
      `${newSpeaking ? 'Foco de voz' : 'Silenciado'}: ${char?.name}`
    );
  };

  const changeCharacterPosition = (id: string, position: CharacterPosition) => {
    const charName = activeDisplay.characters.find((c) => c.id === id)?.name || 'Personaje';
    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) => (c.id === id ? { ...c, position } : c)),
      }),
      `Posición de ${charName} a ${position}`
    );
  };

  const changeCharacterExpression = (id: string, expressionName: string, avatarUrl: string) => {
    const charName = activeDisplay.characters.find((c) => c.id === id)?.name || 'Personaje';
    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) =>
          c.id === id ? { ...c, avatarUrl, activeExpression: expressionName } : c
        ),
      }),
      `Expresión de ${charName}: ${expressionName}`
    );
  };

  const rollDice = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const isCrit = sides === 20 && result === 20;
    const isFumble = sides === 20 && result === 1;

    let text = `d${sides}: ${result}`;
    if (isCrit) text += ' (¡CRÍTICO! ⚔️)';
    if (isFumble) text += ' (¡PIFIA! 💀)';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDiceLog((prev) => [{ id: Math.random().toString(), text, time }, ...prev.slice(0, 15)]);
    soundEngine.playSynth('heartbeat');
  };

  const handleResetDemo = async () => {
    if (window.confirm('¿Restaurar la campaña de demostración inicial?')) {
      await db.campaigns.clear();
      await db.scenes.clear();
      await db.characters.clear();
      await db.encounters.clear();
      await db.campaigns.put(DEMO_CAMPAIGN);
      setCampaign(DEMO_CAMPAIGN);
      const all = await getAllCampaigns();
      setCampaignList(all);
      setEncountersList(DEMO_ENCOUNTERS);
      if (DEMO_CAMPAIGN.scenes.length > 0) {
        selectScene(DEMO_CAMPAIGN.scenes[0]);
      }
    }
  };

  const exportCampaignJSON = () => {
    if (!campaign) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(campaign, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${campaign.title.replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importCampaignJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as Campaign;
          if (parsed.id && parsed.scenes) {
            await db.campaigns.put(parsed);
            setCampaign(parsed);
            const all = await getAllCampaigns();
            setCampaignList(all);
            alert('¡Campaña importada exitosamente!');
          }
        } catch (err) {
          alert('Archivo JSON no válido.');
        }
      };
    }
  };

  return {
    diceLog,
    handleSwitchCampaign,
    handleDuplicateCampaign,
    handleDeleteCampaign,
    openEditSceneModal,
    openEditCharModal,
    summonCharacter,
    dismissCharacter,
    dismissCharacters,
    toggleSpeaking,
    changeCharacterPosition,
    changeCharacterExpression,
    rollDice,
    handleResetDemo,
    exportCampaignJSON,
    importCampaignJSON,
  };
}
