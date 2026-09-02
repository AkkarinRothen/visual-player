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
} from 'lucide-react';
import {
  connectionDiagnostics,
  type ConnectionMetrics,
  type DiagnosticEvent,
} from '../../services/connectionDiagnostics';

interface ConnectionDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerSyncTest?: () => Promise<{ matched: boolean; rttMs: number; error?: string }>;
}

export const ConnectionDiagnosticModal: React.FC<ConnectionDiagnosticModalProps> = ({
  isOpen,
  onClose,
  onTriggerSyncTest,
}) => {
  const [metrics, setMetrics] = useState<ConnectionMetrics>(connectionDiagnostics.getMetrics());
  const [events, setEvents] = useState<DiagnosticEvent[]>(connectionDiagnostics.getEvents());
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ matched: boolean; rttMs: number; error?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setMetrics(connectionDiagnostics.getMetrics());
      setEvents(connectionDiagnostics.getEvents());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const report = connectionDiagnostics.getSanitizedReport();
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
