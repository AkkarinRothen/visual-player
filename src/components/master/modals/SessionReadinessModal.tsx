import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Download,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { SessionReadinessCheck, SessionReadinessCheckItem } from '../../../types';
import { gameSessionService } from '../../../services/gameSessionService';
import { downloadExternalAssetsForSession, db } from '../../../db';

export interface SessionReadinessModalProps {
  sessionId: string;
  sessionName: string;
  onClose: () => void;
  onOpenSceneSelector?: () => void;
  onOpenCharacterEditor?: (characterId?: string) => void;
  onOpenConversationEditor?: () => void;
}

export const SessionReadinessModal: React.FC<SessionReadinessModalProps> = ({
  sessionId,
  sessionName,
  onClose,
  onOpenSceneSelector,
  onOpenCharacterEditor,
  onOpenConversationEditor,
}) => {
  const [report, setReport] = useState<SessionReadinessCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixingAssets, setIsFixingAssets] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const res = await gameSessionService.checkReadiness(sessionId);
      setReport(res);
    } catch (err: any) {
      console.error('Error al evaluar preparación:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [sessionId]);

  const handleExecuteAction = async (item: SessionReadinessCheckItem) => {
    if (!item.action) return;

    if (item.action.type === 'download_missing_assets') {
      try {
        setIsFixingAssets(true);
        setFixMessage('Descargando y cacheando recursos externos...');
        const session = await db.sessions.get(sessionId);
        if (session) {
          const preflight = await downloadExternalAssetsForSession(
            (item.actionPayload?.missingUrls || []).map((u: string) => ({
              url: u,
              context: 'Recurso de sesión',
              type: 'image' as const,
            }))
          );
          setFixMessage(`Descarga completada: ${preflight.downloadedCount} guardados.`);
          await loadReport();
        }
      } catch (err: any) {
        setFixMessage(`Error al descargar: ${err.message}`);
      } finally {
        setIsFixingAssets(false);
      }
      return;
    }

    if (item.action.type === 'select_starting_scene') {
      onClose();
      onOpenSceneSelector?.();
      return;
    }

    if (item.action.type === 'fix_character_avatar') {
      onClose();
      onOpenCharacterEditor?.(item.actionPayload?.characterIds?.[0]);
      return;
    }

    if (item.action.type === 'repair_dialogue') {
      onClose();
      onOpenConversationEditor?.();
      return;
    }
  };

  return (
    <div className="modal-overlay session-library-overlay" onClick={onClose}>
      <div
        className="session-library-modal"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="session-library-header">
          <div className="session-library-title">
            <Sparkles size={18} color="#a78bfa" />
            <h2>Lista para Jugar — {sessionName}</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '75vh' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 12, color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" />
              <span>Evaluando archivos, personajes, diálogos y dependencias...</span>
            </div>
          ) : report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Resumen Principal */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: report.isReady
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(245, 158, 11, 0.12)',
                  border: `1px solid ${
                    report.isReady ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                  }`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: report.isReady ? '#34d399' : '#fbbf24' }}>
                    {report.isReady ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{report.isReady ? 'Preparación Lista para Jugar' : 'Atención Requerida'}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    {report.summary}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: report.score >= 80 ? '#34d399' : report.score >= 50 ? '#fbbf24' : '#f87171' }}>
                    {report.score}/100
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Puntaje de Solidez
                  </div>
                </div>
              </div>

              {fixMessage && (
                <div style={{ padding: '8px 12px', background: 'rgba(96, 165, 250, 0.15)', border: '1px solid rgba(96, 165, 250, 0.3)', borderRadius: 6, fontSize: 12, color: '#93c5fd' }}>
                  {fixMessage}
                </div>
              )}

              {/* Lista de Verificaciones y Acciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {report.checks.map((c) => {
                  const isPass = c.status === 'pass';
                  const isWarn = c.status === 'warn';
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isPass ? (
                            <CheckCircle2 size={16} color="#34d399" />
                          ) : isWarn ? (
                            <AlertTriangle size={16} color="#fbbf24" />
                          ) : (
                            <XCircle size={16} color="#f87171" />
                          )}
                          <span style={{ fontSize: 13, fontWeight: 600, color: isPass ? 'var(--text-main)' : isWarn ? '#fbbf24' : '#f87171' }}>
                            {c.title}
                          </span>
                        </div>
                        {c.action && (
                          <button
                            className="btn-primary"
                            onClick={() => handleExecuteAction(c)}
                            disabled={isFixingAssets}
                            style={{
                              fontSize: 11,
                              padding: '3px 10px',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isFixingAssets && c.action.type === 'download_missing_assets' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : c.action.type === 'download_missing_assets' ? (
                              <Download size={12} />
                            ) : c.action.type === 'fix_character_avatar' ? (
                              <ImageIcon size={12} />
                            ) : (
                              <MessageSquare size={12} />
                            )}
                            {c.action.label}
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.detail}
                      </p>
                      {c.action && (
                        <div style={{ fontSize: 11, color: '#a78bfa', opacity: 0.9 }}>
                          💡 <em>{c.action.description}</em>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: 12, padding: '6px 16px' }}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
