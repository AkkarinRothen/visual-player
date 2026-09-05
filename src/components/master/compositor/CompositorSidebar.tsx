import React from 'react';
import type { Campaign, Character, CharacterOnScreen, SceneProp, TacticalTeam } from '../../../types';
import type { SelectedEntity } from './compositorTypes';
import {
  Users,
  Box,
  Volume2,
  FlipHorizontal,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Trash2,
} from 'lucide-react';

export interface CompositorSidebarProps {
  campaign?: Campaign | null;
  filterType: 'all' | 'characters' | 'props';
  setFilterType: (t: 'all' | 'characters' | 'props') => void;
  characters: CharacterOnScreen[];
  propsList: SceneProp[];
  selectedEntity: SelectedEntity | null;
  setSelectedEntity: (entity: SelectedEntity) => void;
  selectedChar: CharacterOnScreen | null;
  selectedProp: SceneProp | null;
  characterTemplate: Character | null | undefined;
  propTemplate: any;
  toggleSpeaking: () => void;
  toggleFlip: () => void;
  toggleLock: () => void;
  setScale: (scale: number) => void;
  nudge: (dx: number, dy: number) => void;
  changeLayer: (direction: 'front' | 'back') => void;
  pushHistory: () => void;
  setCharacters: React.Dispatch<React.SetStateAction<CharacterOnScreen[]>>;
  setPropsList: React.Dispatch<React.SetStateAction<SceneProp[]>>;
  toggleVisibility: () => void;
  duplicateProp: (id: string) => void;
  removeProp: (id: string) => void;
  toggleAnchor: () => void;
  setRotation: (deg: number) => void;
  onAddCharacter?: (character: Character) => void;
  setTacticalTeam: (team: TacticalTeam) => void;
}

export const CompositorSidebar: React.FC<CompositorSidebarProps> = ({
  filterType,
  setFilterType,
  characters,
  propsList,
  selectedEntity,
  setSelectedEntity,
  selectedChar,
  selectedProp,
  characterTemplate,
  propTemplate,
  toggleSpeaking,
  toggleFlip,
  toggleLock,
  setScale,
  nudge,
  changeLayer,
  pushHistory,
  setCharacters,
  setPropsList,
  toggleVisibility,
  duplicateProp,
  removeProp,
  toggleAnchor,
  setRotation,
  onAddCharacter,
  campaign,
  setTacticalTeam,
}) => {
  return (
    <div className="compositor-controls w-full md:w-80 flex flex-col gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
      {/* FILTER & LAYER LIST */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400 font-semibold uppercase block">
            Capas ({characters.length + propsList.length})
          </label>
          <div className="flex items-center gap-1 bg-slate-900 rounded p-0.5 text-[10px]">
            <button
              className={`px-1.5 py-0.5 rounded ${filterType === 'all' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
              onClick={() => setFilterType('all')}
            >
              Todos
            </button>
            <button
              className={`px-1.5 py-0.5 rounded ${filterType === 'characters' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
              onClick={() => setFilterType('characters')}
            >
              NPCs
            </button>
            <button
              className={`px-1.5 py-0.5 rounded ${filterType === 'props' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
              onClick={() => setFilterType('props')}
            >
              Props
            </button>
          </div>
        </div>

        {onAddCharacter && (
          <div className="compositor-add-character-strip">
            <span className="compositor-control-label">Añadir NPC</span>
            <div className="compositor-add-character-list">
              {characterTemplate === undefined && campaign?.characters?.length === 0 ? (
                <span className="compositor-empty-hint">No hay personajes en la campaña.</span>
              ) : (
                campaign?.characters?.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    className="compositor-add-character-button"
                    onClick={() => onAddCharacter(character)}
                    title={`Añadir ${character.name} al escenario`}
                  >
                    <img src={character.defaultAvatarUrl} alt="" aria-hidden="true" />
                    <span>{character.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* LAYER LIST SORTED BY Z-INDEX DESCENDING */}
        <div className="char-list flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto max-h-40 pb-1">
          {[
            ...characters.map((c) => ({ type: 'character' as const, id: c.id, c, zIndex: c.zIndex ?? 1 })),
            ...propsList.map((p) => ({ type: 'prop' as const, id: p.id, p, zIndex: p.zIndex })),
          ]
            .filter((item) => {
              if (filterType === 'characters') return item.type === 'character';
              if (filterType === 'props') return item.type === 'prop';
              return true;
            })
            .sort((a, b) => b.zIndex - a.zIndex)
            .map((item) => {
              const isSelected =
                selectedEntity?.type === item.type && selectedEntity.id === item.id;

              if (item.type === 'character') {
                return (
                  <button
                    key={item.id}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition-colors shrink-0 md:shrink ${
                      isSelected
                        ? 'bg-amber-500/20 border border-amber-500/40 text-white font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    onClick={() => setSelectedEntity({ type: 'character', id: item.id })}
                  >
                    <Users size={12} className="text-amber-400 shrink-0" />
                    <img src={item.c.avatarUrl} alt={item.c.name} className="w-5 h-5 rounded-full object-cover" />
                    <span className="truncate flex-1">{item.c.name}</span>
                    <span className="text-[10px] text-slate-500">Z:{item.zIndex}</span>
                    {item.c.isSpeaking && <Sparkles size={11} className="text-amber-400" />}
                    {item.c.isLocked && <Lock size={11} className="text-slate-500" />}
                  </button>
                );
              }

              // Prop list item
              return (
                <button
                  key={item.id}
                  className={`flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition-colors shrink-0 md:shrink ${
                    isSelected
                      ? 'bg-purple-500/20 border border-purple-500/40 text-white font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  onClick={() => setSelectedEntity({ type: 'prop', id: item.id })}
                >
                  <Box size={12} className="text-purple-400 shrink-0" />
                  <img src={item.p.assetUrl} alt={item.p.name} className="w-5 h-5 object-contain" />
                  <span className="truncate flex-1">{item.p.name}</span>
                  <span className="text-[10px] text-slate-500">Z:{item.zIndex}</span>
                  {item.p.visible === false && <EyeOff size={11} className="text-rose-400" />}
                  {item.p.isLocked && <Lock size={11} className="text-slate-500" />}
                </button>
              );
            })}
        </div>
      </div>

      {/* CONTROLS FOR SELECTED CHARACTER */}
      {selectedChar && (
        <div className="selected-controls flex flex-col gap-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span>NPC: {selectedChar.name}</span>
            <span className="text-[10px] text-slate-400">Capa {selectedChar.zIndex ?? 1}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-semibold ${
                selectedChar.isSpeaking ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              onClick={toggleSpeaking}
            >
              <Volume2 size={14} />
              <span className="mt-0.5 text-[10px]">{selectedChar.isSpeaking ? 'Hablando' : 'Hablar'}</span>
            </button>

            <button
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-semibold ${
                selectedChar.isFlipped ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              onClick={toggleFlip}
            >
              <FlipHorizontal size={14} />
              <span className="mt-0.5 text-[10px]">Voltear</span>
            </button>

            <button
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-semibold ${
                selectedChar.isLocked ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              onClick={toggleLock}
            >
              {selectedChar.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
              <span className="mt-0.5 text-[10px]">{selectedChar.isLocked ? 'Bloqueado' : 'Mover'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] bg-slate-900 p-1.5 rounded">
            <span className="text-slate-400">Equipo</span>
            <select value={selectedChar.tacticalTeam || 'neutral'} onChange={(event) => setTacticalTeam(event.target.value as TacticalTeam)} className="bg-slate-800 text-slate-100 rounded p-1 border border-slate-700 text-[11px]" aria-label={`Equipo de ${selectedChar.name}`}>
              <option value="allies">Aliados</option><option value="enemies">Enemigos</option><option value="neutral">Neutral</option>
            </select>
          </div>

          {/* SCALE SLIDER */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
              <span>Tamaño</span>
              <span className="font-bold text-amber-400">{(selectedChar.scale ?? 1.0).toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                onClick={() => setScale((selectedChar.scale ?? 1.0) - 0.1)}
              >
                <ZoomOut size={12} />
              </button>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={selectedChar.scale ?? 1.0}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                onClick={() => setScale((selectedChar.scale ?? 1.0) + 0.1)}
              >
                <ZoomIn size={12} />
              </button>
            </div>
          </div>

          {/* NUDGES */}
          <div>
            <div className="grid grid-cols-4 gap-1">
              <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(-5, 0)}>
                ← Izq
              </button>
              <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(5, 0)}>
                Der →
              </button>
              <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(0, 5)}>
                ↑ Subir
              </button>
              <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(0, -5)}>
                ↓ Bajar
              </button>
            </div>
          </div>

          {/* LAYERING */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded flex items-center justify-between"
              onClick={() => changeLayer('front')}
            >
              <span>Frente</span>
              <Layers size={11} />
            </button>
            <button
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded flex items-center justify-between"
              onClick={() => changeLayer('back')}
            >
              <span>Fondo</span>
              <Layers size={11} />
            </button>
          </div>

          {characterTemplate?.expressions && Object.keys(characterTemplate.expressions).length > 0 && (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Expresiones</label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                <button
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    !selectedChar.activeExpression ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-300'
                  }`}
                  onClick={() => {
                    pushHistory();
                    setCharacters((prev) =>
                      prev.map((c) =>
                        c.id === selectedChar.id
                          ? { ...c, activeExpression: '', avatarUrl: characterTemplate.defaultAvatarUrl }
                          : c
                      )
                    );
                  }}
                >
                  Neutral
                </button>
                {Object.entries(characterTemplate.expressions).map(([expName, url]) => (
                  <button
                    key={expName}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      selectedChar.activeExpression === expName ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-300'
                    }`}
                    onClick={() => {
                      pushHistory();
                      setCharacters((prev) =>
                        prev.map((c) =>
                          c.id === selectedChar.id
                            ? { ...c, activeExpression: expName, avatarUrl: url }
                            : c
                        )
                      );
                    }}
                  >
                    {expName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTROLS FOR SELECTED PROP */}
      {selectedProp && (
        <div className="selected-controls flex flex-col gap-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <span className="truncate max-w-[170px]">{selectedProp.name}</span>
            <span className="text-[10px] text-slate-400">Capa {selectedProp.zIndex}</span>
          </div>

          {/* PROP ACTIONS: VISIBILITY, FLIP, ANCHOR, DUPLICATE, DELETE */}
          <div className="grid grid-cols-4 gap-1">
            <button
              className={`p-1.5 rounded flex flex-col items-center text-[10px] ${
                selectedProp.visible !== false ? 'bg-slate-800 text-slate-200' : 'bg-rose-500/20 text-rose-300'
              }`}
              onClick={toggleVisibility}
              title="Ocultar o mostrar objeto"
            >
              {selectedProp.visible !== false ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>Ver</span>
            </button>

            <button
              className={`p-1.5 rounded flex flex-col items-center text-[10px] ${
                selectedProp.isFlipped ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'
              }`}
              onClick={toggleFlip}
              title="Voltear horizontal"
            >
              <FlipHorizontal size={13} />
              <span>Voltear</span>
            </button>

            <button
              className="p-1.5 rounded flex flex-col items-center text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200"
              onClick={() => duplicateProp(selectedProp.id)}
              title="Duplicar objeto"
            >
              <Copy size={13} />
              <span>Duplicar</span>
            </button>

            <button
              className="p-1.5 rounded flex flex-col items-center text-[10px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300"
              onClick={() => removeProp(selectedProp.id)}
              title="Eliminar de la escena"
            >
              <Trash2 size={13} />
              <span>Borrar</span>
            </button>
          </div>

          {/* ANCHOR TOGGLE */}
          <div className="flex items-center justify-between text-[11px] bg-slate-900 p-1.5 rounded">
            <span className="text-slate-400">Anclaje</span>
            <button
              className="px-2 py-0.5 rounded text-[10px] bg-purple-900/40 text-purple-200 border border-purple-500/30"
              onClick={toggleAnchor}
            >
              {selectedProp.anchor === 'center' ? 'Centro (Flotante)' : 'Suelo (Apoyado)'}
            </button>
          </div>

          {/* VISUAL STATES / VARIANTS */}
          {propTemplate?.visualStates && propTemplate.visualStates.length > 0 && (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Variante / Estado Visual</label>
              <div className="flex flex-wrap gap-1">
                {propTemplate.visualStates.map((st: any) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      selectedProp.visualStateId === st.id
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    onClick={() => {
                      pushHistory();
                      setPropsList((prev) =>
                        prev.map((p) =>
                          p.id === selectedProp.id
                            ? {
                                ...p,
                                visualStateId: st.id,
                                assetUrl: st.assetUrl,
                                anchor: st.anchor || p.anchor,
                                scale: Math.round(p.scale * (st.scaleModifier ?? 1.0) * 10) / 10,
                              }
                            : p
                        )
                      );
                    }}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ROTATION SLIDER */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
              <span>Rotación</span>
              <span className="font-bold text-purple-400">{selectedProp.rotation || 0}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={selectedProp.rotation || 0}
              onChange={(e) => setRotation(parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* SCALE SLIDER */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
              <span>Escala</span>
              <span className="font-bold text-purple-400">{selectedProp.scale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={selectedProp.scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* NUDGES */}
          <div>
            <div className="grid grid-cols-4 gap-1">
              <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(-5, 0)}>
                ← Izq
              </button>
              <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(5, 0)}>
                Der →
              </button>
              <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(0, 5)}>
                ↑ Subir
              </button>
              <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(0, -5)}>
                ↓ Bajar
              </button>
            </div>
          </div>

          {/* LAYERING */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded flex items-center justify-between"
              onClick={() => changeLayer('front')}
            >
              <span>Frente</span>
              <Layers size={11} />
            </button>
            <button
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded flex items-center justify-between"
              onClick={() => changeLayer('back')}
            >
              <span>Fondo</span>
              <Layers size={11} />
            </button>
          </div>
        </div>
      )}

      {!selectedChar && !selectedProp && (
        <div className="text-xs text-slate-500 italic text-center py-6">
          Selecciona un personaje u objeto para ajustar su posición, tamaño y orden de capa.
        </div>
      )}
    </div>
  );
};
