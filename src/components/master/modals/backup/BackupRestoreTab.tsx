import React from 'react';
import { Archive, FileCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BackupRestoreTabProps } from './backupManagerTypes';

export const BackupRestoreTab: React.FC<BackupRestoreTabProps> = ({
  selectedFile,
  isInspecting,
  preflightReport,
  restoreMode,
  setRestoreMode,
  isRestoring,
  restoreSuccessMsg,
  onFileChange,
  onConfirmRestore,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Selector de archivo */}
      <div
        onClick={() => document.getElementById('backupFileInput')?.click()}
        style={{
          border: '2px dashed rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: selectedFile ? 'rgba(245, 158, 11, 0.05)' : 'rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
        }}
      >
        <input
          id="backupFileInput"
          type="file"
          accept="*/*,.vpbackup,.json,application/json,application/octet-stream"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
        <Archive size={32} className="text-amber-400" style={{ margin: '0 auto 8px' }} />
        <strong style={{ display: 'block', color: '#f3f4f6', fontSize: '0.95rem', marginBottom: '4px' }}>
          {selectedFile ? selectedFile.name : 'Tocar para seleccionar archivo .vpbackup'}
        </strong>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Acepta copias completas exportadas desde Visual Player
        </span>
      </div>

      {isInspecting && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '0.85rem' }}>
          Inspeccionando integridad del paquete...
        </div>
      )}

      {/* Reporte Pre-vuelo */}
      {preflightReport && (
        <div
          style={{
            background: preflightReport.isValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${preflightReport.isValid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {preflightReport.isValid ? (
              <FileCheck size={18} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={18} className="text-red-400" />
            )}
            <strong style={{ fontSize: '0.9rem', color: preflightReport.isValid ? '#6ee7b7' : '#fca5a5' }}>
              {preflightReport.isValid ? 'Paquete Verificado e Íntegro' : 'Respaldo Inválido'}
            </strong>
          </div>

          {preflightReport.isValid ? (
            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              <div>
                <strong>Campañas incluidas:</strong> {preflightReport.campaignNames.join(', ')}
              </div>
              <div>
                <strong>Recursos:</strong> {preflightReport.totalAssets} archivos ({preflightReport.estimatedSizeStr})
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: '#fca5a5' }}>{preflightReport.error}</div>
          )}
        </div>
      )}

      {/* Selector de Modo */}
      {preflightReport && preflightReport.isValid && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
            Método de Restauración:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: restoreMode === 'copy' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${restoreMode === 'copy' ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="restoreMode"
                checked={restoreMode === 'copy'}
                onChange={() => setRestoreMode('copy')}
                style={{ accentColor: '#f59e0b' }}
              />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f3f4f6' }}>
                  Importar como copia (Recomendado)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Conserva intactas tus partidas actuales y añade las del respaldo con nuevos nombres.
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: restoreMode === 'merge' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${restoreMode === 'merge' ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="restoreMode"
                checked={restoreMode === 'merge'}
                onChange={() => setRestoreMode('merge')}
                style={{ accentColor: '#f59e0b' }}
              />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f3f4f6' }}>
                  Fusionar selectivamente
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Actualiza las campañas existentes con el mismo ID e incorpora las nuevas.
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: restoreMode === 'replace' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${restoreMode === 'replace' ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="restoreMode"
                checked={restoreMode === 'replace'}
                onChange={() => setRestoreMode('replace')}
                style={{ accentColor: '#ef4444' }}
              />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fca5a5' }}>
                  Reemplazar datos locales (Avanzado)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Crea un punto de seguridad automático y sustituye todas las campañas por las del paquete.
                </div>
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={onConfirmRestore}
            disabled={isRestoring}
            style={{
              padding: '14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: isRestoring ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              marginTop: '8px',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{isRestoring ? 'Restaurando...' : 'Confirmar y Restaurar Partida'}</span>
          </button>
        </div>
      )}

      {restoreSuccessMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#6ee7b7',
            fontSize: '0.88rem',
            textAlign: 'center',
          }}
        >
          {restoreSuccessMsg}
        </div>
      )}
    </div>
  );
};
