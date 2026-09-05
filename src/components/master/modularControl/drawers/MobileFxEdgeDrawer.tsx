import React, { useState } from 'react';
import {
  X,
  Zap,
  Activity,
  Moon,
  Scroll,
  Dices,
  Swords,
  Flame,
  Sparkles,
  Bell,
  DoorClosed,
  Skull,
} from 'lucide-react';
import { soundEngine } from '../../../../services/soundEngine';

export interface MobileFxEdgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerLightning: () => void;
  onTriggerShake: () => void;
  onToggleBlackout: () => void;
  isBlackout?: boolean;
  onToggleBanner: () => void;
  isBannerVisible?: boolean;
  onTriggerSfx?: (preset: string) => void;
}

const SFX_BUTTONS = [
  { id: 'sword_clash', label: 'Espada', icon: Swords, color: '#f59e0b' },
  { id: 'fireball', label: 'Fuego', icon: Flame, color: '#ef4444' },
  { id: 'magic_spell', label: 'Hechizo', icon: Sparkles, color: '#a855f7' },
  { id: 'thunder', label: 'Trueno', icon: Zap, color: '#eab308' },
  { id: 'bell_toll', label: 'Campana', icon: Bell, color: '#94a3b8' },
  { id: 'monster_roar', label: 'Rugido', icon: Skull, color: '#f87171' },
  { id: 'door_creak', label: 'Puerta', icon: DoorClosed, color: '#78716c' },
];

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

export const MobileFxEdgeDrawer: React.FC<MobileFxEdgeDrawerProps> = ({
  isOpen,
  onClose,
  onTriggerLightning,
  onTriggerShake,
  onToggleBlackout,
  isBlackout = false,
  onToggleBanner,
  isBannerVisible = false,
  onTriggerSfx,
}) => {
  const [activeButtonId, setActiveButtonId] = useState<string | null>(null);
  const [lastDiceRoll, setLastDiceRoll] = useState<{ sides: number; result: number } | null>(null);

  if (!isOpen) return null;

  const handleAction = (id: string, fn: () => void) => {
    setActiveButtonId(id);
    fn();
    setTimeout(() => setActiveButtonId((prev) => (prev === id ? null : prev)), 400);
  };

  const handlePlaySfx = (preset: string) => {
    try {
      soundEngine.playSynth(preset);
    } catch {
      // AudioContext unavailable in test/headless
    }
    onTriggerSfx?.(preset);
    setActiveButtonId(`sfx_${preset}`);
    setTimeout(() => setActiveButtonId((prev) => (prev === `sfx_${preset}` ? null : prev)), 400);
  };

  const handleRollDice = (sides: number) => {
    try {
      soundEngine.playSynth('heartbeat');
    } catch {
      // AudioContext unavailable in test/headless
    }
    const result = Math.floor(Math.random() * sides) + 1;
    setLastDiceRoll({ sides, result });
    setActiveButtonId(`dice_${sides}`);
    setTimeout(() => setActiveButtonId((prev) => (prev === `dice_${sides}` ? null : prev)), 400);
  };

  return (
    <>
      {/* Telón de fondo translúcido para cerrar con toque */}
      <div
        className="mobile-edge-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel deslizante izquierdo */}
      <aside
        className="mobile-edge-drawer left"
        role="dialog"
        aria-label="Efectos en Vivo"
        data-testid="mobile-fx-drawer"
      >
        {/* Cabecera */}
        <div className="mobile-edge-drawer-header">
          <div className="mobile-edge-drawer-title-group">
            <Zap size={18} className="text-amber-400" />
            <div>
              <h3>Efectos en Vivo</h3>
              <p>Dispará combos con un toque</p>
            </div>
          </div>
          <button
            type="button"
            className="mobile-edge-drawer-close-btn"
            onClick={onClose}
            aria-label="Cerrar panel de efectos"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable para el pulgar */}
        <div className="mobile-edge-drawer-body">
          {/* 1. ACCIONES CINEMÁTICAS PRIMARIAS */}
          <div className="mobile-edge-section">
            <span className="mobile-edge-section-title">Impacto Cinemático</span>
            <div className="mobile-edge-action-grid">
              {/* Rayo */}
              <button
                type="button"
                className={`mobile-fx-btn lightning ${activeButtonId === 'lightning' ? 'triggered' : ''}`}
                onClick={() => handleAction('lightning', onTriggerLightning)}
                aria-label="Lanzar relámpago"
              >
                <Zap size={22} />
                <span>Rayo</span>
              </button>

              {/* Sacudir */}
              <button
                type="button"
                className={`mobile-fx-btn shake ${activeButtonId === 'shake' ? 'triggered' : ''}`}
                onClick={() => handleAction('shake', onTriggerShake)}
                aria-label="Sacudir escenario"
              >
                <Activity size={22} />
                <span>Sacudir</span>
              </button>

              {/* Blackout */}
              <button
                type="button"
                className={`mobile-fx-btn blackout ${isBlackout ? 'is-active' : ''}`}
                onClick={() => handleAction('blackout', onToggleBlackout)}
                aria-label={isBlackout ? 'Encender pantalla' : 'Apagón total'}
              >
                <Moon size={22} />
                <span>{isBlackout ? 'Luz' : 'Apagón'}</span>
                {isBlackout && <span className="mobile-fx-badge">ON</span>}
              </button>

              {/* Cartel */}
              <button
                type="button"
                className={`mobile-fx-btn banner ${isBannerVisible ? 'is-active' : ''}`}
                onClick={() => handleAction('banner', onToggleBanner)}
                aria-label={isBannerVisible ? 'Ocultar cartel' : 'Mostrar cartel'}
              >
                <Scroll size={22} />
                <span>Cartel</span>
                {isBannerVisible && <span className="mobile-fx-badge">ON</span>}
              </button>
            </div>
          </div>

          {/* 2. DADOS RÁPIDOS */}
          <div className="mobile-edge-section">
            <div className="mobile-edge-section-header">
              <span className="mobile-edge-section-title">Dados Rápidos</span>
              {lastDiceRoll && (
                <div className="mobile-dice-result-pill" data-testid="mobile-dice-result">
                  <Dices size={14} />
                  <span>d{lastDiceRoll.sides}: <strong>{lastDiceRoll.result}</strong></span>
                </div>
              )}
            </div>
            <div className="mobile-dice-grid">
              {DICE_TYPES.map((sides) => {
                const isSelected = activeButtonId === `dice_${sides}`;
                return (
                  <button
                    key={sides}
                    type="button"
                    className={`mobile-dice-btn ${isSelected ? 'rolled' : ''}`}
                    onClick={() => handleRollDice(sides)}
                    title={`Tirar d${sides}`}
                  >
                    d{sides}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SONIDOS RÁPIDOS (SFX) */}
          <div className="mobile-edge-section">
            <span className="mobile-edge-section-title">Sonidos Rápidos (SFX)</span>
            <div className="mobile-sfx-grid">
              {SFX_BUTTONS.map((sfx) => {
                const IconComponent = sfx.icon;
                const isTriggered = activeButtonId === `sfx_${sfx.id}`;
                return (
                  <button
                    key={sfx.id}
                    type="button"
                    className={`mobile-sfx-btn ${isTriggered ? 'triggered' : ''}`}
                    onClick={() => handlePlaySfx(sfx.id)}
                    style={{ '--sfx-accent': sfx.color } as React.CSSProperties}
                  >
                    <IconComponent size={16} style={{ color: sfx.color }} />
                    <span>{sfx.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
