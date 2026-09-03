import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  X,
  Trash2,
  CheckCircle2,
  FileImage,
  FileAudio,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { StorageAuditReport } from '../../../types';
import { gameSessionService } from '../../../services/gameSessionService';

export interface StorageAuditModalProps {
  onClose: () => void;
}

export const StorageAuditModal: React.FC<StorageAuditModalProps> = ({ onClose }) => {
  const [report, setReport] = useState<StorageAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAudit = async () => {
    try {
      setIsLoading(true);
      const res = await gameSessionService.getStorageAudit();
      setReport(res);
    } catch (err: any) {
      console.error('Error al auditar almacenamiento:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const handlePurge = async () => {
    try {
      setIsPurging(true);
      setFeedback(null);
      const res = await gameSessionService.purgeOrphans();
      const formatBytes = (b: number) => {
        if (b < 1024) return `${b} B`;
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / (1024 * 1024)).toFixed(2)} MB`;
      };
      setFeedback(`Se eliminaron ${res.purgedCount} archivos huérfanos, recuperando ${formatBytes(res.reclaimedBytes)}.`);
      await loadAudit();
    } catch (err: any) {
      setFeedback(`Error al purgar archivos: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="modal-overlay session-library-overlay" onClick={onClose}>
      <div
        className="session-library-modal"
        style={{ maxWidth: 620 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="session-library-header">
          <div className="session-library-title">
            <HardDrive size={18} color="#a78bfa" />
            <h2>Auditoría de Almacenamiento & Recursos</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '70vh' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 12, color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" />
              <span>Escaneando campañas, sesiones, plantillas, presets y checkpoints...</span>
            </div>
          ) : report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Resumen Principal */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Espacio Ocupado</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#c4b5fd', marginTop: 4 }}>
                    {report.totalSizeFormatted}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {report.totalAssets} archivos totales
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: 11, color: '#34d399', textTransform: 'uppercase' }}>En Uso Activo</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 4 }}>
                    {report.inUseCount}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Campañas & Sesiones
                  </div>
                </div>

                <div style={{ padding: '12px', background: report.orphanCount > 0 ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.04)', borderRadius: 6, border: report.orphanCount > 0 ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, color: report.orphanCount > 0 ? '#f87171' : 'var(--text-muted)', textTransform: 'uppercase' }}>Recuperable</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: report.orphanCount > 0 ? '#f87171' : 'var(--text-muted)', marginTop: 4 }}>
                    {report.reclaimableFormatted}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {report.orphanCount} archivos huérfanos
                  </div>
                </div>
              </div>

              {feedback && (
                <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, fontSize: 12, color: '#34d399' }}>
                  {feedback}
                </div>
              )}

              {/* Desglose por tipo */}
              <div style={{ padding: '12px 14px', borderRadius: 6, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                  Desglose por Tipo de Medio
                </span>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <FileImage size={16} color="#60a5fa" />
                    <span>Imágenes y Retratos: <strong>{report.breakdownByType.images.count}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <FileAudio size={16} color="#fbbf24" />
                    <span>Música y Efectos SFX: <strong>{report.breakdownByType.audio.count}</strong></span>
                  </div>
                </div>
              </div>

              {/* Detalle de Referencias y Protección */}
              <div style={{ padding: '12px 14px', borderRadius: 6, background: 'rgba(96, 165, 250, 0.08)', border: '1px solid rgba(96, 165, 250, 0.2)', fontSize: 12, color: '#93c5fd', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Protección Integral de Referencias:</strong> El medidor inspecciona no solo tus campañas activas, sino también las preparaciones enviadas a la papelera (para que puedas restaurarlas sin romper imágenes) y los checkpoints históricos. La depuración solo borra archivos que ya no tienen ningún vínculo en toda la base de datos.
                </div>
              </div>

              {/* Botón de Purga */}
              {report.orphanCount > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#f87171' }}>
                      {report.orphanCount} archivo(s) huérfano(s) listos para eliminar
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Liberará {report.reclaimableFormatted} sin afectar ninguna preparación.
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handlePurge}
                    disabled={isPurging}
                    style={{
                      background: '#e11d48',
                      borderColor: '#be123c',
                      fontSize: 12,
                      padding: '6px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isPurging ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Liberar Espacio
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, color: '#34d399', fontSize: 12 }}>
                  <CheckCircle2 size={16} />
                  <span>Tu almacenamiento está 100% optimizado. Cero archivos huérfanos detectados.</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn-secondary" onClick={loadAudit} disabled={isLoading} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: 12, padding: '6px 16px' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
