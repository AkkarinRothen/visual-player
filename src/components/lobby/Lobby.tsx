import React, { useState, useEffect, useRef } from 'react';
import { Tv, Smartphone, Sparkles, ArrowRight, Camera, X, RefreshCw, Trash2, Image, ShieldAlert } from 'lucide-react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { sessionRecoveryService, type RecoverySnapshot } from '../../services/sessionRecovery';

interface LobbyProps {
  onSelectRole: (role: 'display' | 'master', roomCode?: string) => void;
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

  const handleScanSuccess = (decodedText: string) => {
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
  };

  // Setup HTML5 QR Scanner
  useEffect(() => {
    if (showScanner) {
      setCameraError(null);
      try {
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
      } catch (err: any) {
        setCameraError('No se pudo acceder a la cámara en este dispositivo.');
      }

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [showScanner]);

  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-container-hidden');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
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
                  onClick={() => setShowCameraPrompt(true)}
                >
                  <Camera size={18} />
                  <span>Escanear Código QR</span>
                </button>
              </form>
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
        <div className="modal-overlay" onClick={() => setShowCameraPrompt(false)}>
          <div className="modal-content camera-prompt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                  <Camera size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Escanear QR de la Mesa</h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Conexión instantánea de Director</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCameraPrompt(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Se solicitará permiso para usar la cámara de tu dispositivo y leer el código QR mostrado en la pantalla de la Mesa.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowCameraPrompt(false);
                  setShowScanner(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                <Camera size={18} />
                <span>Activar Cámara y Escanear</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <Image size={16} />
                <span>Subir Foto del Código QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. QR Scanner Modal */}
      {showScanner && (
        <div className="modal-overlay" onClick={() => setShowScanner(false)}>
          <div className="modal-content scanner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Escanear QR de la Mesa</h2>
              <button className="modal-close" onClick={() => setShowScanner(false)}>
                <X size={20} />
              </button>
            </div>

            {cameraError ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', margin: '0 auto 16px' }}>
                  <ShieldAlert size={28} />
                </div>
                <h3 style={{ fontSize: '1.05rem', color: '#f87171', marginBottom: '8px' }}>Acceso a Cámara no Disponible</h3>
                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '20px' }}>{cameraError}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '10px',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Subir Imagen del QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScanner(false)}
                    style={{
                      padding: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Ingresar PIN Manualmente
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div id="qr-reader-container" className="qr-reader-view"></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>¿Problemas con la cámara?</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#60a5fa',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Image size={14} />
                    <span>Subir foto de QR</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
