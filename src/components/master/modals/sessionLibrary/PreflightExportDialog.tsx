import React from 'react';
import type { GameSession, ExportPreflightReport } from '../../../../types';
import { Download, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';

export interface PreflightExportDialogProps {
  session: GameSession;
  loading: boolean;
  progress: { current: number; total: number; context: string } | null;
  report: ExportPreflightReport | null;
  onClose: () => void;
  onExecuteExport: (downloadExternal: boolean) => void;
  onRetry: () => void;
}

export const PreflightExportDialog: React.FC<PreflightExportDialogProps> = ({
  session,
  loading,
  progress,
  report,
  onClose,
  onExecuteExport,
  onRetry,
}) => {
  return (
    <div className="session-dialog-overlay" role="dialog" aria-modal="true">
      <div className="session-dialog session-preflight-dialog">
        <div className="session-dialog-header">
          <Download size={18} />
          <h3>Diagnóstico de Exportación</h3>
        </div>
        <p className="session-dialog-lead">
          Preparación: <strong>{session.name}</strong>
        </p>

        {loading ? (
          <div className="preflight-loading-block">
            <RefreshCw size={24} className="animate-spin text-amber-400" />
            <p>Verificando dependencias y descargando archivos externos…</p>
            {progress && (
              <div className="preflight-progress-box">
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                  />
                </div>
                <span className="progress-text">
                  {progress.current} / {progress.total}: {progress.context}
                </span>
              </div>
            )}
          </div>
        ) : report ? (
          <div className="preflight-report-block">
            {report.canExportOfflineComplete ? (
              <div className="preflight-badge-status complete">
                <ShieldCheck size={18} />
                <div>
                  <strong>Paquete 100% Autocontenido</strong>
                  <span>Todos los {report.totalAssets} archivos están listos para uso sin conexión.</span>
                </div>
              </div>
            ) : (
              <div className="preflight-badge-status warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>Exportación Incompleta</strong>
                  <span>{report.missing.length} archivo(s) no pudieron descargarse o no están disponibles localmente.</span>
                </div>
              </div>
            )}

            {report.missing.length > 0 && (
              <div className="preflight-missing-list">
                <h4>Archivos Faltantes (requieren internet si no se resuelven):</h4>
                <ul>
                  {report.missing.map((m, idx) => (
                    <li key={idx}>
                      <span className="missing-context">{m.context}</span>
                      <span className="missing-reason">({m.errorReason || 'Inaccesible'})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="session-dialog-actions">
              <button className="btn-dialog-cancel" onClick={onClose}>
                Cancelar
              </button>
              {report.canExportOfflineComplete ? (
                <button className="btn-dialog-confirm" onClick={() => onExecuteExport(true)}>
                  <Download size={14} /> Descargar Paquete Completo
                </button>
              ) : (
                <>
                  <button className="btn-dialog-retry" onClick={onRetry}>
                    <RefreshCw size={14} /> Reintentar descarga
                  </button>
                  <button className="btn-dialog-warn" onClick={() => onExecuteExport(false)}>
                    <Download size={14} /> Exportar con aviso
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
