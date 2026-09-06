import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface CombatTimerControlsProps {
  isTimerRunning: boolean;
  showTurnTimerToPlayers: boolean;
  localRemaining: number;
  onPrevTurn: () => void;
  onNextTurn: () => void;
  onToggleTimer: () => void;
  onAddTimerSeconds: (seconds: number) => void;
  onResetTimer: () => void;
  onToggleShowTimerToPlayers: () => void;
}

export const CombatTimerControls: React.FC<CombatTimerControlsProps> = ({
  isTimerRunning,
  showTurnTimerToPlayers,
  localRemaining,
  onPrevTurn,
  onNextTurn,
  onToggleTimer,
  onAddTimerSeconds,
  onResetTimer,
  onToggleShowTimerToPlayers,
}) => {
  return (
    <div className="turn-navigation-row">
      <button className="turn-nav-btn" onClick={onPrevTurn} title="Turno Anterior">
        <ChevronLeft size={20} />
        <span>Anterior</span>
      </button>

      {/* Turn Timer Controller */}
      <div className="turn-timer-ctrl-group">
        <div
          className={`turn-timer-badge ${localRemaining <= 10 && isTimerRunning ? 'urgent' : ''}`}
          onClick={onToggleTimer}
          title={isTimerRunning ? 'Pausar Reloj' : 'Iniciar Reloj'}
        >
          <Clock size={16} />
          <span>{localRemaining}s</span>
        </div>
        <button
          className="timer-mini-btn"
          onClick={() => onAddTimerSeconds(30)}
          title="Añadir +30 segundos al turno"
        >
          <Plus size={12} />
          <span className="text-[10px] font-bold">30s</span>
        </button>
        <button className="timer-mini-btn" onClick={onResetTimer} title="Reiniciar reloj">
          <RotateCcw size={14} />
        </button>
        <button
          className={`timer-mini-btn ${showTurnTimerToPlayers ? 'active' : ''}`}
          onClick={onToggleShowTimerToPlayers}
          title={
            showTurnTimerToPlayers
              ? 'Reloj visible en Mesa'
              : 'Reloj oculto a jugadores'
          }
        >
          {showTurnTimerToPlayers ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      <button className="turn-nav-btn primary" onClick={onNextTurn} title="Siguiente Turno">
        <span>Siguiente</span>
        <ChevronRight size={20} />
      </button>
    </div>
  );
};
