import React from 'react';
import { EyeOff, QrCode, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { pairingEngine, type PairingPhaseInfo } from '../../services/pairingEngine';

interface DisplayPairingOverlayProps {
  isVisible: boolean;
  roomCode: string;
  pairingInfo: PairingPhaseInfo;
  onMinimize: () => void;
}

export const DisplayPairingOverlay: React.FC<DisplayPairingOverlayProps> = ({
  isVisible,
  roomCode,
  pairingInfo,
  onMinimize,
}) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.85) 0%, rgba(2, 6, 23, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'rgba(23, 23, 23, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          color: '#f5f5f5',
          position: 'relative',
        }}
      >
        {/* Top Close / Minimize Button */}
        <button
          onClick={onMinimize}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '8px',
            color: '#94a3b8',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
          title="Ocultar QR y ver Escena"
        >
          <EyeOff size={14} />
          <span>Ocultar</span>
        </button>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#f59e0b',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <QrCode size={18} />
          <span>Sala de Jugadores Lista</span>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
          {pairingInfo.phase === 'PIN_CHALLENGE_PENDING'
            ? 'Autorización de Master Requerida'
            : 'Conecta el Control del Master (DM)'}
        </h2>

        {/* PIN Challenge Confirmation Card */}
        {pairingInfo.phase === 'PIN_CHALLENGE_PENDING' ? (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <ShieldAlert size={36} className="text-amber-400" />
            <p style={{ fontSize: '13px', color: '#d4d4d4', margin: 0 }}>
              Un dispositivo está intentando conectarse con el PIN. Confirma que este código coincide con el de tu celular:
            </p>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 800,
                letterSpacing: '0.2em',
                color: '#fbbf24',
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.5)',
                padding: '8px 24px',
                borderRadius: '12px',
                border: '1px solid rgba(251, 191, 36, 0.4)',
              }}
            >
              {pairingEngine.getActiveChallenge()?.challengeCode || '--- ---'}
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button
                onClick={() => pairingEngine.resetToIdle('Rechazado por el usuario en la Mesa')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Rechazar
              </button>
              <button
                onClick={() => {
                  const challenge = pairingEngine.getActiveChallenge();
                  if (challenge) {
                    pairingEngine.verifyPinChallenge(challenge.challengeCode);
                    pairingEngine.advancePhase('CONTROL_READY', 'Aprobado manualmente en la Mesa');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Aprobar Master
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* QR Code Container */}
            <div
              style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                display: 'inline-flex',
              }}
            >
              <QRCodeSVG
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/?join=${roomCode}&role=master`
                    : roomCode
                }
                size={170}
                level="M"
              />
            </div>

            {/* Room Code Big Display */}
            <div>
              <p style={{ fontSize: '12px', color: '#a3a3a3', margin: '0 0 6px 0' }}>
                O introduce este PIN en tu celular:
              </p>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  color: '#fbbf24',
                  fontFamily: 'monospace',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '8px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                }}
              >
                {roomCode}
              </div>
            </div>
          </>
        )}

        {/* Pairing Progress Bar */}
        {pairingInfo.phase !== 'IDLE_WAITING' && (
          <div style={{ width: '100%', marginTop: '4px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#fbbf24',
                marginBottom: '4px',
              }}
            >
              <span>{pairingInfo.message}</span>
              <span>{pairingInfo.progressPercent}%</span>
            </div>
            <div
              style={{
                height: '6px',
                width: '100%',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pairingInfo.progressPercent}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#737373', margin: 0, lineHeight: 1.4 }}>
          Abre <strong>visual-player.vercel.app</strong> en tu celular, pulsa &quot;Escanear QR&quot; o introduce el PIN
          para controlar escenas, combates y música.
        </p>
      </div>
    </div>
  );
};
