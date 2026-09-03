import React, { useState } from 'react';
import type { Campaign, DMFavoriteItem, DMFavoriteType } from '../../../types';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Image as ImageIcon,
  Volume2,
  Swords,
  Bookmark,
  RotateCcw,
  Check,
} from 'lucide-react';
import { BUILTIN_SFX } from '../../../db';

interface ManageFavoritesModalProps {
  campaign: Campaign;
  favorites: DMFavoriteItem[];
  onSaveFavorites: (updated: DMFavoriteItem[]) => void;
  onClose: () => void;
}

export const DEFAULT_FAVORITES: DMFavoriteItem[] = [
  {
    id: 'fav-lightning',
    type: 'sfx',
    label: 'Rayo y Trueno',
    icon: 'Zap',
    color: '#38bdf8',
    targetId: 'thunder',
    params: { synthPreset: 'thunder' },
  },
  {
    id: 'fav-sword',
    type: 'sfx',
    label: 'Choque de Espadas',
    icon: 'Swords',
    color: '#fbbf24',
    targetId: 'sword_clash',
    params: { synthPreset: 'sword_clash' },
  },
  {
    id: 'fav-victory',
    type: 'sfx',
    label: 'Fanfarria',
    icon: 'Sparkles',
    color: '#34d399',
    targetId: 'victory_fanfare',
    params: { synthPreset: 'victory_fanfare' },
  },
  {
    id: 'fav-monster',
    type: 'sfx',
    label: 'Rugido Bestial',
    icon: 'Skull',
    color: '#f87171',
    targetId: 'monster_growl',
    params: { synthPreset: 'monster_growl' },
  },
];

export const ManageFavoritesModal: React.FC<ManageFavoritesModalProps> = ({
  campaign,
  favorites,
  onSaveFavorites,
  onClose,
}) => {
  const [items, setItems] = useState<DMFavoriteItem[]>(favorites.length > 0 ? favorites : DEFAULT_FAVORITES);
  const [addMode, setAddMode] = useState<DMFavoriteType | null>(null);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setItems(next);
  };

  const handleRemove = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleAddScene = (sceneId: string) => {
    const sc = campaign.scenes.find((s) => s.id === sceneId);
    if (!sc) return;
    const newItem: DMFavoriteItem = {
      id: `fav-sc-${Date.now()}`,
      type: 'scene',
      label: sc.name,
      icon: 'Image',
      color: '#818cf8',
      targetId: sc.id,
    };
    setItems([...items, newItem]);
    setAddMode(null);
  };

  const handleAddMacro = (macroId: string) => {
    const mc = campaign.macros?.find((m) => m.id === macroId);
    if (!mc) return;
    const newItem: DMFavoriteItem = {
      id: `fav-mc-${Date.now()}`,
      type: 'macro',
      label: mc.name,
      icon: 'Sparkles',
      color: '#f59e0b',
      targetId: mc.id,
    };
    setItems([...items, newItem]);
    setAddMode(null);
  };

  const handleAddSfx = (presetId: string, label: string) => {
    const newItem: DMFavoriteItem = {
      id: `fav-sfx-${Date.now()}`,
      type: 'sfx',
      label: label,
      icon: 'Volume2',
      color: '#38bdf8',
      targetId: presetId,
      params: { synthPreset: presetId },
    };
    setItems([...items, newItem]);
    setAddMode(null);
  };

  const handleResetToDefaults = () => {
    if (confirm('¿Restablecer los accesos rápidos a los valores predeterminados?')) {
      setItems(DEFAULT_FAVORITES);
    }
  };

  const handleSave = () => {
    onSaveFavorites(items);
    onClose();
  };

  const getItemTypeIcon = (type: DMFavoriteType) => {
    switch (type) {
      case 'scene':
        return <ImageIcon size={16} className="text-indigo-400" />;
      case 'macro':
        return <Sparkles size={16} className="text-amber-400" />;
      case 'sfx':
        return <Volume2 size={16} className="text-sky-400" />;
      case 'combatCommand':
        return <Swords size={16} className="text-rose-400" />;
      case 'checkpoint':
        return <Bookmark size={16} className="text-emerald-400" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content manage-favorites-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex-align-gap">
            <Sparkles size={20} className="text-amber-400" />
            <h2>Gestionar Favoritos y Acciones Rápidas</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="modal-subtitle">
          Configura los accesos rápidos de 1 toque en la barra de Sesión del DM.
        </p>

        {/* Action Type Add Selector */}
        <div className="add-favorites-toolbar">
          <span className="add-toolbar-title">Añadir a Favoritos:</span>
          <div className="add-chips-group">
            <button
              className={`add-chip ${addMode === 'scene' ? 'active' : ''}`}
              onClick={() => setAddMode(addMode === 'scene' ? null : 'scene')}
            >
              <ImageIcon size={14} />
              <span>Escena</span>
            </button>
            <button
              className={`add-chip ${addMode === 'macro' ? 'active' : ''}`}
              onClick={() => setAddMode(addMode === 'macro' ? null : 'macro')}
            >
              <Sparkles size={14} />
              <span>Momento</span>
            </button>
            <button
              className={`add-chip ${addMode === 'sfx' ? 'active' : ''}`}
              onClick={() => setAddMode(addMode === 'sfx' ? null : 'sfx')}
            >
              <Volume2 size={14} />
              <span>Sonido / SFX</span>
            </button>
          </div>
        </div>

        {/* Dropdown lists when adding */}
        {addMode === 'scene' && (
          <div className="add-items-picker-box">
            <span className="picker-header">Selecciona una escena:</span>
            <div className="picker-items-grid">
              {campaign.scenes.map((sc) => (
                <button
                  key={sc.id}
                  className="picker-item-btn"
                  onClick={() => handleAddScene(sc.id)}
                >
                  <span className="picker-item-name">{sc.name}</span>
                  <Plus size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        {addMode === 'macro' && (
          <div className="add-items-picker-box">
            <span className="picker-header">Selecciona un Momento cinemático:</span>
            <div className="picker-items-grid">
              {(campaign.macros || []).map((mc) => (
                <button
                  key={mc.id}
                  className="picker-item-btn"
                  onClick={() => handleAddMacro(mc.id)}
                >
                  <span className="picker-item-name">{mc.name}</span>
                  <Plus size={14} />
                </button>
              ))}
              {(!campaign.macros || campaign.macros.length === 0) && (
                <span className="text-xs text-slate-400">No hay momentos en esta campaña.</span>
              )}
            </div>
          </div>
        )}

        {addMode === 'sfx' && (
          <div className="add-items-picker-box">
            <span className="picker-header">Selecciona un efecto de sonido:</span>
            <div className="picker-items-grid">
              {BUILTIN_SFX.map((sfx) => (
                <button
                  key={sfx.id}
                  className="picker-item-btn"
                  onClick={() => handleAddSfx(sfx.synthPreset || sfx.id, sfx.name)}
                >
                  <span className="picker-item-name">{sfx.name}</span>
                  <Plus size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current Favorites List */}
        <div className="current-favorites-list">
          <span className="list-title">Favoritos Actuales ({items.length}/12)</span>
          {items.length === 0 ? (
            <p className="empty-favs-msg">No hay favoritos configurados. Añade uno arriba.</p>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="fav-item-row">
                <div className="fav-item-info">
                  {getItemTypeIcon(item.type)}
                  <span className="fav-item-label">{item.label}</span>
                  <span className="fav-item-type-badge">{item.type}</span>
                </div>
                <div className="fav-item-actions">
                  <button
                    className="fav-ctrl-btn"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    title="Mover arriba"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="fav-ctrl-btn"
                    disabled={index === items.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    title="Mover abajo"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="fav-ctrl-btn danger"
                    onClick={() => handleRemove(item.id)}
                    title="Eliminar de favoritos"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer flex-justify-between">
          <button className="btn-secondary" onClick={handleResetToDefaults}>
            <RotateCcw size={15} />
            <span>Valores Predeterminados</span>
          </button>
          <div className="flex-align-gap">
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSave}>
              <Check size={16} />
              <span>Guardar Favoritos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
