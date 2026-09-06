import { useState, useEffect } from 'react';
import { getAllCampaigns, db } from '../../../../db';
import {
  createBackupPackage,
  inspectBackupPackage,
  restoreBackupPackage,
  type BackupPreflightReport,
} from '../../../../services/backupPackageService';

interface UseBackupManagerProps {
  isOpen: boolean;
  onRefreshCampaigns?: () => void;
}

export function useBackupManager({ isOpen, onRefreshCampaigns }: UseBackupManagerProps) {
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

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setSelectedFile(null);
      setPreflightReport(null);
      setRestoreSuccessMsg(null);
      setCreatedFileName(null);
    }
  }, [isOpen]);

  // Manejar exportación de respaldo
  const handleExportBackup = async () => {
    setIsGenerating(true);
    try {
      const { blob, fileName } = await createBackupPackage();

      // En Android con Web Share API o selector de descarga
      if (
        navigator.canShare &&
        navigator.canShare({ files: [new File([blob], fileName, { type: 'application/json' })] })
      ) {
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

  return {
    activeTab,
    setActiveTab,
    campaignCount,
    assetCount,
    isGenerating,
    createdFileName,
    selectedFile,
    isInspecting,
    preflightReport,
    restoreMode,
    setRestoreMode,
    isRestoring,
    restoreSuccessMsg,
    handleExportBackup,
    handleFileChange,
    handleConfirmRestore,
  };
}
