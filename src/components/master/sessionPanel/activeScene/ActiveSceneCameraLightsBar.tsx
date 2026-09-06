import React from 'react';
import { Camera, Maximize2, Flame, CloudRain } from 'lucide-react';
import type {
  DisplayState,
  CameraTransform,
  SceneLight,
  SceneZoneEmitter,
} from '../../../../types';
import { calculateGroupFraming } from '../../../../domain/display/cameraFraming';

interface ActiveSceneCameraLightsBarProps {
  liveState: DisplayState;
  onSetCameraTransform?: (transform: CameraTransform) => void;
  onResetCamera?: () => void;
  onUpdateSceneLights?: (lights: SceneLight[]) => void;
  onUpdateZoneEmitters?: (emitters: SceneZoneEmitter[]) => void;
}

export const ActiveSceneCameraLightsBar: React.FC<ActiveSceneCameraLightsBarProps> = ({
  liveState,
  onSetCameraTransform,
  onResetCamera,
  onUpdateSceneLights,
  onUpdateZoneEmitters,
}) => {
  if (!onSetCameraTransform) return null;

  return (
    <div className="camera-framing-row flex items-center gap-1.5 pt-2 pb-1 border-t border-slate-800/80 overflow-x-auto text-[11px]">
      <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0">
        <Camera size={12} className="text-amber-400" />
        <span>Cámara:</span>
      </span>

      <button
        type="button"
        className={`px-2 py-0.5 rounded font-semibold shrink-0 ${
          (liveState.camera?.zoom ?? 1) <= 1.05
            ? 'bg-amber-500 text-black'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
        }`}
        onClick={() =>
          onResetCamera
            ? onResetCamera()
            : onSetCameraTransform({ focalPoint: { x: 50, y: 50 }, zoom: 1.0 })
        }
        title="Plano General (1.0x)"
      >
        Plano General
      </button>

      {liveState.characters.length > 0 && (
        <button
          type="button"
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold shrink-0"
          onClick={() => {
            const speaking =
              liveState.characters.find((c) => c.isSpeaking) || liveState.characters[0];
            if (speaking) {
              const targetX = speaking.normalizedX ?? 50;
              const targetY = Math.max(25, (speaking.normalizedY ?? 50) - 15);
              onSetCameraTransform({ focalPoint: { x: targetX, y: targetY }, zoom: 1.45 });
            }
          }}
          title="Encuadrar al personaje que habla"
        >
          Encuadrar Hablante
        </button>
      )}

      {liveState.characters.length >= 2 && (
        <button
          type="button"
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold shrink-0"
          onClick={() => {
            const framing = calculateGroupFraming(liveState.characters, {
              hasActiveDialogue: !!liveState.dialogue?.visible,
              hasActiveInitiative: !!liveState.combatState?.isActive,
              hasActiveBanner: !!liveState.locationBanner?.visible,
            });
            onSetCameraTransform(framing.camera);
          }}
          title="Encuadrar grupo completo calculando caja envolvente y safe areas de diálogos e iniciativa"
        >
          Encuadrar Grupo
        </button>
      )}

      {(liveState.camera?.zoom ?? 1) > 1.05 && (
        <button
          type="button"
          className="px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-semibold shrink-0 flex items-center gap-0.5"
          onClick={() =>
            onResetCamera
              ? onResetCamera()
              : onSetCameraTransform({ focalPoint: { x: 50, y: 50 }, zoom: 1.0 })
          }
          title="Restablecer cámara a posición original"
        >
          <Maximize2 size={10} />
          <span>Restablecer</span>
        </button>
      )}

      {/* Quick Scene Lights Toggle */}
      {liveState.lights && liveState.lights.length > 0 && onUpdateSceneLights && (
        <button
          type="button"
          className={`px-2 py-0.5 rounded font-semibold shrink-0 flex items-center gap-1 ${
            liveState.lights.some((l) => l.visible)
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
          onClick={() => {
            const anyVisible = liveState.lights?.some((l) => l.visible);
            const updated = (liveState.lights || []).map((l) => ({
              ...l,
              visible: !anyVisible,
            }));
            onUpdateSceneLights(updated);
          }}
          title="Encender o apagar luces localizadas de la escena"
        >
          <Flame
            size={11}
            className={
              liveState.lights.some((l) => l.visible) ? 'text-amber-400 animate-pulse' : ''
            }
          />
          <span>Luces ({liveState.lights.filter((l) => l.visible).length})</span>
        </button>
      )}

      {/* Quick Zone Emitters Toggle */}
      {liveState.emitters && liveState.emitters.length > 0 && onUpdateZoneEmitters && (
        <button
          type="button"
          className={`px-2 py-0.5 rounded font-semibold shrink-0 flex items-center gap-1 ${
            liveState.emitters.some((e) => e.enabled)
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
          onClick={() => {
            const anyEnabled = liveState.emitters?.some((e) => e.enabled);
            const updated = (liveState.emitters || []).map((e) => ({
              ...e,
              enabled: !anyEnabled,
            }));
            onUpdateZoneEmitters(updated);
          }}
          title="Activar o desactivar emisores atmosféricos de la escena"
        >
          <CloudRain
            size={11}
            className={
              liveState.emitters.some((e) => e.enabled) ? 'text-sky-400 animate-pulse' : ''
            }
          />
          <span>Ambiente ({liveState.emitters.filter((e) => e.enabled).length})</span>
        </button>
      )}
    </div>
  );
};
