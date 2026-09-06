import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tv, Smartphone, Sparkles, ArrowRight, Camera, RefreshCw, Trash2, Image, ShieldAlert, Compass } from 'lucide-react';
import { sessionRecoveryService, type RecoverySnapshot } from '../../services/sessionRecovery';
import type { Role } from '../../types';
import heroImage from '../../assets/hero.png';
import { VisualDialog } from '../ui/VisualDialog';

import type { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';

interface LobbyProps {
  onSelectRole: (role: Role, roomCode?: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onSelectRole }) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [showCameraPrompt, setShowCameraPrompt] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pendingRecovery, setPendingRecovery] = useState<RecoverySnapshot | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    sessionRecoveryService.getPendingRecovery().then((recovery) => {
      if (recovery) {
        setPendingRecovery(recovery);
      }
    });
  }, []);

  // Check URL query parameters for auto-join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      onSelectRole('master', joinCode.toUpperCase());
    }
  }, [onSelectRole]);

  const handleScanSuccess = useCallback((decodedText: string) => {
    let code = decodedText.trim();
    try {
      if (decodedText.includes('join=')) {
        if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
          const url = new URL(decodedText);
          code = url.searchParams.get('join') || '';
          if (!code && url.hash) {
            const hashParams = new URLSearchParams(url.hash.replace('#', ''));
            code = hashParams.get('join') || '';
          }
        } else {
          const searchParams = new URLSearchParams(decodedText.replace(/^.*\?/, '').replace(/^.*#/, ''));
          code = searchParams.get('join') || decodedText;
        }
      }
    } catch {
      // Keep plain text
    }

    if (code) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
      setShowScanner(false);
      setShowCameraPrompt(false);
      onSelectRole('master', code.toUpperCase().trim());
    }
  }, [onSelectRole]);

  // Setup HTML5 QR Scanner
  useEffect(() => {
    if (showScanner) {
      setCameraError(null);
      let cancelled = false;
      try {
        import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
          if (cancelled) return;
          const scanner = new Html5QrcodeScanner(
            'qr-reader-container',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );
          scannerRef.current = scanner;

          scanner.render(
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            (errorMessage) => {
              if (errorMessage && errorMessage.includes('NotAllowedError')) {
                setCameraError('Permiso de cámara denegado. Puedes ingresar el PIN o subir una foto del QR.');
              }
            }
          );
        }).catch(() => {
          setCameraError('No se pudo acceder a la cámara en este dispositivo.');
        });
      } catch {
        setCameraError('No se pudo acceder a la cámara en este dispositivo.');
      }

      return () => {
        cancelled = true;
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [handleScanSuccess, showScanner]);

  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode: Html5Qrcode = new Html5Qrcode('qr-reader-container-hidden');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch {
      setCameraError('No se detectó un código QR válido en la imagen seleccionada.');
    }
  };

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
      <img src={heroImage} alt="" className="lobby-hero-art" aria-hidden="true" />
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
          <div className="recovery-banner">
            <div className="recovery-banner-info">
              <RefreshCw size={22} className="text-amber-400 spin-slow shrink-0" />
              <div>
                <strong className="recovery-banner-title">
                  Sesión previa detectada ({pendingRecovery.roomId})
                </strong>
                <span className="recovery-banner-subtitle">
                  Rol: {pendingRecovery.role === 'master' ? 'Game Master' : 'Pantalla'} • Escena: {pendingRecovery.lastSceneName || 'Aventura Activa'}
                  {pendingRecovery.combatActive ? ' • Combate en curso' : ''}
                </span>
              </div>
            </div>

            <div className="recovery-banner-actions">
              <button
                onClick={() => {
                  sessionRecoveryService.clearRecovery();
                  setPendingRecovery(null);
                }}
                className="recovery-banner-discard"
                title="Descartar sesión previa"
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={() => onSelectRole(pendingRecovery.role, pendingRecovery.roomId)}
                className="recovery-banner-resume"
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
          <div className="role-card display-card">
            <div className="role-card-inner">
              <div className="role-icon-box">
                <Tv size={36} />
              </div>
              <div className="role-badge">Para la Mesa / Jugadores</div>
              <h2 className="role-title">Pantalla de Escena</h2>
              <p className="role-desc">
                Pon esta pantalla en la tablet frente a tus jugadores para mostrar fondos animados, NPCs, lluvia, relámpagos y música ambiental.
              </p>
              <button className="role-btn btn-display" onClick={() => onSelectRole('display')}>
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
                    onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                    maxLength={7}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
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
                  onClick={() => setShowCameraPrompt(true)}
                >
                  <Camera size={18} />
                  <span>Escanear Código QR</span>
                </button>
              </form>
            </div>
          </div>

          {/* Card 3: Taller de Preparación & Biblioteca */}
          <div className="role-card workshop-card" onClick={() => onSelectRole('workshop')} style={{ cursor: 'pointer' }}>
            <div className="role-card-inner">
              <div className="role-icon-box workshop-icon-box" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)' }}>
                <Compass size={36} />
              </div>
              <div className="role-badge" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)' }}>
                Crear sin conectar Mesa
              </div>
              <h2 className="role-title">Preparar Escenas</h2>
              <p className="role-desc">
                Crea escenarios, importa fotos locales de tu celular, organiza personajes y ten tus campañas listas sin necesidad de conectar una Mesa.
              </p>
              <button className="role-btn btn-workshop" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fff', border: 'none' }}>
                <span>Abrir Taller de Preparación</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden container for image file scanning */}
      <div id="qr-reader-container-hidden" style={{ display: 'none' }}></div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileScan}
      />

      {/* 1. Camera Permission Explanation Pre-Modal */}
      {showCameraPrompt && !showScanner && (
        <VisualDialog
          open
          title="Escanear QR de la Mesa"
          className="camera-prompt-modal"
          onOpenChange={(open) => {
            if (!open) setShowCameraPrompt(false);
          }}
        >
            <div className="camera-dialog-intro">
              <div className="camera-dialog-icon">
                <Camera size={22} />
              </div>
              <span>Conexión instantánea de Director</span>
            </div>

            <p className="camera-dialog-copy">
              Se solicitará permiso para usar la cámara de tu dispositivo y leer el código QR mostrado en la pantalla de la Mesa.
            </p>

            <div className="camera-dialog-actions">
              <button
                type="button"
                onClick={() => {
                  setShowCameraPrompt(false);
                  setShowScanner(true);
                }}
                className="camera-primary-action"
              >
                <Camera size={18} />
                <span>Activar Cámara y Escanear</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="camera-secondary-action"
              >
                <Image size={16} />
                <span>Subir Foto del Código QR</span>
              </button>
            </div>
        </VisualDialog>
      )}

      {/* 2. QR Scanner Modal */}
      {showScanner && (
        <VisualDialog
          open
          title="Escanear QR de la Mesa"
          className="scanner-modal"
          onOpenChange={(open) => {
            if (!open) setShowScanner(false);
          }}
        >
            {cameraError ? (
              <div className="camera-error-panel">
                <div className="camera-error-icon">
                  <ShieldAlert size={28} />
                </div>
                <h3>Acceso a Cámara no Disponible</h3>
                <p>{cameraError}</p>
                <div className="camera-error-actions">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="camera-primary-action"
                  >
                    Subir Imagen del QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScanner(false)}
                    className="camera-secondary-action"
                  >
                    Ingresar PIN Manualmente
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div id="qr-reader-container" className="qr-reader-view"></div>
                <div className="scanner-fallback-row">
                  <span>¿Problemas con la cámara?</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="scanner-fallback-button"
                  >
                    <Image size={14} />
                    <span>Subir foto de QR</span>
                  </button>
                </div>
              </>
            )}
        </VisualDialog>
      )}
    </div>
  );
};
