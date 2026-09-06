import React from 'react';
import { CheckCircle, Compass } from 'lucide-react';
import type { TransferredSessionInfo } from './transferSceneTypes';

interface TransferSceneSuccessViewProps {
  sceneName: string;
  transferredSession: TransferredSessionInfo;
  onClose: () => void;
  onOpenSession?: (sessionId: string) => void;
}

export const TransferSceneSuccessView: React.FC<TransferSceneSuccessViewProps> = ({
  sceneName,
  transferredSession,
  onClose,
  onOpenSession,
}) => {
  return (
    <div style={{ padding: '32px 24px', textAlign: 'center' }}>
      <CheckCircle size={52} className="text-emerald-400" style={{ margin: '0 auto 16px' }} />
      <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#fff' }}>
        ¡Escena incorporada con éxito!
      </h4>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.5 }}>
        La escena <strong>{sceneName}</strong> ha sido trasladada a la sesión{' '}
        <strong style={{ color: '#fbbf24' }}>«{transferredSession.name}»</strong>{' '}
        {transferredSession.mode === 'staging'
          ? 'y cargada en el borrador de Staging.'
          : 'como parte de su repertorio disponible.'}
        <br />
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          No se ha publicado nada en la Mesa de los jugadores.
        </span>
      </p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#e2e8f0',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Seguir en el Taller
        </button>
        {onOpenSession && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSession(transferredSession.id);
            }}
            style={{
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              border: 'none',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Compass size={16} />
            <span>Abrir Preparación</span>
          </button>
        )}
      </div>
    </div>
  );
};
