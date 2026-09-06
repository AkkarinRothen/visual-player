import React from 'react';
import type { Scene, Combatant, CombatState } from '../../../types';
import { ArrowLeft, ArrowRight, Swords, Sparkles } from 'lucide-react';

export interface SessionContextualPanelProps {
  isCombatActive: boolean | undefined;
  combat: CombatState | undefined;
  currentCombatant: Combatant | null;
  activeScene: Scene | null;
  sceneToDisplayAsNext: Scene | null;
  onPrevCombatTurn?: () => void;
  onNextCombatTurn?: () => void;
  onSwitchToTab: (tab: 'live' | 'moments' | 'combat' | 'notes' | 'library') => void;
  onPrepareNext: (scene: Scene) => void;
}

export const SessionContextualPanel: React.FC<SessionContextualPanelProps> = ({
  isCombatActive,
  combat,
  currentCombatant,
  activeScene,
  sceneToDisplayAsNext,
  onPrevCombatTurn,
  onNextCombatTurn,
  onSwitchToTab,
  onPrepareNext,
}) => {
  return (
    <section
      className={`contextual-control-panel ${isCombatActive ? 'combat-context' : 'scene-context'}`}
      aria-label="Controles según el contexto"
    >
      <div className="contextual-control-heading">
        <div>
          <span className="contextual-control-eyebrow">Contexto actual</span>
          <strong>{isCombatActive ? 'Combate en curso' : 'Exploración y escena'}</strong>
        </div>
        <span className="contextual-control-status">
          {isCombatActive ? `Ronda ${combat?.round}` : activeScene?.name || 'Sin escena'}
        </span>
      </div>

      {isCombatActive ? (
        <div className="contextual-control-body">
          <div className="contextual-current-info">
            <span>Turno actual</span>
            <strong>{currentCombatant?.name || 'Sin combatiente'}</strong>
          </div>
          <div className="contextual-control-actions">
            <button type="button" onClick={onPrevCombatTurn} disabled={!onPrevCombatTurn}>
              <ArrowLeft size={17} />
              <span>Anterior</span>
            </button>
            <button
              type="button"
              className="contextual-primary"
              onClick={onNextCombatTurn}
              disabled={!onNextCombatTurn}
            >
              <span>Siguiente turno</span>
              <ArrowRight size={17} />
            </button>
            <button type="button" onClick={() => onSwitchToTab('combat')}>
              <Swords size={17} />
              <span>Ver combate</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="contextual-control-body">
          <div className="contextual-current-info">
            <span>Próximo paso sugerido</span>
            <strong>{sceneToDisplayAsNext?.name || 'Elegí una escena reciente'}</strong>
          </div>
          <div className="contextual-control-actions">
            {sceneToDisplayAsNext && (
              <button
                type="button"
                className="contextual-primary"
                onClick={() => onPrepareNext(sceneToDisplayAsNext)}
              >
                <span>Preparar siguiente</span>
                <ArrowRight size={17} />
              </button>
            )}
            <button type="button" onClick={() => onSwitchToTab('library')}>
              <Sparkles size={17} />
              <span>Buscar escena</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
