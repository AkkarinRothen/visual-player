import React, { useState } from 'react';
import type { ActionExecutionStatus, Campaign, DMFavoriteItem } from '../../types';
import {
  Sparkles,
  Image as ImageIcon,
  Volume2,
  Swords,
  Bookmark,
  Check,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { DEFAULT_FAVORITES } from './modals/ManageFavoritesModal';

interface SessionFavoritesBarProps {
  campaign: Campaign | null;
  favorites: DMFavoriteItem[];
  onExecuteFavorite: (item: DMFavoriteItem) => Promise<boolean>;
  onOpenManageFavorites: () => void;
}

export const SessionFavoritesBar: React.FC<SessionFavoritesBarProps> = ({
  campaign,
  favorites,
  onExecuteFavorite,
  onOpenManageFavorites,
}) => {
  const [activeStatusMap, setActiveStatusMap] = useState<Record<string, ActionExecutionStatus>>({});

  const itemsToRender = favorites.length > 0 ? favorites : (campaign?.favorites && campaign.favorites.length > 0) ? campaign.favorites : DEFAULT_FAVORITES;

  const handleExecute = async (item: DMFavoriteItem) => {
    if (activeStatusMap[item.id] === 'sending') return;

    setActiveStatusMap((prev) => ({ ...prev, [item.id]: 'sending' }));

    try {
      const success = await onExecuteFavorite(item);
      if (success) {
        setActiveStatusMap((prev) => ({ ...prev, [item.id]: 'ack' }));
        setTimeout(() => {
          setActiveStatusMap((prev) => ({ ...prev, [item.id]: 'idle' }));
        }, 2000);
      } else {
        setActiveStatusMap((prev) => ({ ...prev, [item.id]: 'rejected' }));
        setTimeout(() => {
          setActiveStatusMap((prev) => ({ ...prev, [item.id]: 'idle' }));
        }, 3000);
      }
    } catch {
      setActiveStatusMap((prev) => ({ ...prev, [item.id]: 'rejected' }));
      setTimeout(() => {
        setActiveStatusMap((prev) => ({ ...prev, [item.id]: 'idle' }));
      }, 3000);
    }
  };

  // Check if item target is valid
  const isItemAvailable = (item: DMFavoriteItem): boolean => {
    if (!campaign) return true;
    if (item.type === 'scene' && item.targetId) {
      return campaign.scenes.some((s) => s.id === item.targetId);
    }
    if (item.type === 'macro' && item.targetId) {
      return (campaign.macros || []).some((m) => m.id === item.targetId);
    }
    return true;
  };

  const renderIcon = (item: DMFavoriteItem, status: ActionExecutionStatus) => {
    if (status === 'sending') {
      return <Loader2 size={18} className="animate-spin text-amber-400" />;
    }
    if (status === 'ack') {
      return <Check size={18} className="text-emerald-400" />;
    }
    if (status === 'rejected') {
      return <AlertCircle size={18} className="text-rose-400" />;
    }

    if (item.icon === 'Zap') return <Zap size={18} className="text-sky-400" />;
    if (item.icon === 'Swords') return <Swords size={18} className="text-amber-400" />;
    if (item.icon === 'Sparkles') return <Sparkles size={18} className="text-purple-400" />;

    switch (item.type) {
      case 'scene':
        return <ImageIcon size={18} className="text-indigo-400" />;
      case 'macro':
        return <Sparkles size={18} className="text-amber-400" />;
      case 'sfx':
        return <Volume2 size={18} className="text-sky-400" />;
      case 'combatCommand':
        return <Swords size={18} className="text-rose-400" />;
      case 'checkpoint':
        return <Bookmark size={18} className="text-emerald-400" />;
      default:
        return <Sparkles size={18} />;
    }
  };

  return (
    <div className="session-favorites-bar-wrapper" role="region" aria-label="Favoritos del DM">
      <div className="favorites-bar-header">
        <div className="flex-align-gap">
          <Sparkles size={14} className="text-amber-400" />
          <span className="fav-bar-title">FAVORITOS DE SESIÓN (1 TOQUE)</span>
        </div>
        <button
          className="manage-favs-btn"
          onClick={onOpenManageFavorites}
          title="Personalizar barra de favoritos"
        >
          <SlidersHorizontal size={13} />
          <span>Gestionar</span>
        </button>
      </div>

      <div className="session-favorites-scroll-row">
        {itemsToRender.map((item) => {
          const available = isItemAvailable(item);
          const status = activeStatusMap[item.id] || 'idle';

          return (
            <button
              key={item.id}
              className={`fav-action-tile ${status} ${!available ? 'unavailable' : ''}`}
              onClick={() => available && handleExecute(item)}
              disabled={!available || status === 'sending'}
              title={
                !available
                  ? 'Elemento no encontrado en esta campaña'
                  : `Ejecutar favorito: ${item.label}`
              }
              aria-label={`Favorito: ${item.label}`}
            >
              <div className="fav-tile-icon-box">{renderIcon(item, status)}</div>
              <span className="fav-tile-label">{item.label}</span>
              {status === 'ack' && <span className="fav-ack-badge">ACK</span>}
              {!available && <span className="fav-broken-badge">No disponible</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
