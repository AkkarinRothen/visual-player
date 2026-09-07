import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { X, Activity, Check, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { writeClipboardText } from '../../../services/clipboardService';
import { toast } from 'sonner';

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

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Visual Player · Sala ${roomCode}`,
        text: `Conectate a la sala ${roomCode} de Visual Player.`,
        url: joinUrl,
        dialogTitle: 'Compartir acceso a la sala',
      });
      toast.success('Acceso de sala compartido');
    } catch {
      if (Capacitor.isNativePlatform()) return;
      try {
        await writeClipboardText(joinUrl);
        toast.success('Enlace de sala copiado');
      } catch {
        toast.error('No se pudo compartir el acceso de la sala');
      }
    }
  };

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
            type="button"
            className="btn-secondary full"
            onClick={() => void handleShare()}
            aria-label="Compartir enlace de acceso a la sala"
          >
            <Share2 size={17} />
            <span>Compartir enlace</span>
          </button>
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
