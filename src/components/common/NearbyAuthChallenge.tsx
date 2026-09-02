import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Timer } from 'lucide-react';

/**
 * NearbyAuthChallenge.tsx
 *
 * Pantalla superpuesta para la verificación de authenticationDigits de Nearby.
 *
 * Reglas de seguridad:
 * - Muestra exactamente los dígitos entregados por Nearby, sin transformar.
 * - Nunca llama acceptConnection() hasta que AMBOS dispositivos aprueben.
 * - El overlay bloquea todo control y mutación hasta CONTROL_READY.
 * - Los dígitos NO se registran en logs, timeline, diagnóstico ni portapapeles.
 * - Soporta expiración de 60 segundos, cancelación y límite de intentos.
 * - Accesible con TalkBack, control remoto y toque.
 */

const AUTH_TIMEOUT_SEC = 60;
const MAX_ATTEMPTS = 3;

export interface NearbyAuthChallengeProps {
  isVisible: boolean;
  /** Nombre del dispositivo remoto (saneado, sin identificadores Nearby completos) */
  remoteDeviceName: string;
  /**
   * Los 4 dígitos de autenticación de Nearby.
   * NUNCA se deben pasar ni registrar en ningún log externo.
   */
  authenticationDigits: string;
  onApprove: () => void;
  onReject: (reason: 'user_rejected' | 'timeout' | 'max_attempts') => void;
  /** Rol del dispositivo local — determina el texto del UI */
  localRole: 'display' | 'master';
  attemptCount?: number;
}

export const NearbyAuthChallenge: React.FC<NearbyAuthChallengeProps> = ({
  isVisible,
  remoteDeviceName,
  authenticationDigits,
  onApprove,
  onReject,
  localRole,
  attemptCount = 1,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(AUTH_TIMEOUT_SEC);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset timer cuando el overlay se abre
  useEffect(() => {
    if (!isVisible) {
      setSecondsLeft(AUTH_TIMEOUT_SEC);
      setIsProcessing(false);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onReject('timeout');
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleApprove = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    onApprove();
  }, [isProcessing, onApprove]);

  const handleReject = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);
    onReject('user_rejected');
  }, [isProcessing, onReject]);

  if (!isVisible) return null;

  const isExpired = secondsLeft === 0;
  const isTooManyAttempts = attemptCount >= MAX_ATTEMPTS;
  const isBlocked = isExpired || isTooManyAttempts || isProcessing;

  const timerColor =
    secondsLeft > 30 ? '#10b981' : secondsLeft > 15 ? '#f59e0b' : '#ef4444';

  const deviceLabel = localRole === 'display' ? 'Mesa (Tablet/PC)' : 'Control del DM (celular)';
  const remoteLabel = localRole === 'display' ? 'celular del DM' : 'la Mesa';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verificación de conexión segura"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.96)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'rgba(23, 23, 23, 0.97)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          color: '#f5f5f5',
          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={28} color="#f59e0b" />
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#fbbf24',
            }}
          >
            Verificación de Seguridad
          </h2>
        </div>

        <p style={{ margin: 0, fontSize: '13px', color: '#a3a3a3', textAlign: 'center' }}>
          <strong style={{ color: '#f5f5f5' }}>{deviceLabel}</strong> detectó a{' '}
          <strong style={{ color: '#f5f5f5' }}>{remoteDeviceName || remoteLabel}</strong>.
          Confirma que el código que aparece en{' '}
          <strong>{remoteLabel}</strong> es exactamente el mismo.
        </p>

        {/* Digits Display */}
        <div
          aria-label={`Código de verificación: ${authenticationDigits.split('').join(', ')}`}
          style={{
            fontSize: '48px',
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: '0.25em',
            color: '#fbbf24',
            background: 'rgba(0,0,0,0.6)',
            padding: '16px 32px',
            borderRadius: '16px',
            border: '2px solid rgba(251, 191, 36, 0.35)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {authenticationDigits}
        </div>

        <p style={{ margin: 0, fontSize: '12px', color: '#737373', textAlign: 'center' }}>
          Este código aparece <strong>simultáneamente</strong> en ambos dispositivos y cambia en
          cada conexión. Rechaza si no coincide.
        </p>

        {/* Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: timerColor,
            fontWeight: 600,
          }}
          aria-live="polite"
          aria-label={`Tiempo restante: ${secondsLeft} segundos`}
        >
          <Timer size={16} color={timerColor} />
          {isExpired ? 'Tiempo agotado' : `Expira en ${secondsLeft}s`}
        </div>

        {/* Attempt Warning */}
        {attemptCount > 1 && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '12px',
              color: '#fca5a5',
              textAlign: 'center',
            }}
            role="alert"
          >
            {isTooManyAttempts
              ? 'Máximo de intentos alcanzado. Por favor reinicia la conexión.'
              : `Intento ${attemptCount} de ${MAX_ATTEMPTS}.`}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '4px' }}>
          <button
            id="nearby-auth-reject"
            disabled={isBlocked}
            onClick={handleReject}
            aria-label="Rechazar conexión"
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              background: isBlocked ? 'rgba(239,68,68,0.08)' : 'rgba(239, 68, 68, 0.18)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              color: isBlocked ? '#6b7280' : '#fca5a5',
              fontWeight: 700,
              fontSize: '15px',
              cursor: isBlocked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <XCircle size={18} />
            Rechazar
          </button>

          <button
            id="nearby-auth-approve"
            disabled={isBlocked}
            onClick={handleApprove}
            aria-label="Aprobar conexión"
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              background: isBlocked
                ? 'rgba(16,185,129,0.08)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: isBlocked ? '#6b7280' : '#ffffff',
              fontWeight: 700,
              fontSize: '15px',
              cursor: isBlocked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: isBlocked ? 'none' : '0 4px 12px rgba(16,185,129,0.35)',
            }}
          >
            <CheckCircle2 size={18} />
            Aprobar
          </button>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: '#525252',
            textAlign: 'center',
          }}
        >
          La sesión se mantiene bloqueada hasta que ambos dispositivos confirmen.
        </p>
      </div>
    </div>
  );
};
