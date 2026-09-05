import React from 'react';
import {
  X,
  FolderHeart,
  Star,
  Image as ImageIcon,
  Users,
  FileText,
  Bookmark,
  Check,
  Plus,
} from 'lucide-react';
import type { Campaign, Scene, Character, DMFavoriteItem } from '../../../../types';

export interface MobileResourcesEdgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  favorites?: DMFavoriteItem[];
  onExecuteFavorite?: (item: DMFavoriteItem) => Promise<boolean> | boolean;
  onSelectScene?: (scene: Scene) => void;
  onInvokeCharacter?: (char: Character) => void;
  onOpenNotes?: () => void;
  onOpenRevelationJournal?: () => void;
  onOpenManageFavorites?: () => void;
  activeSceneId?: string;
}

export const MobileResourcesEdgeDrawer: React.FC<MobileResourcesEdgeDrawerProps> = ({
  isOpen,
  onClose,
  campaign,
  favorites = [],
  onExecuteFavorite,
  onSelectScene,
  onInvokeCharacter,
  onOpenNotes,
  onOpenRevelationJournal,
  onOpenManageFavorites,
  activeSceneId,
}) => {
  if (!isOpen) return null;

  const scenes = campaign?.scenes || [];
  const campaignCharacters = campaign?.characters || [];
  const activeFavorites =
    favorites.length > 0
      ? favorites
      : campaign?.favorites && campaign.favorites.length > 0
      ? campaign.favorites
      : [];

  const handleSelectScene = (scene: Scene) => {
    onSelectScene?.(scene);
    onClose();
  };

  const handleInvokeChar = (char: Character) => {
    onInvokeCharacter?.(char);
    onClose();
  };

  const handleRunFavorite = (fav: DMFavoriteItem) => {
    onExecuteFavorite?.(fav);
    onClose();
  };

  return (
    <>
      {/* Telón de fondo translúcido */}
      <div
        className="mobile-edge-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel deslizante derecho */}
      <aside
        className="mobile-edge-drawer right"
        role="dialog"
        aria-label="Recursos y Gestión"
        data-testid="mobile-resources-drawer"
      >
        {/* Cabecera */}
        <div className="mobile-edge-drawer-header">
          <div className="mobile-edge-drawer-title-group">
            <FolderHeart size={18} className="text-sky-400" />
            <div>
              <h3>Recursos y Gestión</h3>
              <p>Cambio rápido de mesa</p>
            </div>
          </div>
          <button
            type="button"
            className="mobile-edge-drawer-close-btn"
            onClick={onClose}
            aria-label="Cerrar panel de recursos"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo con scroll táctil */}
        <div className="mobile-edge-drawer-body">
          {/* 1. FAVORITOS DEL DM */}
          <div className="mobile-edge-section">
            <div className="mobile-edge-section-header">
              <span className="mobile-edge-section-title">
                <Star size={14} className="text-amber-400 inline mr-1" />
                Favoritos del DM
              </span>
              {onOpenManageFavorites && (
                <button
                  type="button"
                  className="mobile-edge-sub-action"
                  onClick={() => {
                    onOpenManageFavorites();
                    onClose();
                  }}
                >
                  Gestionar
                </button>
              )}
            </div>
            {activeFavorites.length > 0 ? (
              <div className="mobile-fav-list">
                {activeFavorites.slice(0, 6).map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    className="mobile-fav-chip"
                    onClick={() => handleRunFavorite(fav)}
                    title={fav.label}
                  >
                    <span className="mobile-fav-chip-icon">✦</span>
                    <span className="mobile-fav-chip-name">{fav.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mobile-edge-empty-text">Sin favoritos guardados aún.</p>
            )}
          </div>

          {/* 2. ESCENAS DE LA CAMPAÑA */}
          <div className="mobile-edge-section">
            <span className="mobile-edge-section-title">
              <ImageIcon size={14} className="text-sky-400 inline mr-1" />
              Escenas de Campaña ({scenes.length})
            </span>
            {scenes.length > 0 ? (
              <div className="mobile-scenes-list">
                {scenes.map((scene) => {
                  const isActive = scene.id === activeSceneId;
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      className={`mobile-scene-item ${isActive ? 'active-scene' : ''}`}
                      onClick={() => handleSelectScene(scene)}
                    >
                      <div
                        className="mobile-scene-thumb"
                        style={{
                          backgroundImage: scene.backgroundUrl
                            ? `url(${scene.backgroundUrl})`
                            : undefined,
                        }}
                      >
                        {isActive && <Check size={14} className="active-check" />}
                      </div>
                      <div className="mobile-scene-info">
                        <span className="mobile-scene-name">{scene.name}</span>
                        {isActive && <span className="mobile-scene-badge">En Mesa</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mobile-edge-empty-text">No hay escenas en esta campaña.</p>
            )}
          </div>

          {/* 3. INVOCAR NPC DE BIBLIOTECA */}
          <div className="mobile-edge-section">
            <span className="mobile-edge-section-title">
              <Users size={14} className="text-emerald-400 inline mr-1" />
              Invocar Personaje ({campaignCharacters.length})
            </span>
            {campaignCharacters.length > 0 ? (
              <div className="mobile-npcs-list">
                {campaignCharacters.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    className="mobile-npc-item"
                    onClick={() => handleInvokeChar(char)}
                    title={`Invocar a ${char.name} a la mesa`}
                  >
                    <div
                      className="mobile-npc-avatar"
                      style={{
                        backgroundImage: char.defaultAvatarUrl
                          ? `url(${char.defaultAvatarUrl})`
                          : undefined,
                      }}
                    >
                      {!char.defaultAvatarUrl && char.name.charAt(0)}
                    </div>
                    <div className="mobile-npc-info">
                      <span className="mobile-npc-name">{char.name}</span>
                      {char.roleOrTitle && (
                        <span className="mobile-npc-role">{char.roleOrTitle}</span>
                      )}
                    </div>
                    <Plus size={16} className="text-emerald-400 ml-auto" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mobile-edge-empty-text">No hay personajes en la biblioteca.</p>
            )}
          </div>

          {/* 4. NOTAS Y APUNTES DEL DM */}
          {(onOpenNotes || onOpenRevelationJournal) && (
            <div className="mobile-edge-section">
              <span className="mobile-edge-section-title">
                <FileText size={14} className="text-purple-400 inline mr-1" />
                Notas y Revelaciones
              </span>
              <div className="mobile-edge-aux-buttons">
                {onOpenNotes && (
                  <button
                    type="button"
                    className="mobile-aux-btn"
                    onClick={() => {
                      onOpenNotes();
                      onClose();
                    }}
                  >
                    <FileText size={15} />
                    <span>Notas del DM</span>
                  </button>
                )}
                {onOpenRevelationJournal && (
                  <button
                    type="button"
                    className="mobile-aux-btn"
                    onClick={() => {
                      onOpenRevelationJournal();
                      onClose();
                    }}
                  >
                    <Bookmark size={15} />
                    <span>Diario de Revelaciones</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
