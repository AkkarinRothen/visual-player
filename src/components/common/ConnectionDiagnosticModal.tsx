import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Copy,
  Check,
  RefreshCw,
  Zap,
  ShieldCheck,
  Wifi,
  Server,
  Hash,
  RotateCcw,
  Search,
  AlertTriangle,
} from 'lucide-react';
import {
  connectionDiagnostics,
  type ConnectionMetrics,
  type DiagnosticEvent,
} from '../../services/connectionDiagnostics';
import { sessionCommandBus } from '../../services/sessionCommandBus';
import type { DisplayState } from '../../types';
import type { AuditMesaReport } from '../../domain/protocol/types';

interface ConnectionDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerSyncTest?: () => Promise<{ matched: boolean; rttMs: number; error?: string }>;
  onResyncMesa?: () => void;
  liveState?: DisplayState;
}

export const ConnectionDiagnosticModal: React.FC<ConnectionDiagnosticModalProps> = ({
  isOpen,
  onClose,
  onTriggerSyncTest,
  onResyncMesa,
  liveState,
}) => {
  const [metrics, setMetrics] = useState<ConnectionMetrics>(connectionDiagnostics.getMetrics());
  const [events, setEvents] = useState<DiagnosticEvent[]>(connectionDiagnostics.getEvents());
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ matched: boolean; rttMs: number; error?: string } | null>(null);

  const [auditing, setAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditMesaReport | null>(null);
  const [showResyncConfirm, setShowResyncConfirm] = useState(false);
  const [resyncSuccess, setResyncSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setMetrics(connectionDiagnostics.getMetrics());
      setEvents(connectionDiagnostics.getEvents());
      const telem = sessionCommandBus.getMesaTelemetry();
      if (telem?.lastAuditReport) {
        setAuditReport(telem.lastAuditReport);
        setAuditing(false);
      }
    }, 800);

    const unsubTelem = sessionCommandBus.onMesaTelemetry((telem) => {
      if (telem?.lastAuditReport) {
        setAuditReport(telem.lastAuditReport);
        setAuditing(false);
      }
    });

    return () => {
      clearInterval(interval);
      unsubTelem();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const connReport = connectionDiagnostics.getSanitizedReport();
    const busReport = JSON.stringify(sessionCommandBus.getSanitizedDiagnosticReport(), null, 2);
    const combinedReport = `=== DIAGNÓSTICO DE CONEXIÓN Y MESA (VISUAL PLAYER) ===\nFecha: ${new Date().toISOString()}\n\n-- MÉTRICAS DE RED Y TRANSPORTE --\n${connReport}\n\n-- TELEMETRÍA Y COMANDOS DE MESA --\n${busReport}\n`;

    navigator.clipboard.writeText(combinedReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTriggerAudit = () => {
    setAuditing(true);
    sessionCommandBus.requestMesaAudit();
    setTimeout(() => {
      setAuditing(false);
    }, 4000);
  };

  const handleExecuteResync = () => {
    if (liveState) {
      sessionCommandBus.resyncMesa(liveState);
    }
    if (onResyncMesa) {
      onResyncMesa();
    }
    setShowResyncConfirm(false);
    setResyncSuccess(true);
    setTimeout(() => setResyncSuccess(false), 3000);
  };

  const handleRunTest = async () => {
    if (!onTriggerSyncTest || testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTriggerSyncTest();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ matched: false, rttMs: 0, error: err?.message || 'Fallo en la prueba' });
    } finally {
      setTesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ONLINE':
      case 'CONNECTED':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'DEGRADED':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'RECONNECTING':
      case 'RESYNCING':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'READ_ONLY':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                Diagnóstico de Conexión y Sincronización
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Correlation: {metrics.correlationId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Status Badge & Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3 rounded-xl border flex flex-col gap-1 ${getStatusColor(metrics.status)}`}>
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Estado</span>
              <span className="text-sm font-bold truncate">{metrics.status}</span>
            </div>

            <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950/40 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyan-400" /> Latencia (RTT)
              </span>
              <span className="text-sm font-bold text-neutral-200">{metrics.rttMs} ms</span>
            </div>

            <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950/40 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-indigo-400" /> Transporte ICE
              </span>
              <span className="text-sm font-bold text-neutral-200 uppercase">{metrics.iceCandidateType}</span>
            </div>

            <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950/40 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Hash className="w-3 h-3 text-emerald-400" /> Revisión
              </span>
              <span className="text-sm font-bold text-neutral-200">#{metrics.sessionRevision}</span>
            </div>
          </div>

          {/* Technical Details Cards */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5 text-xs font-mono space-y-2">
            <div className="flex justify-between items-center text-neutral-400">
              <span>SHA-256 Checksum:</span>
              <span className="text-neutral-200">{metrics.stateChecksumPrefix}...</span>
            </div>
            <div className="flex justify-between items-center text-neutral-400">
              <span>Lease Activo:</span>
              <span className="text-neutral-200">{metrics.activeLeaseId || 'Sin lease'}</span>
            </div>
            <div className="flex justify-between items-center text-neutral-400">
              <span>Peer ID:</span>
              <span className="text-neutral-200">{metrics.peerIdPartial || 'No conectado'}</span>
            </div>
          </div>

          {/* Test de Sincronización en Vivo */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" /> Test de Sincronización en Vivo
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Verifica latencia real, matching de checksum SHA-256 y confirmación de display sin alterar la partida.
                </p>
              </div>
              <button
                onClick={handleRunTest}
                disabled={testing || metrics.status === 'OFFLINE'}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayIcon className="w-3.5 h-3.5" />}
                {testing ? 'Comprobando...' : 'Ejecutar Test'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  testResult.matched
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.matched ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                  <span>
                    {testResult.matched
                      ? `¡Sincronización Perfecta! (Checksum coincide al 100%)`
                      : `Desincronización detectada: ${testResult.error || 'Checksums divergentes'}`}
                  </span>
                </div>
                <span className="font-mono text-[11px] opacity-80">{testResult.rttMs} ms</span>
              </div>
            )}
          </div>

          {/* Herramientas de Auditoría y Resincronización de Mesa */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-sky-400" /> Auditoría y Resincronización de Mesa
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Comprueba el estado exacto de la pantalla o restaura la instantánea pública sin repetir efectos sonoros ni alterar temporizadores.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerAudit}
                  disabled={auditing || metrics.status === 'OFFLINE'}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-neutral-700/60"
                  title="Consulta no destructiva de dispositivo, versión, revisión y recursos"
                >
                  {auditing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <Search className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{auditing ? 'Comprobando...' : 'Comprobar Mesa'}</span>
                </button>

                <button
                  onClick={() => setShowResyncConfirm(true)}
                  disabled={metrics.status === 'OFFLINE'}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Reenvía el estado público completo de forma limpia"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resincronizar Mesa</span>
                </button>
              </div>
            </div>

            {/* Confirmación de Resincronización con protección de partida */}
            {showResyncConfirm && (
              <div className="p-3 bg-sky-950/50 border border-sky-500/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-start gap-2 text-sky-200">
                  <AlertTriangle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sky-100">
                      ¿Deseas reenviar la instantánea pública de la sesión a la Mesa?
                    </p>
                    <p className="text-neutral-300">
                      Escena en vivo: <span className="font-semibold text-white">{liveState?.sceneName || 'Escena pública activa'}</span>.
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Se restaurará la escena sin repetir efectos de audio ni reiniciar el cronómetro de combate. <strong>No se enviará ningún borrador de Preparación en curso</strong>.
                    </p>
                    {liveState?.isBlackout && (
                      <p className="text-amber-300 font-medium text-[11px] flex items-center gap-1">
                        🛡️ Blackout activo: la pantalla continuará en negro protegido sin revelar contenido.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowResyncConfirm(false)}
                    className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecuteResync}
                    className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold text-xs rounded-md transition-colors"
                  >
                    Confirmar Resincronización
                  </button>
                </div>
              </div>
            )}

            {resyncSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Instantánea pública reenviada a la Mesa exitosamente (sin repetir sonidos y preservando cronómetros).</span>
              </div>
            )}

            {/* Reporte de Auditoría Recibido */}
            {auditReport && (
              <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/80 font-mono text-[11px] space-y-1.5 text-neutral-300">
                <div className="flex justify-between border-b border-neutral-800 pb-1 font-semibold text-neutral-200">
                  <span>MESA AUDITADA:</span>
                  <span className="text-sky-400">{auditReport.deviceId || 'Mesa'} (v{auditReport.appVersion})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-neutral-500">Revisión:</span> #{auditReport.revision}
                  </div>
                  <div>
                    <span className="text-neutral-500">Resolución:</span> {auditReport.viewport.width}×{auditReport.viewport.height} ({auditReport.viewport.aspectRatio})
                  </div>
                  <div>
                    <span className="text-neutral-500">Recursos:</span>{' '}
                    <span className={auditReport.assetsStatus.isReady ? 'text-emerald-400' : (auditReport.assetsStatus.failedCount && auditReport.assetsStatus.failedCount > 0) ? 'text-rose-400 font-semibold' : 'text-amber-400'}>
                      {auditReport.assetsStatus.isReady
                        ? '100% listos'
                        : (auditReport.assetsStatus.failedCount && auditReport.assetsStatus.failedCount > 0)
                        ? `${auditReport.assetsStatus.failedCount} fallidas (${auditReport.assetsStatus.missingCount} pendientes)`
                        : `${auditReport.assetsStatus.missingCount} pendientes`}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Audio:</span>{' '}
                    <span className={auditReport.audioStatus === 'enabled' ? 'text-emerald-400' : auditReport.audioStatus === 'interaction_required' ? 'text-amber-400' : 'text-rose-400'}>
                      {auditReport.audioStatus === 'enabled' ? 'Habilitado' : auditReport.audioStatus === 'interaction_required' ? 'Requiere toque' : 'Error'}
                    </span>
                  </div>
                </div>

                {/* Si hay recursos fallidos, permitir reintentar la descarga inmediatamente (Pregunta 4) */}
                {auditReport.assetsStatus.failedCount && auditReport.assetsStatus.failedCount > 0 && (
                  <div className="pt-2 mt-1 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-rose-400 text-xs">
                      ⚠️ Hay imágenes que no pudieron descargarse en la pantalla del grupo.
                    </span>
                    <button
                      onClick={handleExecuteResync}
                      className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[11px] font-medium transition-colors"
                    >
                      Reintentar Descarga
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline de Eventos Recientes */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-300">Últimos Eventos de Conexión</h3>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 max-h-44 overflow-y-auto font-mono text-[11px] space-y-1.5 custom-scrollbar">
              {events.length === 0 ? (
                <div className="text-neutral-500 py-2 text-center">No hay eventos registrados</div>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-neutral-400">
                    <span className="text-neutral-500 shrink-0">{e.timestamp.slice(11, 19)}</span>
                    <span className="text-amber-400/90 font-semibold shrink-0">[{e.category.toUpperCase()}]</span>
                    <span className="text-neutral-200 shrink-0">{e.name}</span>
                    <span className="text-neutral-500 truncate">{JSON.stringify(e.details)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-800 bg-neutral-950/50">
          <span className="text-[11px] text-neutral-500">
            Datos saneados sin contraseñas ni IP privadas completas.
          </span>
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-neutral-700/50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '¡Copiado!' : 'Copiar Diagnóstico'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
