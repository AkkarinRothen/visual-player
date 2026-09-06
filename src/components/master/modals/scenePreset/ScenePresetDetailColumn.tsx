import React from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ScenePresetDetailColumnProps } from './scenePresetTypes';

export const ScenePresetDetailColumn: React.FC<ScenePresetDetailColumnProps> = ({
  selectedPreset,
  isScanning,
  dependencyReport,
  charResolutions,
  setCharResolutions,
  convResolution,
  setConvResolution,
  confirmReplaceStaged,
  setConfirmReplaceStaged,
  isInstantiating,
  onInstantiate,
}) => {
  return (
    <div className="preset-detail-column">
      {selectedPreset ? (
        <>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, color: '#f1f5f9' }}>
              {selectedPreset.name}
            </h3>
            {selectedPreset.description && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 8px' }}>
                {selectedPreset.description}
              </p>
            )}
          </div>

          {/* Dependency Scan Banner */}
          {isScanning ? (
            <div className="dep-report-banner ready" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={14} className="animate-spin" />
              <span>Analizando dependencias de archivos...</span>
            </div>
          ) : dependencyReport ? (
            <div
              className={`dep-report-banner ${
                dependencyReport.isFullySelfContained ? 'ready' : 'warning'
              }`}
            >
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {dependencyReport.isFullySelfContained ? (
                  <ShieldCheck size={15} />
                ) : (
                  <AlertTriangle size={15} />
                )}
                <span>
                  {dependencyReport.isFullySelfContained
                    ? 'Pieza 100% Autocontenida (Lista sin Internet)'
                    : `Atención: ${dependencyReport.missing.length} archivo(s) remotos o faltantes`}
                </span>
              </div>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>
                {dependencyReport.includedCount} incrustados • {dependencyReport.alreadyAvailableCount} en almacén local • {dependencyReport.missing.length} faltantes.
              </div>
            </div>
          ) : null}

          {/* Conflicts & Resolutions */}
          {dependencyReport && dependencyReport.characterResolutions.some((cr) => cr.matchType !== 'none') && (
            <div className="conflict-resolution-box">
              <span style={{ fontWeight: 600, fontSize: 11, color: '#fde68a' }}>
                Coincidencias de Personajes en Campaña:
              </span>
              {dependencyReport.characterResolutions
                .filter((cr) => cr.matchType !== 'none')
                .map((cr, idx) => (
                  <div key={idx} className="conflict-item-row">
                    <span>
                      <strong>{cr.name}</strong> (coincide en destino)
                    </span>
                    <select
                      className="preset-form-select"
                      style={{ padding: '2px 6px', fontSize: 11 }}
                      value={charResolutions[cr.name] || 'reuse_existing'}
                      onChange={(e) =>
                        setCharResolutions((prev) => ({
                          ...prev,
                          [cr.name]: e.target.value as 'reuse_existing' | 'create_copy',
                        }))
                      }
                    >
                      <option value="reuse_existing">Reutilizar existente</option>
                      <option value="create_copy">Crear copia independiente</option>
                    </select>
                  </div>
                ))}
            </div>
          )}

          {dependencyReport?.conversationResolution &&
            dependencyReport.conversationResolution.matchType !== 'none' && (
              <div className="conflict-resolution-box">
                <span style={{ fontWeight: 600, fontSize: 11, color: '#fde68a' }}>
                  Diálogo Vinculado Coincidente:
                </span>
                <div className="conflict-item-row">
                  <span>{dependencyReport.conversationResolution.title || 'Diálogo Vinculado'}</span>
                  <select
                    className="preset-form-select"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    value={convResolution}
                    onChange={(e) =>
                      setConvResolution(e.target.value as 'reuse_existing' | 'create_copy')
                    }
                  >
                    <option value="reuse_existing">Reutilizar diálogo existente</option>
                    <option value="create_copy">Crear copia independiente</option>
                  </select>
                </div>
              </div>
            )}

          {/* Action Confirmation for Replace Staged */}
          {confirmReplaceStaged && (
            <div
              style={{
                background: 'rgba(244,63,94,0.12)',
                border: '1px solid rgba(244,63,94,0.3)',
                borderRadius: 6,
                padding: 10,
                fontSize: 12,
                color: '#fecdd3',
              }}
            >
              <p style={{ margin: '0 0 8px' }}>
                ¿Reemplazar la escena actual del borrador? Se creará un punto de restauración automático previo.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn-preset-secondary"
                  onClick={() => setConfirmReplaceStaged(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn-preset-warning"
                  onClick={() => onInstantiate('replace_staged')}
                  disabled={isInstantiating}
                >
                  Confirmar y Reemplazar
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="session-library-empty">
          <span>Selecciona un preset de la lista para ver su composición y dependencias.</span>
        </div>
      )}
    </div>
  );
};
