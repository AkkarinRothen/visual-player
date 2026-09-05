import React from 'react';
import type { CharacterOnScreen } from '../../../../types';
import type { StageUnifiedItem } from '../directorTypes';
import { ArrowUp, ArrowDown, X, Layers } from 'lucide-react';

export interface RelativeLayerModalProps {
  relativeLayerModalOpen: 'front_of' | 'behind' | null;
  primarySelectedChar: CharacterOnScreen | null;
  unifiedStageItems: StageUnifiedItem[];
  reorderRelativeTo: (subjectId: string, targetId: string, placement: 'front_of' | 'behind') => void;
  onClose: () => void;
}

export const RelativeLayerModal: React.FC<RelativeLayerModalProps> = ({
  relativeLayerModalOpen,
  primarySelectedChar,
  unifiedStageItems,
  reorderRelativeTo,
  onClose,
}) => {
  if (!relativeLayerModalOpen || !primarySelectedChar) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
            {relativeLayerModalOpen === 'front_of' ? (
              <ArrowUp size={14} className="text-emerald-400" />
            ) : (
              <ArrowDown size={14} className="text-amber-400" />
            )}
            <span>
              Colocar a {primarySelectedChar.name} {relativeLayerModalOpen === 'front_of' ? 'delante de…' : 'detrás de…'}
            </span>
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
          Elegí la figura u objeto de referencia. Se reordenarán las capas de forma limpia para evitar colisiones:
        </p>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-60 pr-1">
          {unifiedStageItems
            .filter((item) => item.id !== primarySelectedChar.id)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 transition-all text-left"
                onClick={() => {
                  reorderRelativeTo(primarySelectedChar.id, item.id, relativeLayerModalOpen);
                  onClose();
                }}
              >
                <div className="flex items-center gap-2">
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
                      {item.type === 'prop' ? 'Objeto de decorado' : item.type === 'occlusion' ? 'Región Oclusión' : 'Personaje'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
                  Capa {item.zIndex}
                </span>
              </button>
            ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
