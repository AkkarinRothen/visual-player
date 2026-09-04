import React from 'react';
import { Box, X, Bookmark, FolderOpen } from 'lucide-react';
import type { Campaign, SceneCompositionPreset } from '../../../types';

export interface CompositorModalsProps {
  showAddPropModal: boolean;
  setShowAddPropModal: (show: boolean) => void;
  campaign?: Campaign | null;
  newPropName: string;
  setNewPropName: (val: string) => void;
  newPropUrl: string;
  setNewPropUrl: (val: string) => void;
  newPropAnchor: 'bottom-center' | 'center';
  setNewPropAnchor: (val: 'bottom-center' | 'center') => void;
  handleAddPropSubmit: (e: React.FormEvent) => void;

  showSavePresetModal: boolean;
  setShowSavePresetModal: (show: boolean) => void;
  presetName: string;
  setPresetName: (val: string) => void;
  presetDesc: string;
  setPresetDesc: (val: string) => void;
  handleSavePreset: (e: React.FormEvent) => void;

  showLoadPresetModal: boolean;
  setShowLoadPresetModal: (show: boolean) => void;
  handleApplyPreset: (preset: SceneCompositionPreset) => void;
}

export const CompositorModals: React.FC<CompositorModalsProps> = ({
  showAddPropModal,
  setShowAddPropModal,
  campaign,
  newPropName,
  setNewPropName,
  newPropUrl,
  setNewPropUrl,
  newPropAnchor,
  setNewPropAnchor,
  handleAddPropSubmit,
  showSavePresetModal,
  setShowSavePresetModal,
  presetName,
  setPresetName,
  presetDesc,
  setPresetDesc,
  handleSavePreset,
  showLoadPresetModal,
  setShowLoadPresetModal,
  handleApplyPreset,
}) => {
  return (
    <>
      {/* DIALOG: AGREGAR OBJETO (PROP) */}
      {showAddPropModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Box size={16} className="text-purple-400" />
                Agregar Objeto de Escenario
              </h3>
              <button onClick={() => setShowAddPropModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* QUICK PICKS FROM CAMPAIGN ASSETS (IF PRESENT) */}
            {campaign?.propAssets && campaign.propAssets.length > 0 && (
              <div className="mb-3">
                <label className="text-[11px] text-slate-400 block mb-1">Biblioteca de Campaña</label>
                <div className="grid grid-cols-3 gap-1.5 max-h-28 overflow-y-auto">
                  {campaign.propAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex flex-col items-center text-center"
                      onClick={() => {
                        setNewPropUrl(asset.assetUrl);
                        setNewPropName(asset.name);
                        setNewPropAnchor(asset.defaultAnchor || 'bottom-center');
                      }}
                    >
                      <img src={asset.assetUrl} alt={asset.name} className="w-10 h-10 object-contain mb-1" />
                      <span className="text-[10px] text-slate-200 truncate w-full">{asset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddPropSubmit} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nombre del Objeto</label>
                <input
                  type="text"
                  placeholder="ej. Barra de Taberna, Cofre, Farol"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">URL de la Imagen (PNG transparente)</label>
                <input
                  type="url"
                  required
                  placeholder="https://ejemplo.com/cofre.png"
                  value={newPropUrl}
                  onChange={(e) => setNewPropUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tipo de Anclaje</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`p-2 rounded text-xs ${
                      newPropAnchor === 'bottom-center'
                        ? 'bg-purple-900/60 border border-purple-400 text-white font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                    onClick={() => setNewPropAnchor('bottom-center')}
                  >
                    Suelo (Base fija)
                  </button>
                  <button
                    type="button"
                    className={`p-2 rounded text-xs ${
                      newPropAnchor === 'center'
                        ? 'bg-purple-900/60 border border-purple-400 text-white font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                    onClick={() => setNewPropAnchor('center')}
                  >
                    Flotante (Centro)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPropModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white">
                  Colocar en Escena
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: GUARDAR COMPOSICIÓN PRESET */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <Bookmark size={16} className="text-amber-400" />
              Guardar Composición
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Guarda la posición de los NPCs, expresiones y props sin tocar la partida en curso.
            </p>
            <form onSubmit={handleSavePreset} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Consejo de la Ciudad, Taberna en calma"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Notas visuales sobre la disposición..."
                  value={presetDesc}
                  onChange={(e) => setPresetDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowSavePresetModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs">
                  Guardar Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: CARGAR COMPOSICIÓN PRESET */}
      {showLoadPresetModal && campaign?.savedCompositions && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FolderOpen size={16} className="text-sky-400" />
                Cargar Composición Guardada
              </h3>
              <button onClick={() => setShowLoadPresetModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-2">
              {campaign.savedCompositions.map((comp) => (
                <div
                  key={comp.id}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-lg border border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{comp.name}</h4>
                    {comp.description && (
                      <p className="text-[10px] text-slate-400 truncate">{comp.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{comp.characters.length} NPCs</span>
                      <span>•</span>
                      <span>{comp.props?.length || 0} Props</span>
                    </div>
                  </div>
                  <button
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded"
                    onClick={() => handleApplyPreset(comp)}
                  >
                    Aplicar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
