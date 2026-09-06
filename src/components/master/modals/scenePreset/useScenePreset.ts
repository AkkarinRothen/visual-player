import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  DisplayState,
  SceneCompositionPreset,
  SavedConversation,
  PresetDependencyReport,
  InstantiatePresetOptions,
  GameSession,
} from '../../../../types';
import {
  saveSceneAsCompositionPreset,
  getSceneCompositionPresets,
  instantiateScenePresetIntoSession,
  scanPresetDependencies,
  createSessionCheckpoint,
} from '../../../../db';
import { gameSessionService } from '../../../../services/gameSessionService';
import type { CharacterResolutionMap, ConversationResolutionType } from './scenePresetTypes';

interface UseScenePresetProps {
  isOpen: boolean;
  mode: 'save' | 'insert';
  campaignId: string;
  sessionId?: string;
  stagedState: DisplayState;
  campaignConversations?: SavedConversation[];
  frozenConversations?: SavedConversation[];
  onClose: () => void;
  onPresetSaved?: (preset: SceneCompositionPreset) => void;
  onPresetInstantiated?: (session: GameSession, mode: 'append_scene' | 'replace_staged') => void;
}

export function useScenePreset({
  isOpen,
  mode,
  campaignId,
  sessionId,
  stagedState,
  campaignConversations = [],
  frozenConversations = [],
  onClose,
  onPresetSaved,
  onPresetInstantiated,
}: UseScenePresetProps) {
  // Save State
  const [presetName, setPresetName] = useState(stagedState.sceneName || 'Nueva Composición');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Insert State
  const [presets, setPresets] = useState<SceneCompositionPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dependencyReport, setDependencyReport] = useState<PresetDependencyReport | null>(null);
  const [charResolutions, setCharResolutions] = useState<CharacterResolutionMap>({});
  const [convResolution, setConvResolution] = useState<ConversationResolutionType>('reuse_existing');
  const [isScanning, setIsScanning] = useState(false);
  const [isInstantiating, setIsInstantiating] = useState(false);
  const [confirmReplaceStaged, setConfirmReplaceStaged] = useState(false);

  const selectPresetForInspection = useCallback(async (preset: SceneCompositionPreset) => {
    setSelectedPresetId(preset.id);
    setIsScanning(true);
    try {
      const report = await scanPresetDependencies(preset, campaignId);
      setDependencyReport(report);

      // Default resolutions
      const defaultCharRes: CharacterResolutionMap = {};
      report.characterResolutions.forEach((cr) => {
        defaultCharRes[cr.name] = cr.matchType !== 'none' ? 'reuse_existing' : 'create_copy';
      });
      setCharResolutions(defaultCharRes);

      if (report.conversationResolution?.matchType !== 'none') {
        setConvResolution('reuse_existing');
      } else {
        setConvResolution('create_copy');
      }
    } catch (err) {
      console.error('Error al escanear dependencias del preset:', err);
    } finally {
      setIsScanning(false);
    }
  }, [campaignId]);

  const loadPresets = useCallback(async () => {
    try {
      const all = await getSceneCompositionPresets(campaignId);
      setPresets(all);
      if (all.length > 0 && !selectedPresetId) {
        selectPresetForInspection(all[0]);
      }
    } catch (err) {
      console.error('Error al cargar presets:', err);
    }
  }, [campaignId, selectedPresetId, selectPresetForInspection]);

  // Load presets on open
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'save') {
      setPresetName(stagedState.sceneName || 'Nueva Composición');
      setDescription('');
      setTagsInput('');
      setSelectedConvId('');
      setSaveSuccess(false);
    } else {
      loadPresets();
    }
  }, [isOpen, mode, campaignId, stagedState.sceneName, loadPresets]);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedPresetId) || null,
    [presets, selectedPresetId]
  );

  const filteredPresets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return presets;
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [presets, searchQuery]);

  const allAvailableConversations = useMemo(() => {
    const map = new Map<string, SavedConversation>();
    frozenConversations.forEach((c) => map.set(c.id, c));
    campaignConversations.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [frozenConversations, campaignConversations]);

  // Handle Save
  const handleSave = async () => {
    if (!presetName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const linkedConv = selectedConvId
        ? allAvailableConversations.find((c) => c.id === selectedConvId)
        : undefined;

      const saved = await saveSceneAsCompositionPreset(campaignId, stagedState, presetName.trim(), {
        description: description.trim() || undefined,
        tags,
        linkedConversation: linkedConv,
      });

      setSaveSuccess(true);
      onPresetSaved?.(saved);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error al guardar preset:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Instantiate
  const handleInstantiate = async (insertionMode: 'append_scene' | 'replace_staged') => {
    if (!selectedPreset || isInstantiating) return;
    const targetSessionId = sessionId || gameSessionService.getCurrentSession()?.id;
    if (!targetSessionId) {
      alert('No hay una sesión activa para insertar el preset.');
      return;
    }

    setIsInstantiating(true);
    try {
      // If replacing staged, create automatic checkpoint first
      if (insertionMode === 'replace_staged') {
        await createSessionCheckpoint(
          targetSessionId,
          campaignId,
          `Antes de reemplazar borrador con preset "${selectedPreset.name}"`,
          stagedState,
          'auto',
          'preset_replace'
        );
      }

      // Prepare options
      const options: InstantiatePresetOptions = {
        mode: insertionMode,
        characterResolution: Object.values(charResolutions).includes('create_copy')
          ? 'create_copy'
          : 'reuse_existing',
        conversationResolution: convResolution,
      };

      const updatedSession = await instantiateScenePresetIntoSession(
        targetSessionId,
        selectedPreset.id,
        options
      );

      onPresetInstantiated?.(updatedSession, insertionMode);
      onClose();
    } catch (err) {
      console.error('Error al instanciar preset:', err);
      alert('Error al insertar preset en la sesión.');
    } finally {
      setIsInstantiating(false);
      setConfirmReplaceStaged(false);
    }
  };

  return {
    presetName,
    setPresetName,
    description,
    setDescription,
    tagsInput,
    setTagsInput,
    selectedConvId,
    setSelectedConvId,
    isSaving,
    saveSuccess,
    searchQuery,
    setSearchQuery,
    selectedPresetId,
    selectedPreset,
    filteredPresets,
    dependencyReport,
    charResolutions,
    setCharResolutions,
    convResolution,
    setConvResolution,
    isScanning,
    isInstantiating,
    confirmReplaceStaged,
    setConfirmReplaceStaged,
    allAvailableConversations,
    selectPresetForInspection,
    handleSave,
    handleInstantiate,
  };
}
