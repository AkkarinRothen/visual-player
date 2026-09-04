import React from 'react';
import type { CharacterOnScreen, StageWaypoint } from '../../../types';
import type { StageUnifiedItem } from './directorTypes';
import {
  Sliders,
  X,
  DoorOpen,
  Play,
  Camera,
  FlipHorizontal,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Lock,
  Unlock,
  Tag,
  MapPin,
  Move,
} from 'lucide-react';

export interface DirectorMoreDrawerProps {
  showMorePanel: boolean;
  setShowMorePanel: (val: boolean) => void;
  primarySelectedChar: CharacterOnScreen | null;
  characters: CharacterOnScreen[];
  unifiedStageItems: StageUnifiedItem[];
  waypoints: StageWaypoint[];
  onFocusCamera?: (focalX: number, focalY: number) => void;
  setPreparingEntryCharId: (id: string | null) => void;
  setCalibratingAnchorCharId: (id: string | null) => void;
  setCalibratingOffsetValue: (val: number) => void;
  setViewLayersModalOpen: (val: boolean) => void;
  setRelativeLayerModalOpen: (val: 'front_of' | 'behind' | null) => void;
  setEditingPrivateLabelId: (id: string | null) => void;
  setPrivateLabelInput: (val: string) => void;
  setWaypointNameInput: (val: string) => void;
  setSavingWaypointModalOpen: (val: boolean) => void;
  setMovingToWaypointModalOpen: (val: boolean) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
}

export const DirectorMoreDrawer: React.FC<DirectorMoreDrawerProps> = ({
  showMorePanel,
  setShowMorePanel,
  primarySelectedChar,
  characters,
  unifiedStageItems,
  waypoints,
  onFocusCamera,
  setPreparingEntryCharId,
  setCalibratingAnchorCharId,
  setCalibratingOffsetValue,
  setViewLayersModalOpen,
  setRelativeLayerModalOpen,
  setEditingPrivateLabelId,
  setPrivateLabelInput,
  setWaypointNameInput,
  setSavingWaypointModalOpen,
  setMovingToWaypointModalOpen,
  onUpdateCharacter,
}) => {
  if (!showMorePanel || !primarySelectedChar) return null;

  return (
    <div className="director-ui-element absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 w-[94%] max-w-[420px] pointer-events-auto">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
          <Sliders size={13} />
          <span>Acciones de {primarySelectedChar.name}</span>
        </span>
        <button
          type="button"
          onClick={() => setShowMorePanel(false)}
          className="text-slate-400 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* SECCIÓN: Presencia */}
        <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-purple-300 tracking-wider uppercase">
            Presencia
          </span>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
            onClick={() => {
              const next =
                primarySelectedChar.presence === 'in_reserve' ? 'on_stage' : 'in_reserve';
              onUpdateCharacter(
                primarySelectedChar.id,
                { presence: next },
                `${next === 'on_stage' ? 'Hacer entrar' : 'Retirar a reserva'} a ${primarySelectedChar.name}`
              );
              setShowMorePanel(false);
            }}
          >
            <DoorOpen size={14} />
            <span>
              {primarySelectedChar.presence === 'in_reserve'
                ? 'Entrar a escena'
                : 'Retirar a reserva'}
            </span>
          </button>

          {primarySelectedChar.presence === 'in_reserve' && (
            <button
              type="button"
              className="p-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-500/40 flex items-center gap-1.5 font-medium"
              onClick={() => {
                setPreparingEntryCharId(primarySelectedChar.id);
                setShowMorePanel(false);
              }}
            >
              <Play size={14} />
              <span>Preparar entrada...</span>
            </button>
          )}
        </div>

        {/* SECCIÓN: Encuadre */}
        <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-amber-300 tracking-wider uppercase">
            Encuadre
          </span>
          {onFocusCamera && (
            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
              onClick={() => {
                onFocusCamera(
                  primarySelectedChar.normalizedX ?? 50,
                  primarySelectedChar.normalizedY ?? 0
                );
                setShowMorePanel(false);
              }}
            >
              <Camera size={14} />
              <span>Enfocar cámara</span>
            </button>
          )}
        </div>

        {/* SECCIÓN: Transformación */}
        <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
          <span className="text-[10px] font-semibold text-cyan-300 tracking-wider uppercase">
            Transformación
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                primarySelectedChar.isFlipped
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
              onClick={() =>
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { isFlipped: !primarySelectedChar.isFlipped },
                  `Voltear a ${primarySelectedChar.name}`
                )
              }
            >
              <FlipHorizontal size={13} />
              <span>Girar (Espejo)</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                const allZ = characters.map((c) => c.zIndex ?? 1);
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { zIndex: Math.max(1, ...allZ) + 1 },
                  `Traer al frente`
                );
              }}
            >
              <ArrowUp size={13} />
              <span>Al frente</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                const allZ = characters.map((c) => c.zIndex ?? 1);
                const minZ = Math.min(1, ...allZ);
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { zIndex: Math.max(0, minZ - 1) },
                  `Enviar al fondo a ${primarySelectedChar.name}`
                );
              }}
              title="Colocar detrás de los demás personajes u objetos"
            >
              <ArrowDown size={13} />
              <span>Al fondo</span>
            </button>

            {/* Calibrar apoyo visual */}
            <button
              type="button"
              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 text-xs font-semibold"
              onClick={() => {
                setCalibratingAnchorCharId(primarySelectedChar.id);
                setCalibratingOffsetValue(primarySelectedChar.visualAnchorOffsetY || 0);
                setShowMorePanel(false);
              }}
            >
              <Sliders size={13} />
              <span>Calibrar apoyo visual...</span>
            </button>
          </div>
        </div>

        {/* SECCIÓN: Capas y Profundidad */}
        <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
          <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-300 tracking-wider uppercase">
            <span>Capas y Profundidad</span>
            <button
              type="button"
              onClick={() => {
                setViewLayersModalOpen(true);
                setShowMorePanel(false);
              }}
              className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-0.5 lowercase font-normal"
            >
              <ListOrdered size={11} />
              <span>Ver capas de escena</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                const allZ = unifiedStageItems.map((c) => c.zIndex);
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { zIndex: Math.max(10, ...allZ) + 10 },
                  `Traer al frente a ${primarySelectedChar.name}`
                );
              }}
              title="Traer al frente de todos los personajes y objetos"
            >
              <ArrowUp size={13} />
              <span>Al frente</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                const allZ = unifiedStageItems.map((c) => c.zIndex);
                const minZ = Math.min(10, ...allZ);
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { zIndex: Math.max(1, minZ - 10) },
                  `Enviar al fondo a ${primarySelectedChar.name}`
                );
              }}
              title="Colocar detrás de todos los personajes y objetos"
            >
              <ArrowDown size={13} />
              <span>Al fondo</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                setRelativeLayerModalOpen('front_of');
                setShowMorePanel(false);
              }}
              title="Colocar inmediatamente delante de otro personaje u objeto de la escena"
            >
              <ArrowUp size={13} className="text-emerald-400" />
              <span>Delante de…</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                setRelativeLayerModalOpen('behind');
                setShowMorePanel(false);
              }}
              title="Colocar inmediatamente detrás de otro personaje u objeto (ej. detrás del mostrador)"
            >
              <ArrowDown size={13} className="text-amber-400" />
              <span>Detrás de…</span>
            </button>
          </div>
        </div>

        {/* SECCIÓN: Organización */}
        <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
          <span className="text-[10px] font-semibold text-rose-300 tracking-wider uppercase">
            Organización
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                primarySelectedChar.isLocked
                  ? 'bg-rose-900/60 text-rose-200 border-rose-500'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
              onClick={() =>
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { isLocked: !primarySelectedChar.isLocked },
                  `${primarySelectedChar.isLocked ? 'Desbloquear' : 'Bloquear'} ${primarySelectedChar.name}`
                )
              }
            >
              {primarySelectedChar.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
              <span>{primarySelectedChar.isLocked ? 'Bloqueado' : 'Bloquear'}</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                setEditingPrivateLabelId(primarySelectedChar.id);
                setPrivateLabelInput(primarySelectedChar.privateLabel || '');
                setShowMorePanel(false);
              }}
            >
              <Tag size={13} />
              <span>
                {primarySelectedChar.privateLabel
                  ? `[${primarySelectedChar.privateLabel}]`
                  : 'Asignar etiqueta'}
              </span>
            </button>

            {/* Nameplate Position Selector */}
            <div className="flex items-center gap-1 mt-1 w-full bg-slate-950/60 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium pl-1">Etiqueta:</span>
              {(['auto', 'bottom', 'top', 'side'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                    (primarySelectedChar.nameplatePosition || 'auto') === pos
                      ? 'bg-amber-950/90 text-amber-300 border-amber-500/80 font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  onClick={() =>
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { nameplatePosition: pos },
                      `Ubicación de etiqueta: ${pos}`
                    )
                  }
                  title={`Ubicación de la etiqueta de nombre: ${pos}`}
                >
                  {pos === 'auto' ? 'Auto' : pos === 'bottom' ? 'Abajo' : pos === 'top' ? 'Arriba' : 'Lateral'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECCIÓN: Puntos Narrativos (Waypoints) */}
        <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
          <span className="text-[10px] font-semibold text-cyan-300 tracking-wider uppercase flex items-center gap-1">
            <MapPin size={11} />
            <span>Puntos Narrativos de Escena</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                setWaypointNameInput('');
                setSavingWaypointModalOpen(true);
                setShowMorePanel(false);
              }}
              title="Guardar coordenadas actuales como un punto narrativo de la escena"
            >
              <MapPin size={13} className="text-amber-400" />
              <span>Guardar posición como punto…</span>
            </button>

            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
              onClick={() => {
                setMovingToWaypointModalOpen(true);
                setShowMorePanel(false);
              }}
              title="Mover esta figura a un punto narrativo guardado"
            >
              <Move size={13} className="text-cyan-400" />
              <span>Mover a punto… ({waypoints.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
