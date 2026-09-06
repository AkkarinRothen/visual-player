import type {
  DisplayState,
  SceneCompositionPreset,
  SavedConversation,
  PresetDependencyReport,
  GameSession,
} from '../../../../types';

export type CharacterResolutionMap = Record<string, 'reuse_existing' | 'create_copy'>;
export type ConversationResolutionType = 'reuse_existing' | 'create_copy';

export interface ScenePresetModalProps {
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

export interface ScenePresetHeaderProps {
  mode: 'save' | 'insert';
  onClose: () => void;
}

export interface ScenePresetSaveViewProps {
  stagedState: DisplayState;
  presetName: string;
  setPresetName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  tagsInput: string;
  setTagsInput: (tags: string) => void;
  selectedConvId: string;
  setSelectedConvId: (id: string) => void;
  allAvailableConversations: SavedConversation[];
}

export interface ScenePresetListColumnProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredPresets: SceneCompositionPreset[];
  selectedPresetId: string | null;
  onSelectPreset: (preset: SceneCompositionPreset) => void;
}

export interface ScenePresetDetailColumnProps {
  selectedPreset: SceneCompositionPreset | null;
  isScanning: boolean;
  dependencyReport: PresetDependencyReport | null;
  charResolutions: CharacterResolutionMap;
  setCharResolutions: React.Dispatch<React.SetStateAction<CharacterResolutionMap>>;
  convResolution: ConversationResolutionType;
  setConvResolution: React.Dispatch<React.SetStateAction<ConversationResolutionType>>;
  confirmReplaceStaged: boolean;
  setConfirmReplaceStaged: (confirm: boolean) => void;
  isInstantiating: boolean;
  onInstantiate: (mode: 'append_scene' | 'replace_staged') => void;
}

export interface ScenePresetFooterProps {
  mode: 'save' | 'insert';
  onClose: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  presetName: string;
  onSave: () => void;
  selectedPreset: SceneCompositionPreset | null;
  confirmReplaceStaged: boolean;
  setConfirmReplaceStaged: (confirm: boolean) => void;
  isInstantiating: boolean;
  onInstantiate: (mode: 'append_scene' | 'replace_staged') => void;
}
