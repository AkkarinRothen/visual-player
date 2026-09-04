import React from 'react';
import type {
  Campaign,
  CharacterOnScreen,
  DisplayState,
  SceneProp,
} from '../../../types';
import type { SelectedEntity } from './compositorTypes';
import { getSlotPositionPercent } from './compositorTypes';
import {
  RotateCcw,
  Sparkles,
  Lock,
  Plus,
  Bookmark,
  FolderOpen,
} from 'lucide-react';

export interface CompositorStageProps {
  stageRef: React.RefObject<HTMLDivElement | null>;
  aspectGuide: '16:9' | '16:10' | '4:3';
  initialState: DisplayState;
  characters: CharacterOnScreen[];
  propsList: SceneProp[];
  selectedEntity: SelectedEntity | null;
  setSelectedEntity: (entity: SelectedEntity) => void;
  handlePointerDown: (
    e: React.PointerEvent,
    entity: SelectedEntity,
    currentX: number,
    currentY: number,
    isLocked?: boolean
  ) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  pushHistory: () => void;
  setCharacters: React.Dispatch<React.SetStateAction<CharacterOnScreen[]>>;
  setShowAddPropModal: (show: boolean) => void;
  setShowSavePresetModal: (show: boolean) => void;
  setShowLoadPresetModal: (show: boolean) => void;
  campaign?: Campaign | null;
  canSavePreset?: boolean;
}

export const CompositorStage: React.FC<CompositorStageProps> = ({
  stageRef,
  aspectGuide,
  initialState,
  characters,
  propsList,
  selectedEntity,
  setSelectedEntity,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  pushHistory,
  setCharacters,
  setShowAddPropModal,
  setShowSavePresetModal,
  setShowLoadPresetModal,
  campaign,
  canSavePreset = true,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center">
      <div
        ref={stageRef}
        className={`stage-viewport relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-700 select-none shadow-inner touch-none ${
          aspectGuide === '16:10' ? 'max-w-[90%]' : aspectGuide === '4:3' ? 'max-w-[75%]' : ''
        }`}
        style={{
          backgroundImage: `url(${initialState.backgroundUrl})`,
          backgroundPosition: `${initialState.focalPoint?.x ?? 50}% ${initialState.focalPoint?.y ?? 50}%`,
          backgroundSize: initialState.fitMode === 'contain' ? 'contain' : 'cover',
          backgroundRepeat: 'no-repeat',
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* STAGE GROUND LINE HELPER */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500/30 border-t border-dashed border-amber-400/40 pointer-events-none" />

        {/* UNIFIED RENDERING: CHARACTERS AND PROPS SORTED BY Z-INDEX */}
        {[
          ...characters.map((c) => ({
            type: 'character' as const,
            id: c.id,
            data: c,
            zIndex: c.zIndex ?? 1,
          })),
          ...propsList.map((p) => ({
            type: 'prop' as const,
            id: p.id,
            data: p,
            zIndex: p.zIndex,
          })),
        ]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((item) => {
            if (item.type === 'character') {
              const char = item.data;
              const isSelected =
                selectedEntity?.type === 'character' && selectedEntity.id === char.id;
              const posX = char.normalizedX ?? 50;
              const posY = char.normalizedY ?? 0;
              const scale = char.scale ?? 1.0;

              return (
                <div
                  key={char.id}
                  data-entity-id={char.id}
                  className={`absolute flex flex-col items-center cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected ? 'z-40 ring-2 ring-amber-400 rounded-lg shadow-2xl' : 'hover:ring-1 hover:ring-amber-300/50'
                  }`}
                  style={{
                    left: `${posX}%`,
                    bottom: `${posY}%`,
                    transform: 'translate(-50%, 0)',
                    zIndex: isSelected ? 99 : item.zIndex,
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) =>
                    handlePointerDown(e, { type: 'character', id: char.id }, posX, posY, char.isLocked)
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntity({ type: 'character', id: char.id });
                  }}
                >
                  {/* CHARACTER AVATAR IMAGE */}
                  <div
                    className="relative flex flex-col items-center"
                    style={{
                      transform: `scale(${scale}) ${char.isFlipped ? 'scaleX(-1)' : ''}`,
                      transformOrigin: 'bottom center',
                      transition: 'transform 0.05s ease-out',
                    }}
                  >
                    <img
                      src={char.avatarUrl}
                      alt={char.name}
                      draggable={false}
                      className="max-h-40 md:max-h-56 w-auto object-contain pointer-events-none drop-shadow-xl select-none"
                    />

                    {/* SPEAKING HALO */}
                    {char.isSpeaking && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black p-1 rounded-full shadow-lg animate-bounce">
                        <Sparkles size={12} />
                      </div>
                    )}
                  </div>

                  {/* LABEL PILL */}
                  <div
                    className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap pointer-events-none shadow ${
                      isSelected
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-900/80 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {char.name}
                    {char.isLocked && <Lock size={9} className="inline ml-1 text-slate-400" />}
                  </div>
                </div>
              );
            }

            // PROP RENDERING
            const prop = item.data;
            if (prop.visible === false) return null;

            const isSelected =
              selectedEntity?.type === 'prop' && selectedEntity.id === prop.id;
            const posX = prop.normalizedX;
            const posY = prop.normalizedY;
            const scale = prop.scale ?? 1.0;
            const anchor = prop.anchor || 'bottom-center';

            return (
              <div
                key={prop.id}
                data-entity-id={prop.id}
                className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${
                  isSelected ? 'z-40 ring-2 ring-purple-400 rounded-lg shadow-2xl' : 'hover:ring-1 hover:ring-purple-300/50'
                }`}
                style={{
                  left: `${posX}%`,
                  bottom: `${posY}%`,
                  transform: anchor === 'center' ? 'translate(-50%, 50%)' : 'translate(-50%, 0)',
                  zIndex: isSelected ? 99 : item.zIndex,
                  touchAction: 'none',
                }}
                onPointerDown={(e) =>
                  handlePointerDown(e, { type: 'prop', id: prop.id }, posX, posY, prop.isLocked)
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEntity({ type: 'prop', id: prop.id });
                }}
              >
                <div
                  style={{
                    transform: `scale(${scale}) ${prop.isFlipped ? 'scaleX(-1)' : ''}`,
                    transformOrigin: anchor === 'center' ? 'center center' : 'bottom center',
                  }}
                >
                  <img
                    src={prop.assetUrl}
                    alt={prop.name}
                    draggable={false}
                    className="max-h-32 md:max-h-48 w-auto object-contain pointer-events-none drop-shadow-2xl select-none"
                  />
                </div>

                {/* PROP LABEL PILL */}
                <div
                  className={`mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold text-center whitespace-nowrap pointer-events-none shadow ${
                    isSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-900/80 text-purple-200 border border-purple-800/60'
                  }`}
                >
                  {prop.name}
                </div>
              </div>
            );
          })}
      </div>

      {/* QUICK PRESETS & TOOLBAR UNDER STAGE */}
      <div className="w-full flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-2">
          <button
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 flex items-center gap-1.5"
            onClick={() => setShowAddPropModal(true)}
          >
            <Plus size={14} className="text-purple-400" />
            <span>Agregar Objeto</span>
          </button>

          {canSavePreset && (
            <button
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 flex items-center gap-1.5"
              onClick={() => setShowSavePresetModal(true)}
            >
              <Bookmark size={14} className="text-amber-400" />
              <span>Guardar Composición</span>
            </button>
          )}

          {campaign?.savedCompositions && campaign.savedCompositions.length > 0 && (
            <button
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 flex items-center gap-1.5"
              onClick={() => setShowLoadPresetModal(true)}
            >
              <FolderOpen size={14} className="text-sky-400" />
              <span>Cargar ({campaign.savedCompositions.length})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-1 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-300"
            onClick={() => {
              pushHistory();
              setCharacters((prev) =>
                prev.map((c) => ({
                  ...c,
                  normalizedX: getSlotPositionPercent(c.position),
                  normalizedY: 0,
                  scale: 1.0,
                  isFlipped: false,
                }))
              );
            }}
            title="Restablecer ranuras de personajes"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
