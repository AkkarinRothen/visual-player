import React from 'react';
import { X, Activity, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface MasterQRModalProps {
  isOpen: boolean;
  joinUrl: string;
  roomCode: string;
  latencyMs: number;
  onReconnect: () => void;
  onClose: () => void;
}

export const MasterQRModal: React.FC<MasterQRModalProps> = ({
  isOpen,
  joinUrl,
  roomCode,
  latencyMs,
  onReconnect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Emparejar Dispositivos</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="qr-container">
          <div className="qr-card">
            <QRCodeSVG value={joinUrl} size={180} level="M" />
          </div>
          <div className="pin-box">
            <span>PIN de la Sala</span>
            <strong className="pin-code">{roomCode}</strong>
          </div>
          {latencyMs > 0 && (
            <div className="latency-info-pill">
              <Activity size={14} className="text-emerald-400" />
              <span>Latencia de red: <strong>{latencyMs}ms</strong></span>
            </div>
          )}
          <p className="qr-instructions">
            Abre la aplicación en tu <strong>Tablet o TV</strong> y selecciona modo &quot;Pantalla&quot;, o escanea este QR.
          </p>
          <button
            className="btn-primary full"
            onClick={() => {
              onReconnect();
              onClose();
            }}
          >
            <Check size={18} />
            <span>Reconectar Ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
