import React, { useState } from 'react';
import { Tv, Swords, Sparkles, MoreHorizontal, BookOpen, FolderOpen, Gamepad2, ImagePlus } from 'lucide-react';

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
      {isMoreOpen && (
        <div
          className="mobile-more-overlay"
          role="presentation"
          onClick={() => setIsMoreOpen(false)}
        >
          <section
            className="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-more-handle" aria-hidden="true" />
            <div className="mobile-more-header">
              <h2 id="mobile-more-title">Más herramientas</h2>
              <button
                type="button"
                className="mobile-more-close"
                onClick={() => setIsMoreOpen(false)}
                aria-label="Cerrar más herramientas"
              >
                ×
              </button>
            </div>
            <div className="mobile-more-actions">
              <button type="button" onClick={() => { setIsMoreOpen(false); onOpenTools(); }}>
                <Gamepad2 size={21} />
                <span>Herramientas de mesa</span>
              </button>
              <button type="button" onClick={() => selectTab('notes')}>
                <BookOpen size={21} />
                <span>Notas y dados</span>
              </button>
              <button type="button" onClick={() => selectTab('library')}>
                <FolderOpen size={21} />
                <span>Campaña y biblioteca</span>
              </button>
            </div>
          </section>
        </div>
      )}

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
