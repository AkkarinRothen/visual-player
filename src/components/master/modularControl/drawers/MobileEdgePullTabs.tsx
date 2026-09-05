import React from 'react';
import { Zap, FolderHeart } from 'lucide-react';

export interface MobileEdgePullTabsProps {
  isLeftOpen: boolean;
  isRightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  hasActiveFxAlert?: boolean;
}

export const MobileEdgePullTabs: React.FC<MobileEdgePullTabsProps> = ({
  isLeftOpen,
  isRightOpen,
  onToggleLeft,
  onToggleRight,
  hasActiveFxAlert = false,
}) => {
  return (
    <>
      {/* Solapa izquierda: Dramático & FX en Vivo */}
      <button
        type="button"
        className={`mobile-edge-pull-tab left ${isLeftOpen ? 'active' : ''} ${hasActiveFxAlert ? 'has-alert' : ''}`}
        onClick={onToggleLeft}
        aria-label={isLeftOpen ? 'Cerrar efectos dramáticos' : 'Abrir efectos dramáticos en vivo'}
        title="Efectos en Vivo (Rayo, Sacudir, Blackout, SFX, Dados)"
        data-testid="mobile-edge-tab-left"
      >
        <Zap size={18} className="pull-tab-icon" />
        <span className="pull-tab-label">FX</span>
        {hasActiveFxAlert && <span className="pull-tab-dot-alert" />}
      </button>

      {/* Solapa derecha: Recursos & Gestión */}
      <button
        type="button"
        className={`mobile-edge-pull-tab right ${isRightOpen ? 'active' : ''}`}
        onClick={onToggleRight}
        aria-label={isRightOpen ? 'Cerrar recursos y gestión' : 'Abrir recursos y gestión'}
        title="Recursos y Gestión (Favoritos, Escenas, NPCs, Notas)"
        data-testid="mobile-edge-tab-right"
      >
        <FolderHeart size={18} className="pull-tab-icon" />
        <span className="pull-tab-label">Mesa</span>
      </button>
    </>
  );
};
