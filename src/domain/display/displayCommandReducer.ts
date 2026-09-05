import type { DisplayState, WeatherStormEvent } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

export interface DisplayCommandSideEffect {
  type: 'trigger_bg_transition' | 'play_synth' | 'set_ambient' | 'stop_sfx' | 'storm_lightning';
  payload?: any;
}

export interface DisplayCommandSuccess {
  success: true;
  nextState: DisplayState;
  sideEffects?: DisplayCommandSideEffect[];
}

export interface DisplayCommandRejection {
  success: false;
  errorCode: string;
  errorMessage: string;
}

export type DisplayCommandResult = DisplayCommandSuccess | DisplayCommandRejection;

/**
 * Pure transactional reducer for Display commands.
 * Has zero side-effects, no network access, and no DOM/Audio manipulation.
 * Evaluates valid mutations and returns nextState or a deterministic rejection.
 */
export function reduceDisplayCommand(
  state: DisplayState,
  msg: VersionedSyncMessage
): DisplayCommandResult {
  if (!msg || typeof msg !== 'object') {
    return {
      success: false,
      errorCode: 'MALFORMED_MESSAGE',
      errorMessage: 'El mensaje recibido es nulo o no es un objeto válido',
    };
  }

  switch (msg.type) {
    case 'FULL_STATE': {
      const payload = msg.payload as DisplayState;
      if (!payload || typeof payload !== 'object') {
        return {
          success: false,
          errorCode: 'INVALID_PAYLOAD',
          errorMessage: 'El payload de FULL_STATE debe ser un objeto DisplayState válido',
        };
      }

      const sideEffects: DisplayCommandSideEffect[] = [];
      if (payload.backgroundUrl && payload.backgroundUrl !== state.backgroundUrl) {
        sideEffects.push({
          type: 'trigger_bg_transition',
          payload: { backgroundUrl: payload.backgroundUrl },
        });
      }
      if (payload.ambientAudioUrl) {
        sideEffects.push({
          type: 'set_ambient',
          payload: {
            url: payload.ambientAudioUrl,
            playing: payload.ambientPlaying,
            volume: payload.ambientVolume,
            crossfade: true,
          },
        });
      }

      return {
        success: true,
        nextState: { ...payload },
        sideEffects,
      };
    }

    case 'SET_SCENE': {
      const payload = msg.payload as any;
      if (!payload || typeof payload !== 'object' || !payload.id) {
        return {
          success: false,
          errorCode: 'INVALID_SCENE_PAYLOAD',
          errorMessage: 'SET_SCENE requiere un payload con id de escena',
        };
      }

      const nextState: DisplayState = {
        ...state,
        currentSceneId: payload.id,
        sceneName: payload.name || state.sceneName,
        backgroundUrl: payload.backgroundUrl || state.backgroundUrl,
        backgroundType: payload.backgroundType || (payload.videoConfig ? 'video' : 'image'),
        videoConfig: payload.videoConfig || (payload.videoAssetId ? {
          videoAssetId: payload.videoAssetId,
          videoPosterUrl: payload.videoPosterUrl,
          videoLoop: payload.videoLoop,
          videoMuted: payload.videoMuted,
        } : undefined),
        weather: payload.weather || 'none',
        weatherIntensity: payload.weatherIntensity ?? 0.5,
        lighting: payload.lighting || 'normal',
        locationBanner: {
          text: payload.locationBanner || payload.name || '',
          subtitle: payload.subtitle || '',
          visible: true,
        },
        characters: (msg as any).characters !== undefined ? (msg as any).characters : state.characters,
        props: payload.props !== undefined ? payload.props : state.props || [],
        dialogue: null,
        camera: payload.defaultCamera || { focalPoint: { x: 50, y: 50 }, zoom: 1.0 },
        cameraTransition: undefined,
        lights: payload.lights || [],
        emitters: payload.emitters || [],
        interactions: payload.interactions || [],
      };

      const sideEffects: DisplayCommandSideEffect[] = [];
      if (payload.backgroundUrl && payload.backgroundUrl !== state.backgroundUrl) {
        sideEffects.push({
          type: 'trigger_bg_transition',
          payload: { backgroundUrl: payload.backgroundUrl },
        });
      }
      if (payload.ambientAudioUrl) {
        sideEffects.push({
          type: 'set_ambient',
          payload: {
            url: payload.ambientAudioUrl,
            playing: true,
            volume: 0.5,
            crossfade: true,
          },
        });
      }

      return {
        success: true,
        nextState,
        sideEffects,
      };
    }

    case 'SET_BACKGROUND': {
      const payload = msg.payload as any;
      const bgUrl = typeof payload === 'string' ? payload : payload?.url;
      if (typeof bgUrl !== 'string') {
        return {
          success: false,
          errorCode: 'INVALID_BACKGROUND_URL',
          errorMessage: 'SET_BACKGROUND requiere una URL válida',
        };
      }

      const nextState: DisplayState = {
        ...state,
        backgroundUrl: bgUrl,
        backgroundType: typeof payload === 'object' && payload?.backgroundType ? payload.backgroundType : (payload?.videoConfig ? 'video' : (state.backgroundType || 'image')),
        videoConfig: typeof payload === 'object' && payload?.videoConfig !== undefined ? payload.videoConfig : state.videoConfig,
      };

      return {
        success: true,
        nextState,
        sideEffects: [{ type: 'trigger_bg_transition', payload: { backgroundUrl: bgUrl } }],
      };
    }

    case 'UPDATE_CHARACTERS': {
      const characters = msg.payload as any;
      if (!Array.isArray(characters)) {
        return {
          success: false,
          errorCode: 'INVALID_CHARACTERS_ARRAY',
          errorMessage: 'UPDATE_CHARACTERS requiere un arreglo de personajes',
        };
      }

      return {
        success: true,
        nextState: { ...state, characters },
      };
    }

    case 'ADD_CHARACTER': {
      const char = msg.payload as any;
      if (!char || !char.id) {
        return {
          success: false,
          errorCode: 'INVALID_CHARACTER_DATA',
          errorMessage: 'ADD_CHARACTER requiere un personaje con id',
        };
      }

      const exists = state.characters.some((c) => c.id === char.id);
      const characters = exists
        ? state.characters.map((c) => (c.id === char.id ? char : c))
        : [...state.characters, char];

      return {
        success: true,
        nextState: { ...state, characters },
      };
    }

    case 'REMOVE_CHARACTER': {
      const payload = msg.payload as { id: string };
      if (!payload || !payload.id) {
        return {
          success: false,
          errorCode: 'INVALID_CHARACTER_ID',
          errorMessage: 'REMOVE_CHARACTER requiere un id de personaje',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          characters: state.characters.filter((c) => c.id !== payload.id),
        },
      };
    }

    case 'SET_SPEAKING': {
      const payload = msg.payload as { id: string; isSpeaking: boolean };
      if (!payload || !payload.id) {
        return {
          success: false,
          errorCode: 'INVALID_SPEAKING_PAYLOAD',
          errorMessage: 'SET_SPEAKING requiere id de personaje',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          characters: state.characters.map((c) =>
            c.id === payload.id
              ? { ...c, isSpeaking: !!payload.isSpeaking }
              : { ...c, isSpeaking: false }
          ),
        },
      };
    }

    case 'SET_CHARACTER_EXPRESSION': {
      const payload = msg.payload as { id: string; avatarUrl: string; expressionName: string };
      if (!payload || !payload.id) {
        return {
          success: false,
          errorCode: 'INVALID_EXPRESSION_PAYLOAD',
          errorMessage: 'SET_CHARACTER_EXPRESSION requiere id de personaje',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          characters: state.characters.map((c) =>
            c.id === payload.id
              ? { ...c, avatarUrl: payload.avatarUrl, activeExpression: payload.expressionName }
              : c
          ),
        },
      };
    }

    case 'SET_CHARACTER_POSITION': {
      const payload = msg.payload as { id: string; position: any };
      if (!payload || !payload.id) {
        return {
          success: false,
          errorCode: 'INVALID_POSITION_PAYLOAD',
          errorMessage: 'SET_CHARACTER_POSITION requiere id de personaje',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          characters: state.characters.map((c) =>
            c.id === payload.id ? { ...c, position: payload.position } : c
          ),
        },
      };
    }

    case 'SET_WEATHER': {
      const payload = msg.payload as { weather: any; intensity?: number };
      if (!payload || !payload.weather) {
        return {
          success: false,
          errorCode: 'INVALID_WEATHER_PAYLOAD',
          errorMessage: 'SET_WEATHER requiere tipo de clima',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          weather: payload.weather,
          weatherIntensity: payload.intensity ?? 0.5,
        },
      };
    }

    case 'SET_LIGHTING': {
      return {
        success: true,
        nextState: {
          ...state,
          lighting: (msg.payload as any) || 'normal',
        },
      };
    }

    case 'TRIGGER_LIGHTNING': {
      return {
        success: true,
        nextState: {
          ...state,
          lightningTrigger: Date.now(),
        },
        sideEffects: [{ type: 'play_synth', payload: { preset: 'thunder' } }],
      };
    }

    case 'TRIGGER_STORM_LIGHTNING': {
      const event = msg.payload as WeatherStormEvent;
      // Anti-burst guarantee: discard expired events after reconnect
      if (event && event.expiresAt && Date.now() > event.expiresAt) {
        return {
          success: true,
          nextState: state,
        };
      }

      const nextLightningTrigger = event?.disableFlash
        ? state.lightningTrigger
        : Date.now();

      return {
        success: true,
        nextState: {
          ...state,
          lightningTrigger: nextLightningTrigger,
        },
        sideEffects: [{ type: 'storm_lightning', payload: event }],
      };
    }

    case 'TRIGGER_SHAKE': {
      return {
        success: true,
        nextState: {
          ...state,
          shakeTrigger: Date.now(),
        },
      };
    }

    case 'SET_BLACKOUT': {
      return {
        success: true,
        nextState: {
          ...state,
          isBlackout: !!msg.payload,
        },
      };
    }

    case 'SET_BANNER': {
      return {
        success: true,
        nextState: {
          ...state,
          locationBanner: msg.payload as any,
        },
      };
    }

    case 'START_COMBAT':
    case 'UPDATE_COMBAT': {
      const combat = msg.payload as any;
      if (!combat || typeof combat !== 'object') {
        return {
          success: false,
          errorCode: 'INVALID_COMBAT_PAYLOAD',
          errorMessage: 'UPDATE_COMBAT requiere un objeto CombatState',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          combatState: combat,
        },
      };
    }

    case 'END_COMBAT': {
      return {
        success: true,
        nextState: {
          ...state,
          combatState: {
            isActive: false,
            round: 1,
            currentTurnIndex: 0,
            combatants: [],
          },
        },
      };
    }

    case 'PLAY_SFX': {
      const sfx = msg.payload as any;
      const synthPreset = sfx?.synthPreset || sfx?.id || 'thunder';
      return {
        success: true,
        nextState: {
          ...state,
          lastSfx: sfx || null,
        },
        sideEffects: [{ type: 'play_synth', payload: { preset: synthPreset } }],
      };
    }

    case 'STOP_ALL_SFX': {
      return {
        success: true,
        nextState: {
          ...state,
          lastSfx: null,
        },
        sideEffects: [{ type: 'stop_sfx' }],
      };
    }

    case 'UPDATE_CHARACTER_TRANSFORM': {
      const payload = msg.payload as {
        id: string;
        normalizedX?: number;
        normalizedY?: number;
        scale?: number;
        isFlipped?: boolean;
        zIndex?: number;
        isLocked?: boolean;
        position?: any;
      };

      if (!payload || !payload.id) {
        return {
          success: false,
          errorCode: 'INVALID_TRANSFORM_PAYLOAD',
          errorMessage: 'UPDATE_CHARACTER_TRANSFORM requiere un id de personaje válido',
        };
      }

      const characters = state.characters.map((char) => {
        if (char.id !== payload.id) return char;
        return {
          ...char,
          normalizedX: payload.normalizedX !== undefined ? payload.normalizedX : char.normalizedX,
          normalizedY: payload.normalizedY !== undefined ? payload.normalizedY : char.normalizedY,
          scale: payload.scale !== undefined ? payload.scale : char.scale,
          isFlipped: payload.isFlipped !== undefined ? payload.isFlipped : char.isFlipped,
          zIndex: payload.zIndex !== undefined ? payload.zIndex : char.zIndex,
          isLocked: payload.isLocked !== undefined ? payload.isLocked : char.isLocked,
          position: payload.position !== undefined ? payload.position : char.position,
        };
      });

      return {
        success: true,
        nextState: {
          ...state,
          characters,
        },
      };
    }

    case 'APPLY_SCENE_VARIANT': {
      const payload = msg.payload as {
        variantId: string;
        backgroundUrl: string;
        fitMode?: 'cover' | 'contain';
        focalPoint?: { x: number; y: number };
        zoom?: number;
        lighting?: any;
        weather?: any;
        weatherIntensity?: number;
        ambientAudioUrl?: string;
      };

      if (!payload || !payload.backgroundUrl) {
        return {
          success: false,
          errorCode: 'INVALID_VARIANT_PAYLOAD',
          errorMessage: 'APPLY_SCENE_VARIANT requiere al menos backgroundUrl',
        };
      }

      const sideEffects: DisplayCommandSideEffect[] = [
        {
          type: 'trigger_bg_transition',
          payload: { backgroundUrl: payload.backgroundUrl },
        },
      ];

      if (payload.ambientAudioUrl) {
        sideEffects.push({
          type: 'set_ambient',
          payload: {
            url: payload.ambientAudioUrl,
            playing: true,
            volume: 0.5,
            crossfade: true,
          },
        });
      }

      return {
        success: true,
        nextState: {
          ...state,
          backgroundUrl: payload.backgroundUrl,
          activeVariantId: payload.variantId,
          fitMode: payload.fitMode || state.fitMode,
          focalPoint: payload.focalPoint || state.focalPoint,
          zoom: payload.zoom !== undefined ? payload.zoom : state.zoom,
          lighting: payload.lighting || state.lighting,
          weather: payload.weather || state.weather,
          weatherIntensity: payload.weatherIntensity !== undefined ? payload.weatherIntensity : state.weatherIntensity,
          ambientAudioUrl: payload.ambientAudioUrl || state.ambientAudioUrl,
        },
        sideEffects,
      };
    }

    case 'UPDATE_SCENE_PROPS': {
      const payload = msg.payload as any;
      const props = Array.isArray(payload) ? payload : payload?.props;
      if (!Array.isArray(props)) {
        return {
          success: false,
          errorCode: 'INVALID_PROPS_PAYLOAD',
          errorMessage: 'UPDATE_SCENE_PROPS requiere un array de SceneProp',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          props,
        },
      };
    }

    case 'APPLY_COMPOSITION_PRESET': {
      const preset = msg.payload as any;
      if (!preset || typeof preset !== 'object') {
        return {
          success: false,
          errorCode: 'INVALID_PRESET_PAYLOAD',
          errorMessage: 'APPLY_COMPOSITION_PRESET requiere un objeto SceneCompositionPreset válido',
        };
      }

      // Map characters from preset, keeping their visual coordinates & expressions
      const nextCharacters = Array.isArray(preset.characters)
        ? preset.characters.map((c: any) => ({
            id: c.id,
            characterId: c.characterId,
            name: c.name,
            avatarUrl: c.avatarUrl,
            activeExpression: c.activeExpression,
            position: c.position || 'center-left',
            normalizedX: c.normalizedX,
            normalizedY: c.normalizedY,
            scale: c.scale,
            isFlipped: c.isFlipped,
            zIndex: c.zIndex,
            isSpeaking: false, // Speaking focus is session-transient, excluded from preset!
          }))
        : state.characters;

      const sideEffects: DisplayCommandSideEffect[] = [];
      const nextBg = preset.backgroundUrl || state.backgroundUrl;
      if (nextBg && nextBg !== state.backgroundUrl) {
        sideEffects.push({
          type: 'trigger_bg_transition',
          payload: { backgroundUrl: nextBg },
        });
      }

      return {
        success: true,
        nextState: {
          ...state,
          backgroundUrl: nextBg,
          activeVariantId: preset.variantId !== undefined ? preset.variantId : state.activeVariantId,
          focalPoint: preset.focalPoint || state.focalPoint,
          fitMode: preset.fitMode || state.fitMode,
          zoom: preset.zoom !== undefined ? preset.zoom : state.zoom,
          lighting: preset.lighting || state.lighting,
          weather: preset.weather || state.weather,
          weatherIntensity:
            preset.weatherIntensity !== undefined ? preset.weatherIntensity : state.weatherIntensity,
          characters: nextCharacters,
          props: Array.isArray(preset.props) ? preset.props : state.props || [],
          tacticalGrid: preset.tacticalGrid !== undefined ? preset.tacticalGrid : state.tacticalGrid,
          // Preserves combatState, locationBanner, and session notes!
        },
        sideEffects,
      };
    }

    case 'TRIGGER_ELEMENT_TRANSITION': {
      const directive = msg.payload as any;
      if (!directive || !directive.transitionId || !directive.targetId) {
        return {
          success: false,
          errorCode: 'INVALID_TRANSITION_PAYLOAD',
          errorMessage: 'TRIGGER_ELEMENT_TRANSITION requiere transitionId y targetId',
        };
      }

      const existing = state.activeTransitions || [];
      if (existing.some((t) => t.transitionId === directive.transitionId)) {
        return { success: true, nextState: state };
      }

      return {
        success: true,
        nextState: {
          ...state,
          activeTransitions: [
            ...existing.filter((t) => t.targetId !== directive.targetId),
            directive,
          ],
        },
      };
    }

    case 'SET_ELEMENT_VISUAL_STATE': {
      const payload = msg.payload as any;
      if (!payload || !payload.targetId || !payload.visualStateId) {
        return {
          success: false,
          errorCode: 'INVALID_VISUAL_STATE_PAYLOAD',
          errorMessage: 'SET_ELEMENT_VISUAL_STATE requiere targetId y visualStateId',
        };
      }

      if (payload.targetType === 'character') {
        const charIndex = state.characters.findIndex((c) => c.id === payload.targetId);
        if (charIndex === -1) {
          return {
            success: false,
            errorCode: 'CHARACTER_NOT_FOUND',
            errorMessage: `Personaje con ID "${payload.targetId}" no encontrado`,
          };
        }

        const targetChar = state.characters[charIndex];
        const nextChars = [...state.characters];
        nextChars[charIndex] = {
          ...targetChar,
          visualStateId: payload.visualStateId,
          activeExpression: payload.activeExpression || targetChar.activeExpression,
          avatarUrl: payload.assetUrl || targetChar.avatarUrl,
        };

        return {
          success: true,
          nextState: {
            ...state,
            characters: nextChars,
          },
        };
      } else {
        const props = state.props || [];
        const propIndex = props.findIndex((p) => p.id === payload.targetId);
        if (propIndex === -1) {
          return {
            success: false,
            errorCode: 'PROP_NOT_FOUND',
            errorMessage: `Objeto con ID "${payload.targetId}" no encontrado`,
          };
        }

        const targetProp = props[propIndex];
        const nextProps = [...props];
        nextProps[propIndex] = {
          ...targetProp,
          visualStateId: payload.visualStateId,
          assetUrl: payload.assetUrl || targetProp.assetUrl,
        };

        return {
          success: true,
          nextState: {
            ...state,
            props: nextProps,
          },
        };
      }
    }

    case 'SET_CINEMATIC_DIALOGUE': {
      const payload = msg.payload as any;
      if (!payload || !payload.id || typeof payload.text !== 'string') {
        return {
          success: false,
          errorCode: 'INVALID_DIALOGUE_PAYLOAD',
          errorMessage: 'SET_CINEMATIC_DIALOGUE requiere id y texto válidos',
        };
      }

      const nextDialogue = {
        ...payload,
        visible: payload.visible !== false,
        style: payload.style || 'speech',
      };

      // Auto-focus speaker if enabled and matching a character in the scene
      let nextCharacters = state.characters;
      if (payload.autoFocusSpeaker && payload.speakerInstanceId) {
        nextCharacters = state.characters.map((c) => ({
          ...c,
          isSpeaking: c.id === payload.speakerInstanceId,
        }));
      }

      return {
        success: true,
        nextState: {
          ...state,
          dialogue: nextDialogue,
          characters: nextCharacters,
        },
      };
    }

    case 'DISMISS_CINEMATIC_DIALOGUE': {
      // If the current dialogue had auto-focused a speaker, restore all isSpeaking to false
      let nextCharacters = state.characters;
      if (state.dialogue?.autoFocusSpeaker && state.dialogue?.speakerInstanceId) {
        nextCharacters = state.characters.map((c) =>
          c.id === state.dialogue?.speakerInstanceId ? { ...c, isSpeaking: false } : c
        );
      }

      return {
        success: true,
        nextState: {
          ...state,
          dialogue: null,
          characters: nextCharacters,
        },
      };
    }

    case 'SET_CAMERA_TRANSFORM': {
      const payload = msg.payload as any;
      if (!payload || !payload.camera) {
        return {
          success: false,
          errorCode: 'INVALID_CAMERA_PAYLOAD',
          errorMessage: 'SET_CAMERA_TRANSFORM requiere un objeto camera válido',
        };
      }

      const rawCam = payload.camera;
      const focalX =
        typeof rawCam.focalPoint?.x === 'number'
          ? Math.max(0, Math.min(100, rawCam.focalPoint.x))
          : 50;
      const focalY =
        typeof rawCam.focalPoint?.y === 'number'
          ? Math.max(0, Math.min(100, rawCam.focalPoint.y))
          : 50;
      const zoom =
        typeof rawCam.zoom === 'number' ? Math.max(1.0, Math.min(3.0, rawCam.zoom)) : 1.0;

      const durationMs = typeof payload.durationMs === 'number' ? payload.durationMs : 800;
      const transitionDirective =
        durationMs > 0
          ? {
              transitionId: `cam-${Date.now()}`,
              durationMs,
            }
          : undefined;

      return {
        success: true,
        nextState: {
          ...state,
          camera: {
            focalPoint: { x: focalX, y: focalY },
            zoom,
          },
          cameraTransition: transitionDirective,
        },
      };
    }

    case 'UPDATE_SCENE_LIGHTS': {
      const payload = msg.payload as any;
      const lights = Array.isArray(payload) ? payload : payload?.lights;
      if (!Array.isArray(lights)) {
        return {
          success: false,
          errorCode: 'INVALID_LIGHTS_PAYLOAD',
          errorMessage: 'UPDATE_SCENE_LIGHTS requiere una lista de luces válida',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          lights,
        },
      };
    }

    case 'UPDATE_ZONE_EMITTERS': {
      const payload = msg.payload as any;
      const emitters = Array.isArray(payload) ? payload : payload?.emitters;
      if (!Array.isArray(emitters)) {
        return {
          success: false,
          errorCode: 'INVALID_EMITTERS_PAYLOAD',
          errorMessage: 'UPDATE_ZONE_EMITTERS requiere una lista de emisores válida',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          emitters,
        },
      };
    }

    case 'UPDATE_SCENE_INTERACTIONS': {
      const payload = msg.payload as any;
      const interactions = Array.isArray(payload) ? payload : payload?.interactions;
      if (!Array.isArray(interactions)) {
        return {
          success: false,
          errorCode: 'INVALID_INTERACTIONS_PAYLOAD',
          errorMessage: 'UPDATE_SCENE_INTERACTIONS requiere una lista de interacciones válida',
        };
      }

      return {
        success: true,
        nextState: {
          ...state,
          interactions,
        },
      };
    }

    case 'UPDATE_ACTIVE_HANDOUT': {
      const payload = msg.payload as any;
      const activeHandout = payload?.activeHandout !== undefined ? payload.activeHandout : payload;
      return {
        success: true,
        nextState: {
          ...state,
          activeHandout: activeHandout || null,
        },
      };
    }

    case 'UPDATE_ACTIVE_RECAP': {
      const payload = msg.payload as any;
      const activeRecap = payload?.activeRecap !== undefined ? payload.activeRecap : payload;
      return {
        success: true,
        nextState: {
          ...state,
          activeRecap: activeRecap || null,
        },
      };
    }

    case 'VIDEO_PLAYBACK_COMMAND': {
      const payload = msg.payload as any;
      if (!payload || !payload.action) {
        return {
          success: false,
          errorCode: 'INVALID_VIDEO_COMMAND',
          errorMessage: 'VIDEO_PLAYBACK_COMMAND requiere una acción válida (play, pause, stop, seek)',
        };
      }

      const prevPlayback = state.videoPlayback || {
        playbackId: `playback-${Date.now()}`,
        videoAssetId: payload.videoAssetId || state.videoConfig?.videoAssetId || '',
        status: 'idle',
        currentTimeMs: 0,
        durationMs: (state.videoConfig?.durationSeconds || 0) * 1000,
        isMuted: state.videoConfig?.videoMuted ?? true,
        volume: 1,
        playbackRate: 1,
        updatedAt: Date.now(),
      };

      let nextStatus = prevPlayback.status;
      let nextTimeMs = prevPlayback.currentTimeMs;

      if (payload.action === 'play') nextStatus = 'playing';
      else if (payload.action === 'pause') nextStatus = 'paused';
      else if (payload.action === 'stop') {
        nextStatus = 'idle';
        nextTimeMs = 0;
      } else if (payload.action === 'seek' && typeof payload.seekTimeMs === 'number') {
        nextTimeMs = payload.seekTimeMs;
      }

      return {
        success: true,
        nextState: {
          ...state,
          videoPlayback: {
            ...prevPlayback,
            status: nextStatus,
            currentTimeMs: nextTimeMs,
            updatedAt: Date.now(),
          },
        },
      };
    }

    default:
      return {
        success: false,
        errorCode: 'UNKNOWN_COMMAND',
        errorMessage: `El comando "${msg.type}" no está implementado o no es reconocido por la Mesa`,
      };
  }
}
