import React from 'react';
import { Tv, Swords, Sparkles, BookOpen } from 'lucide-react';

export interface MasterBottomNavProps {
  activeTab: string;
  sessionViewMode: 'session' | 'classic';
  onSelectTab: (tab: any) => void;
}

export const MasterBottomNav: React.FC<MasterBottomNavProps> = ({
  activeTab,
  sessionViewMode,
  onSelectTab,
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación Móvil del Master">
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'live' ? 'active' : ''}`}
        onClick={() => onSelectTab('live')}
      >
        <Tv size={20} />
        <span>{sessionViewMode === 'session' ? 'Sesión' : 'En Vivo'}</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'combat' ? 'active' : ''}`}
        onClick={() => onSelectTab('combat')}
      >
        <Swords size={20} />
        <span>Combate</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'moments' ? 'active' : ''}`}
        onClick={() => onSelectTab('moments')}
      >
        <Sparkles size={20} />
        <span>Momentos</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'notes' || activeTab === 'library' ? 'active' : ''}`}
        onClick={() => onSelectTab('notes')}
      >
        <BookOpen size={20} />
        <span>Notas</span>
      </button>
    </nav>
  );
};
