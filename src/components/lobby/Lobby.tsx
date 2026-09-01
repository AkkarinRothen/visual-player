import React, { useState, useEffect, useRef } from 'react';
import { Tv, Smartphone, Sparkles, ArrowRight, Camera, X, RefreshCw, Trash2 } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { sessionRecoveryService, type RecoverySnapshot } from '../../services/sessionRecovery';

interface LobbyProps {
  onSelectRole: (role: 'display' | 'master', roomCode?: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onSelectRole }) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [pendingRecovery, setPendingRecovery] = useState<RecoverySnapshot | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const recovery = sessionRecoveryService.getPendingRecovery();
    if (recovery) {
      setPendingRecovery(recovery);
    }
  }, []);

  // Check URL query parameters for auto-join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      onSelectRole('master', joinCode.toUpperCase());
    }
  }, [onSelectRole]);

  // Setup HTML5 QR Scanner
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          let code = decodedText;
          if (decodedText.includes('join=')) {
            const url = new URL(decodedText);
            code = url.searchParams.get('join') || decodedText;
          }
          scanner.clear();
          setShowScanner(false);
          onSelectRole('master', code.toUpperCase().trim());
        },
        () => {
          // Ignored per frame scan error
        }
      );

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.warn);
        }
      };
    }
  }, [showScanner, onSelectRole]);

  const handleManualPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim()) {
      let code = pinInput.trim().toUpperCase();
      if (!code.startsWith('VP-') && code.length === 4) {
        code = `VP-${code}`;
      }
      onSelectRole('master', code);
    }
  };

  return (
    <div className="lobby-root">
      <div className="lobby-ambient-bg"></div>

      <div className="lobby-content">
        {/* Brand Hero Header */}
        <header className="lobby-header">
          <div className="lobby-icon-badge">
            <Sparkles size={28} className="text-amber-400" />
          </div>
          <h1 className="lobby-title">Visual Player</h1>
          <p className="lobby-subtitle">
            Plataforma visual inmersiva para sesiones de rol. Conecta tu tablet como pantalla para los jugadores y tu celular como control del Master.
          </p>
        </header>

        {/* Interrupted Session Recovery Banner */}
        {pendingRecovery && (
          <div className="recovery-banner" style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={24} className="text-amber-400 spin-slow" />
              <div>
                <strong style={{ color: '#fbbf24', fontSize: '1.05rem', display: 'block' }}>
                  Sesión interrumpida detectada ({pendingRecovery.roomId})
                </strong>
                <span style={{ color: '#d1d5db', fontSize: '0.85rem' }}>
                  Rol: {pendingRecovery.role === 'master' ? 'Game Master' : 'Pantalla'} • Escena: {pendingRecovery.lastSceneName || 'Aventura Activa'}
                  {pendingRecovery.combatActive ? ' • Combate en curso' : ''}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  sessionRecoveryService.clearRecovery();
                  setPendingRecovery(null);
                }}
                className="icon-btn"
                title="Descartar sesión previa"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9ca3af',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={() => onSelectRole(pendingRecovery.role, pendingRecovery.roomId)}
                style={{
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <span>Reanudar</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Role Cards Grid */}
        <div className="lobby-cards-grid">
          {/* Card 1: Tablet / Display */}
          <div className="role-card display-card" onClick={() => onSelectRole('display')}>
            <div className="role-card-inner">
              <div className="role-icon-box">
                <Tv size={36} />
              </div>
              <div className="role-badge">Para la Mesa / Jugadores</div>
              <h2 className="role-title">Pantalla de Escena</h2>
              <p className="role-desc">
                Pon esta pantalla en la tablet frente a tus jugadores para mostrar fondos animados, NPCs, lluvia, relámpagos y música ambiental.
              </p>
              <button className="role-btn btn-display">
                <span>Abrir en esta Pantalla</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Card 2: Phone / Master Controller */}
          <div className="role-card master-card">
            <div className="role-card-inner">
              <div className="role-icon-box">
                <Smartphone size={36} />
              </div>
              <div className="role-badge master-badge">Para el Game Master</div>
              <h2 className="role-title">Control Remoto</h2>
              <p className="role-desc">
                Controla la sesión en tiempo real desde tu celular: cambia escenas, invoca personajes, notas secretas y disparadores FX.
              </p>

              {/* Connect Form */}
              <form onSubmit={handleManualPinSubmit} className="pin-connect-form">
                <div className="pin-input-group">
                  <input
                    type="text"
                    placeholder="Código PIN (Ej. VP-8492)"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="lobby-pin-input"
                  />
                  <button type="submit" className="pin-submit-btn" title="Conectar">
                    <ArrowRight size={18} />
                  </button>
                </div>

                <div className="or-divider">
                  <span>o escanea con la cámara</span>
                </div>

                <button
                  type="button"
                  className="qr-scan-btn"
                  onClick={() => setShowScanner(true)}
                >
                  <Camera size={18} />
                  <span>Escanear Código QR</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="modal-overlay" onClick={() => setShowScanner(false)}>
          <div className="modal-content scanner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Escanear QR de la Tablet</h2>
              <button className="modal-close" onClick={() => setShowScanner(false)}>
                <X size={20} />
              </button>
            </div>
            <div id="qr-reader-container" className="qr-reader-view"></div>
            <p className="scanner-note">Apunta tu cámara al código QR mostrado en la pantalla de la Tablet.</p>
          </div>
        </div>
      )}
    </div>
  );
};
