import type { LightingFilter, WeatherType } from './atmosphere.types';
import type { CharacterOnScreen } from './character.types';
import type { CameraTransform } from './display.types';

export type DialogueStyle = 'speech' | 'narration' | 'whisper' | 'shout';

export type DialoguePresentationMode = 'auto' | 'balloon' | 'visual-novel' | 'subtitle' | 'narration';

export type DialogueThemeId = 'default-gold' | 'classic-fantasy' | 'jrpg-retro' | 'cyber-modern' | 'gothic-dark';

export interface DialogueAnchorCoordinates {
  x: number; // 0-100% (anchored point)
  y: number; // 0-100% (anchored point)
  placement: 'top' | 'left' | 'right' | 'bottom';
  tailDirection: 'down' | 'left' | 'right' | 'up' | 'none';
}

export interface CinematicDialogue {
  id: string; // Unique dialogue intervention ID
  speakerInstanceId?: string; // Reference to CharacterOnScreen id
  speakerName?: string; // Public alias (e.g. "Grom", "Voz Misteriosa", or undefined for pure narration)
  text: string;
  avatarUrl?: string; // Optional portrait avatar
  activeExpression?: string;
  style: DialogueStyle;
  visible: boolean;
  autoFocusSpeaker?: boolean; // Highlight speaker NPC while active
  fontSize?: 'small' | 'medium' | 'large';
  isCompleted?: boolean; // True when typewriter text is fully revealed
  presentationMode?: DialoguePresentationMode;
  themeId?: DialogueThemeId;
  anchorCoordinates?: DialogueAnchorCoordinates;
}

export type DialogueCameraAction = 'none' | 'general' | 'speaker' | 'group' | 'custom';

export interface DialogueLineActions {
  expression?: string;
  cameraPreset?: DialogueCameraAction;
  customCamera?: CameraTransform;
  momentId?: string; // Reference to Macro/Moment in campaign.macros
}

export interface DialogueBranchChoice {
  id: string;
  label: string; // Private DM decision text (e.g. "Si aceptan el pacto")
  targetLineId: string; // Target line ID in the conversation
  conditionNote?: string; // Private DM condition note (e.g. "Requiere Persuasión DC 13")
}

export interface DialogueLine {
  id: string;
  speakerCharacterId?: string;
  speakerName?: string;
  text: string;
  avatarUrl?: string;
  style?: DialogueStyle;
  activeExpression?: string;
  autoFocusSpeaker?: boolean;
  dmNotes?: string; // Private DM notes, strictly excluded from players
  actions?: DialogueLineActions;
  choices?: DialogueBranchChoice[]; // Private branching choices for the DM
  presentationMode?: DialoguePresentationMode;
  themeId?: DialogueThemeId;
}

export interface SavedConversation {
  id: string;
  title: string;
  description?: string;
  sceneId?: string;
  lines: DialogueLine[];
  defaultThemeId?: DialogueThemeId;
  defaultPresentationMode?: DialoguePresentationMode;
  createdAt: number;
  updatedAt?: number;
}

export interface ConversationSession {
  conversationId?: string;
  currentLineIndex: number;
  lines: DialogueLine[];
  isPaused?: boolean;
  executedActionLineIds?: Record<string, string>; // Maps lineId -> executionAttemptId
  selectedChoiceIds?: Record<string, string>; // Maps lineId -> selected choiceId
}

// Macro & Step Definitions
export interface MacroStep {
  id: string;
  delayMs: number;
  actionLabel?: string;
  sceneId?: string;
  backgroundUrl?: string;
  weather?: WeatherType;
  weatherIntensity?: number;
  lighting?: LightingFilter;
  charactersToAdd?: CharacterOnScreen[];
  charactersToRemove?: string[];
  speakerId?: string;
  locationBanner?: { text: string; subtitle?: string; visible: boolean };
  ambientAudioUrl?: string;
  ambientAudioName?: string;
  ambientPlaying?: boolean;
  ambientVolume?: number;
  sfxPreset?: string;
  sfxAudioUrl?: string;
  lightning?: boolean;
  shake?: boolean;
  blackout?: boolean;
  advanceMode?: 'auto' | 'manual';
  dialogueText?: string;
  dialogueSpeakerName?: string;
  dialogueAvatarUrl?: string;
}

export interface CinematicMacro {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: MacroStep[];
  charactersToAdd?: CharacterOnScreen[];
  restorePreviousStateOnEnd?: boolean;
}

export interface RecapSlide {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
  caption?: string;
  durationSeconds?: number;
}

export interface CampaignRecap {
  id: string;
  title: string;
  slides: RecapSlide[];
  currentSlideIndex: number;
}
