import React from 'react';
import { Send, Sparkles } from 'lucide-react';
import type { TransferMode } from './transferSceneTypes';

interface TransferModeOptionsProps {
  transferMode: TransferMode;
  setTransferMode: (mode: TransferMode) => void;
  isTransferring: boolean;
  selectedSessionId: string;
  onClose: () => void;
  onConfirmTransfer: () => void;
}

export const TransferModeOptions: React.FC<TransferModeOptionsProps> = ({
  transferMode,
  setTransferMode,
  isTransferring,
  selectedSessionId,
  onClose,
  onConfirmTransfer,
}) => {
  return (
    <>
      {/* Opciones de Incorporación */}
      <div>
        <label
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#e2e8f0',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          Forma de Incorporación:
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px 12px',
              background:
                transferMode === 'repertoire'
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'rgba(255, 255, 255, 0.03)',
              border:
                transferMode === 'repertoire'
                  ? '1px solid #fbbf24'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="transferMode"
              value="repertoire"
              checked={transferMode === 'repertoire'}
              onChange={() => setTransferMode('repertoire')}
              style={{ marginTop: '2px', accentColor: '#d97706' }}
            />
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#fff', display: 'block' }}>
                Añadir al repertorio disponible (Recomendado)
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Guarda la escena en la lista de preparación para usarla cuando la historia lo
                requiera, sin alterar el borrador activo.
              </span>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px 12px',
              background:
                transferMode === 'staging'
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'rgba(255, 255, 255, 0.03)',
              border:
                transferMode === 'staging'
                  ? '1px solid #fbbf24'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="transferMode"
              value="staging"
              checked={transferMode === 'staging'}
              onChange={() => setTransferMode('staging')}
              style={{ marginTop: '2px', accentColor: '#d97706' }}
            />
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#fff', display: 'block' }}>
                Abrir como escena en preparación (Staging)
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Carga la escena de inmediato en el borrador de Staging de la sesión lista para revisar o
                publicar.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Advertencia informativa */}
      <div
        style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: '#bae6fd',
        }}
      >
        <Sparkles size={16} className="text-sky-400" style={{ flexShrink: 0 }} />
        <span>
          Se genera una copia independiente de la escena y sus personajes colocados, reutilizando las
          imágenes guardadas en tu dispositivo.
        </span>
      </div>

      {/* Acciones inferiores */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isTransferring}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#cbd5e1',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmTransfer}
          disabled={isTransferring || !selectedSessionId}
          style={{
            background:
              isTransferring || !selectedSessionId
                ? '#4b5563'
                : 'linear-gradient(135deg, #d97706, #b45309)',
            border: 'none',
            color: '#fff',
            borderRadius: '8px',
            padding: '8px 20px',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: isTransferring || !selectedSessionId ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Send size={15} />
          <span>{isTransferring ? 'Trasladando...' : 'Confirmar Traslado'}</span>
        </button>
      </div>
    </>
  );
};
