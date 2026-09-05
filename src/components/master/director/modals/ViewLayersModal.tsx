import React from 'react';
import type { CharacterOnScreen, SceneProp } from '../../../../types';
import type { StageUnifiedItem } from '../directorTypes';
import { ListOrdered, X, ArrowUp, ArrowDown, Layers, Plus } from 'lucide-react';

export interface ViewLayersModalProps {
  isOpen: boolean;
  unifiedStageItems: StageUnifiedItem[];
  selectedIds: Set<string>;
  onClose: () => void;
  onOpenCreateOcclusion: () => void;
  onReorderLayers?: (
    items: { id: string; type: 'character' | 'prop' | 'occlusion'; zIndex: number }[],
    description: string
  ) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onUpdateProp?: (propId: string, updates: Partial<SceneProp>, description: string) => void;
}

export const ViewLayersModal: React.FC<ViewLayersModalProps> = ({
  isOpen,
  unifiedStageItems,
  selectedIds,
  onClose,
  onOpenCreateOcclusion,
  onReorderLayers,
  onUpdateCharacter,
  onUpdateProp,
}) => {
  if (!isOpen) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
            <ListOrdered size={14} />
            <span>Capas de la Escena (Orden de Profundidad)</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Orden de capas actual de frente a fondo. El elemento superior tapa a los que están
          debajo:
        </p>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-64 pr-1">
          {[...unifiedStageItems].reverse().map((item, displayIdx, arr) => {
            const isTop = displayIdx === 0;
            const isBottom = displayIdx === arr.length - 1;

            const moveDirection = (direction: 'up' | 'down') => {
              const currentItems = [...unifiedStageItems];
              const currentIdx = currentItems.findIndex((i) => i.id === item.id);
              if (currentIdx === -1) return;

              const swapTargetIdx = direction === 'up' ? currentIdx + 1 : currentIdx - 1;
              if (swapTargetIdx < 0 || swapTargetIdx >= currentItems.length) return;

              const temp = currentItems[currentIdx];
              currentItems[currentIdx] = currentItems[swapTargetIdx];
              currentItems[swapTargetIdx] = temp;

              const reordered = currentItems.map((it, idx) => ({
                ...it,
                zIndex: (idx + 1) * 10,
              }));

              if (onReorderLayers) {
                onReorderLayers(
                  reordered.map((r) => ({ id: r.id, type: r.type, zIndex: r.zIndex })),
                  `Reordenar capas de escena`
                );
              } else {
                const updatedZ = reordered.find((r) => r.id === item.id)?.zIndex ?? 10;
                if (item.type === 'character') {
                  onUpdateCharacter(item.id, { zIndex: updatedZ }, 'Ajustar capa');
                } else if (item.type === 'prop') {
                  onUpdateProp?.(item.id, { zIndex: updatedZ }, 'Ajustar capa');
                }
              }
            };

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                  selectedIds.has(item.id)
                    ? 'bg-slate-800 border-amber-400/80 shadow-sm'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={isTop}
                      onClick={() => moveDirection('up')}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
                      title="Mover hacia el frente"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={isBottom}
                      onClick={() => moveDirection('down')}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
                      title="Mover hacia el fondo"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  {item.avatarUrl ? (
                    <img
                      src={item.avatarUrl}
                      alt={item.name}
                      className="w-7 h-7 rounded-lg object-cover border border-slate-700 bg-slate-900"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-purple-700/60 bg-purple-950/80 text-purple-300">
                      <Layers size={14} />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">
                      {item.privateLabel || item.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.type === 'prop' ? 'Objeto' : item.type === 'occlusion' ? 'Región Oclusión' : 'Personaje'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                  Capa {item.zIndex}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-950/80 text-purple-200 hover:text-white border border-purple-500/50 flex items-center gap-1"
            onClick={() => {
              onClose();
              onOpenCreateOcclusion();
            }}
          >
            <Plus size={12} />
            <span>Nueva región oclusión</span>
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
