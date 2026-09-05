import React, { useEffect } from 'react';
import { Monitor, Moon, Smartphone, Sun, X } from 'lucide-react';
import { getPlatformBridge } from '../../../platform';

export interface PartyModeControlProps {
  partyMode: boolean;
  setPartyMode: React.Dispatch<React.SetStateAction<boolean>>;
  partyMenuOpen: boolean;
  setPartyMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  partyControlsVisible: boolean;
  setPartyControlsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  partyKeepAwake: boolean;
  setPartyKeepAwake: React.Dispatch<React.SetStateAction<boolean>>;
  partyImmersive: boolean;
  setPartyImmersive: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PartyModeControl: React.FC<PartyModeControlProps> = ({
  partyMode,
  setPartyMode,
  partyMenuOpen,
  setPartyMenuOpen,
  partyControlsVisible,
  setPartyControlsVisible,
  partyKeepAwake,
  setPartyKeepAwake,
  partyImmersive,
  setPartyImmersive,
}) => {
  // Android tabletop mode: keep the control surface awake and optionally immersive.
  useEffect(() => {
    const bridge = getPlatformBridge();
    void bridge.screen.setKeepAwake(partyMode && partyKeepAwake);
    void bridge.screen.setImmersive(partyMode && partyImmersive);

    return () => {
      void bridge.screen.setKeepAwake(false);
      void bridge.screen.setImmersive(false);
    };
  }, [partyMode, partyKeepAwake, partyImmersive]);

  return (
    <aside className={`party-mode-control ${partyMenuOpen ? 'open' : ''}`} aria-label="Modo Partida">
      {partyMenuOpen && (
        <div className="party-mode-menu" role="dialog" aria-label="Opciones del Modo Partida">
          <div className="party-mode-menu-header">
            <div>
              <span className="party-mode-eyebrow">Android / Mesa</span>
              <strong>Modo Partida</strong>
            </div>
            <button
              type="button"
              className="party-mode-close"
              onClick={() => setPartyMenuOpen(false)}
              aria-label="Cerrar menú del Modo Partida"
            >
              <X size={17} />
            </button>
          </div>
          <button
            type="button"
            className={`party-mode-option ${partyKeepAwake ? 'active' : ''}`}
            onClick={() => setPartyKeepAwake((current) => !current)}
          >
            {partyKeepAwake ? <Sun size={18} /> : <Moon size={18} />}
            <span>Pantalla activa</span>
            <small>{partyKeepAwake ? 'Activada' : 'Apagada'}</small>
          </button>
          <button
            type="button"
            className={`party-mode-option ${partyImmersive ? 'active' : ''}`}
            onClick={() => setPartyImmersive((current) => !current)}
          >
            <Monitor size={18} />
            <span>Pantalla completa</span>
            <small>{partyImmersive ? 'Activada' : 'Apagada'}</small>
          </button>
          <button
            type="button"
            className={`party-mode-option ${!partyControlsVisible ? 'active' : ''}`}
            onClick={() => setPartyControlsVisible((current) => !current)}
          >
            <Smartphone size={18} />
            <span>{partyControlsVisible ? 'Ocultar controles' : 'Mostrar controles'}</span>
            <small>{partyControlsVisible ? 'Consola visible' : 'Solo escena'}</small>
          </button>
          <button
            type="button"
            className="party-mode-exit"
            onClick={() => {
              setPartyMode(false);
              setPartyMenuOpen(false);
              setPartyControlsVisible(true);
            }}
          >
            Salir del Modo Partida
          </button>
        </div>
      )}
      <button
        type="button"
        className={`party-mode-trigger ${partyMode ? 'active' : ''}`}
        onClick={() => {
          if (!partyMode) setPartyMode(true);
          setPartyMenuOpen((current) => !current);
        }}
        aria-expanded={partyMenuOpen}
        aria-label={partyMode ? 'Abrir opciones del Modo Partida' : 'Activar Modo Partida'}
      >
        <Monitor size={17} />
        <span>{partyMode ? 'Mesa' : 'Modo mesa'}</span>
      </button>
    </aside>
  );
};
