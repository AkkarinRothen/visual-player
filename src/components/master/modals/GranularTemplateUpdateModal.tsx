import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  X,
  Check,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import type {
  TemplateUpdateDiffReport,
  GranularTemplateUpdateSelection,
} from '../../../types';
import { gameSessionService } from '../../../services/gameSessionService';

export interface GranularTemplateUpdateModalProps {
  sessionId: string;
  templateId: string;
  templateName: string;
  onClose: () => void;
  onApplied: () => void;
}

export const GranularTemplateUpdateModal: React.FC<GranularTemplateUpdateModalProps> = ({
  sessionId,
  templateId,
  templateName,
  onClose,
  onApplied,
}) => {
  const [diff, setDiff] = useState<TemplateUpdateDiffReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, 'keep_session' | 'overwrite_with_template' | 'create_copy'>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        setIsLoading(true);
        const res = await gameSessionService.getTemplateDiff(sessionId, templateId);
        setDiff(res);
        // Por defecto pre-seleccionar los items nuevos o modificados
        const newOrModIds = res.items
          .filter((i) => i.changeType === 'new' || i.changeType === 'modified')
          .map((i) => i.id);
        setSelectedIds(newOrModIds);

        const initialRes: Record<string, 'keep_session' | 'overwrite_with_template' | 'create_copy'> = {};
        res.items.forEach((i) => {
          if (i.changeType === 'modified') {
            initialRes[i.id] = 'keep_session'; // Por defecto seguro: no pisar trabajo del DM
          }
        });
        setResolutions(initialRes);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error al obtener diferencias');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiff();
  }, [sessionId, templateId]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResolutionChange = (id: string, value: 'keep_session' | 'overwrite_with_template' | 'create_copy') => {
    setResolutions((prev) => ({ ...prev, [id]: value }));
  };

  const handleApply = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsApplying(true);
      setErrorMsg(null);
      const selection: GranularTemplateUpdateSelection = {
        selectedItemIds: selectedIds,
        modifiedResolution: resolutions,
      };
      await gameSessionService.applyGranularTemplateUpdate(sessionId, templateId, selection);
      onApplied();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al aplicar actualización');
      setIsApplying(false);
    }
  };

  return (
    <div className="modal-overlay session-library-overlay" onClick={onClose}>
      <div
        className="session-library-modal"
        style={{ maxWidth: 680 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="session-library-header">
          <div className="session-library-title">
            <GitCompare size={18} color="#a78bfa" />
            <h2>Sincronizar desde Plantilla: {templateName}</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '70vh' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 12, color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" />
              <span>Comparando versiones y analizando diferencias de escenas y diálogos...</span>
            </div>
          ) : diff ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Banner de Seguridad */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'rgba(96, 165, 250, 0.12)',
                  border: '1px solid rgba(96, 165, 250, 0.3)',
                  color: '#93c5fd',
                  fontSize: 12,
                }}
              >
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Punto de control automático previo:</strong> El sistema creará un checkpoint de seguridad antes de aplicar los cambios para que puedas revertir si lo necesitas. El progreso jugado, daño y notas se preservan intactos.
                </span>
              </div>

              {errorMsg && (
                <div style={{ padding: '8px 12px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 6, fontSize: 12, color: '#f87171' }}>
                  {errorMsg}
                </div>
              )}

              {/* Lista de Diferencias */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {diff.items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isMod = item.changeType === 'modified';
                  const isNew = item.changeType === 'new';

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 6,
                        background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            style={{ accentColor: '#8b5cf6' }}
                          />
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-main)' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            ({item.type === 'scene' ? 'Escena' : item.type === 'conversation' ? 'Diálogo' : 'Documento'})
                          </span>
                        </label>

                        {/* Insignia de Tipo de Cambio */}
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            background: isNew
                              ? 'rgba(16, 185, 129, 0.2)'
                              : isMod
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(255, 255, 255, 0.08)',
                            color: isNew ? '#34d399' : isMod ? '#fbbf24' : 'var(--text-muted)',
                          }}
                        >
                          {isNew ? 'Nueva' : isMod ? 'Modificada' : 'Idéntica'}
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 24 }}>
                        {item.description}
                      </div>

                      {/* Selector de resolución para modificaciones */}
                      {isMod && isSelected && (
                        <div
                          style={{
                            marginLeft: 24,
                            padding: '8px 12px',
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: 6,
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>
                            ¿Cómo resolver la modificación?
                          </span>
                          <select
                            value={resolutions[item.id] || 'keep_session'}
                            onChange={(e) => handleResolutionChange(item.id, e.target.value as any)}
                            style={{
                              background: '#1a1e36',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 4,
                              color: 'var(--text-main)',
                              fontSize: 11,
                              padding: '3px 8px',
                              outline: 'none',
                            }}
                          >
                            <option value="keep_session">Conservar mi versión (Recomendado)</option>
                            <option value="overwrite_with_template">Sobrescribir con la plantilla</option>
                            <option value="create_copy">Crear copia paralela</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {selectedIds.length} elemento(s) seleccionado(s)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={onClose} disabled={isApplying} style={{ fontSize: 12, padding: '6px 14px' }}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={handleApply}
              disabled={isApplying || selectedIds.length === 0}
              style={{ fontSize: 12, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isApplying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Aplicar Actualización Granular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
