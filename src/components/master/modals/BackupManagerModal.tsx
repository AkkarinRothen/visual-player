import React, { useState, useEffect } from 'react';
import {
  X,
  Archive,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  HardDrive,
  FolderArchive,
} from 'lucide-react';
import { getAllCampaigns, db } from '../../../db';
import {
  createBackupPackage,
  inspectBackupPackage,
  restoreBackupPackage,
  type BackupPreflightReport,
} from '../../../services/backupPackageService';

export interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCampaigns?: () => void;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  isOpen,
  onClose,
  onRefreshCampaigns,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'restore'>('create');

  // Estado pestaña Crear
  const [campaignCount, setCampaignCount] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdFileName, setCreatedFileName] = useState<string | null>(null);

  // Estado pestaña Restaurar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [preflightReport, setPreflightReport] = useState<BackupPreflightReport | null>(null);
  const [restoreMode, setRestoreMode] = useState<'copy' | 'merge' | 'replace'>('copy');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setSelectedFile(null);
      setPreflightReport(null);
      setRestoreSuccessMsg(null);
      setCreatedFileName(null);
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const camps = await getAllCampaigns();
      const assets = await db.assets.count();
      setCampaignCount(camps.length);
      setAssetCount(assets);
    } catch (err) {
      console.warn('Error cargando estadísticas locales:', err);
    }
  };

  if (!isOpen) return null;

  // Manejar exportación de respaldo
  const handleExportBackup = async () => {
    setIsGenerating(true);
    try {
      const { blob, fileName } = await createBackupPackage();

      // En Android con Web Share API o selector de descarga
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'application/json' })] })) {
        try {
          const fileToShare = new File([blob], fileName, { type: 'application/json' });
          await navigator.share({
            title: 'Respaldo de Visual Player',
            text: 'Copia completa de campañas y recursos.',
            files: [fileToShare],
          });
          setCreatedFileName(fileName);
          setIsGenerating(false);
          return;
        } catch {
          // Fallback a descarga regular si el usuario canceló el menú compartir
        }
      }

      // Descarga directa a almacenamiento
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      setCreatedFileName(fileName);
    } catch (err: any) {
      console.error('Error generando respaldo:', err);
      alert('Error al crear el respaldo: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Manejar selección de archivo a restaurar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsInspecting(true);
    setRestoreSuccessMsg(null);
    try {
      const report = await inspectBackupPackage(file);
      setPreflightReport(report);
    } catch (err: any) {
      alert('Error inspeccionando archivo: ' + err.message);
    } finally {
      setIsInspecting(false);
    }
  };

  // Confirmar restauración
  const handleConfirmRestore = async () => {
    if (!selectedFile) return;

    if (restoreMode === 'replace') {
      const confirmReplace = window.confirm(
        'ATENCIÓN: Has elegido "Reemplazar datos locales". Se creará un punto de seguridad previo automáticamente, pero las campañas actuales serán sustituidas por las del respaldo. ¿Deseas continuar?'
      );
      if (!confirmReplace) return;
    }

    setIsRestoring(true);
    try {
      const result = await restoreBackupPackage(selectedFile, restoreMode);
      setRestoreSuccessMsg(result.message);
      if (onRefreshCampaigns) {
        onRefreshCampaigns();
      }
      loadStats();
    } catch (err: any) {
      alert('Error durante la restauración: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.85)',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderArchive size={22} className="text-amber-400" />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
              Respaldos de Campañas (.vpbackup)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Pestañas */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'create' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              borderBottom: activeTab === 'create' ? '2px solid #f59e0b' : 'none',
              color: activeTab === 'create' ? '#fbbf24' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            <span>Crear Respaldo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'restore' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              borderBottom: activeTab === 'restore' ? '2px solid #f59e0b' : 'none',
              color: activeTab === 'restore' ? '#fbbf24' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />
            <span>Restaurar Copia</span>
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <HardDrive size={20} className="text-amber-400" />
                  <strong style={{ fontSize: '0.95rem' }}>Datos en este teléfono</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Campañas</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6' }}>{campaignCount}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Recursos Multimedia</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6' }}>{assetCount}</div>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                El archivo <code>.vpbackup</code> empaqueta todas tus campañas, escenas, personajes, presets y sus
                imágenes optimizadas deduplicadas. No requiere ADB ni cables.
              </p>

              {createdFileName && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#6ee7b7',
                    fontSize: '0.85rem',
                  }}
                >
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Respaldo creado:</strong> {createdFileName}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isGenerating || campaignCount === 0}
                style={{
                  padding: '14px',
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isGenerating || campaignCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: campaignCount === 0 ? 0.5 : 1,
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                  marginTop: '6px',
                }}
              >
                <Download size={18} />
                <span>{isGenerating ? 'Empaquetando respaldo...' : 'Exportar Copia .vpbackup'}</span>
              </button>
            </div>
          )}

          {activeTab === 'restore' && (
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
                  accept=".vpbackup,.json"
                  onChange={handleFileChange}
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
                      <div><strong>Campañas incluidas:</strong> {preflightReport.campaignNames.join(', ')}</div>
                      <div><strong>Recursos:</strong> {preflightReport.totalAssets} archivos ({preflightReport.estimatedSizeStr})</div>
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
                    onClick={handleConfirmRestore}
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
          )}
        </div>
      </div>
    </div>
  );
};
