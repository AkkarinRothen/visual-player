import React, { useState } from 'react';
import { Tv, Swords, Sparkles, MoreHorizontal, BookOpen, FolderOpen, Gamepad2, ImagePlus } from 'lucide-react';
import { AndroidSheet } from '../../ui/AndroidSheet';
import { ActionTile } from '../../ui/ActionTile';

export interface MasterBottomNavProps {
  activeTab: string;
  sessionViewMode: 'session' | 'classic';
  onSelectTab: (tab: any) => void;
  onOpenTools: () => void;
  onOpenScene: () => void;
}

export const MasterBottomNav: React.FC<MasterBottomNavProps> = ({
  activeTab,
  sessionViewMode,
  onSelectTab,
  onOpenTools,
  onOpenScene,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isSecondaryTabActive = activeTab === 'notes' || activeTab === 'library';

  const selectTab = (tab: string) => {
    setIsMoreOpen(false);
    onSelectTab(tab);
  };

  return (
    <>
      <AndroidSheet
        open={isMoreOpen}
        title="Más herramientas"
        eyebrow="Navegación"
        maxWidth={520}
        onOpenChange={setIsMoreOpen}
      >
        <div className="mobile-more-actions">
          <ActionTile
            compact
            icon={<Gamepad2 size={21} />}
            label="Herramientas de mesa"
            hint="Publicación y sistema"
            onClick={() => { setIsMoreOpen(false); onOpenTools(); }}
          />
          <ActionTile
            compact
            icon={<BookOpen size={21} />}
            label="Notas y dados"
            hint="Registro del DM"
            onClick={() => selectTab('notes')}
          />
          <ActionTile
            compact
            icon={<FolderOpen size={21} />}
            label="Campaña"
            hint="Biblioteca y recursos"
            onClick={() => selectTab('library')}
          />
        </div>
      </AndroidSheet>

      <nav className="mobile-bottom-nav" aria-label="Navegación Móvil del Master">
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'live' ? 'active' : ''}`}
        onClick={() => selectTab('live')}
      >
        <Tv size={20} />
        <span>{sessionViewMode === 'session' ? 'Sesión' : 'En Vivo'}</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item scene-entry"
        onClick={() => { setIsMoreOpen(false); onOpenScene(); }}
      >
        <ImagePlus size={20} />
        <span>Escena</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'combat' ? 'active' : ''}`}
        onClick={() => selectTab('combat')}
      >
        <Swords size={20} />
        <span>Combate</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'moments' ? 'active' : ''}`}
        onClick={() => selectTab('moments')}
      >
        <Sparkles size={20} />
        <span>Momentos</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${isSecondaryTabActive ? 'active' : ''}`}
        onClick={() => setIsMoreOpen(true)}
        aria-expanded={isMoreOpen}
      >
        <MoreHorizontal size={20} />
        <span>Más</span>
      </button>
      </nav>
    </>
  );
};
