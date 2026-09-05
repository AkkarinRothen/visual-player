/**
 * Servicio de Empaquetado, Inspección y Restauración de Respaldos Autónomos (.vpbackup).
 * Portabilidad integral sin depender de ADB: empaqueta campañas, escenas, personajes,
 * presets y recursos multimedia deduplicados por hash SHA-256.
 */

import { db, getAllCampaigns, registerOptimizedAsset, type StoredAsset } from '../db';
import type { Campaign, SceneCompositionPreset } from '../types';
import { calculateSha256 } from '../utils/imageOptimizer';
import { generateId } from '../db/dbUtils';

export interface BackupManifest {
  format: 'visual-player-backup';
  schemaVersion: number;
  createdAt: number;
  appVersion: string;
  scope: 'full' | 'campaigns';
  campaignCount: number;
  sceneCount: number;
  characterCount: number;
  assetCount: number;
  totalSizeBytes: number;
  checksum: string;
}

export interface BackupPackage {
  manifest: BackupManifest;
  campaigns: Campaign[];
  presets?: SceneCompositionPreset[];
  assets: StoredAsset[];
}

export interface BackupPreflightReport {
  isValid: boolean;
  error?: string;
  manifest?: BackupManifest;
  campaignNames: string[];
  totalAssets: number;
  estimatedSizeStr: string;
  hasAudio: boolean;
  hasImages: boolean;
}

export interface RestoreResult {
  success: boolean;
  mode: 'copy' | 'merge' | 'replace';
  importedCampaigns: number;
  importedAssets: number;
  message: string;
}

/**
 * Crea el paquete de respaldo completo recopilando todas las campañas, presets y assets de IndexedDB.
 */
export async function createBackupPackage(): Promise<{ blob: Blob; fileName: string; manifest: BackupManifest }> {
  const campaigns = await getAllCampaigns();
  const allAssets = await db.assets.toArray();
  const presets = await db.scenePresets.toArray();

  let sceneCount = 0;
  let characterCount = 0;
  campaigns.forEach((c) => {
    sceneCount += c.scenes?.length || 0;
    characterCount += c.characters?.length || 0;
  });

  const rawData = JSON.stringify({
    campaigns,
    presets,
    assets: allAssets,
  });

  // Generar checksum SHA-256 del contenido de datos
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(rawData);
  const checksum = await calculateSha256(dataBuffer.buffer);

  const manifest: BackupManifest = {
    format: 'visual-player-backup',
    schemaVersion: 2,
    createdAt: Date.now(),
    appVersion: '2.0.0-android',
    scope: 'full',
    campaignCount: campaigns.length,
    sceneCount,
    characterCount,
    assetCount: allAssets.length,
    totalSizeBytes: dataBuffer.byteLength,
    checksum,
  };

  const fullPackage: BackupPackage = {
    manifest,
    campaigns,
    presets,
    assets: allAssets,
  };

  const packageJson = JSON.stringify(fullPackage);
  const blob = new Blob([packageJson], { type: 'application/json' });
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `VisualPlayer_Backup_${dateStr}.vpbackup`;

  return { blob, fileName, manifest };
}

/**
 * Inspecciona un archivo de respaldo antes de alterar cualquier dato local (inspección pre-vuelo).
 */
export async function inspectBackupPackage(file: File | Blob): Promise<BackupPreflightReport> {
  try {
    const text = await file.text();
    const pkg = JSON.parse(text) as BackupPackage;

    if (!pkg.manifest || pkg.manifest.format !== 'visual-player-backup') {
      return {
        isValid: false,
        error: 'El archivo seleccionado no es un respaldo válido de Visual Player (.vpbackup).',
        campaignNames: [],
        totalAssets: 0,
        estimatedSizeStr: '0 B',
        hasAudio: false,
        hasImages: false,
      };
    }

    const campaignNames = (pkg.campaigns || []).map((c) => c.title || 'Sin título');
    const assets = pkg.assets || [];
    const hasAudio = assets.some((a) => a.type === 'audio');
    const hasImages = assets.some((a) => a.type === 'image');

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const bytes = file.size;
    const i = bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(k)) : 0;
    const sizeStr = bytes > 0 ? `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}` : '0 B';

    return {
      isValid: true,
      manifest: pkg.manifest,
      campaignNames,
      totalAssets: assets.length,
      estimatedSizeStr: sizeStr,
      hasAudio,
      hasImages,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Error al leer el archivo de respaldo: ${err.message || 'Formato JSON corrupto'}`,
      campaignNames: [],
      totalAssets: 0,
      estimatedSizeStr: '0 B',
      hasAudio: false,
      hasImages: false,
    };
  }
}

/**
 * Restaura el paquete de respaldo aplicando el modo seleccionado con validación de seguridad previa.
 */
export async function restoreBackupPackage(
  file: File | Blob,
  mode: 'copy' | 'merge' | 'replace'
): Promise<RestoreResult> {
  const text = await file.text();
  const pkg = JSON.parse(text) as BackupPackage;

  if (!pkg.manifest || !pkg.campaigns) {
    throw new Error('Paquete de respaldo inválido o incompleto.');
  }

  // Si el modo es 'replace', crear un punto de restauración de seguridad automático previo
  if (mode === 'replace') {
    const existingCampaigns = await getAllCampaigns();
    if (existingCampaigns.length > 0) {
      const safetyCheckpoint = {
        id: generateId('checkpoint'),
        campaignId: existingCampaigns[0].id,
        type: 'auto_safety_backup',
        title: `Punto de Seguridad previo a restauración (${new Date().toLocaleTimeString()})`,
        data: JSON.stringify(existingCampaigns),
        createdAt: Date.now(),
      };
      await db.checkpoints.put(safetyCheckpoint as any);
    }
    // Limpiar campañas existentes
    await db.campaigns.clear();
  }

  let importedCampaignCount = 0;
  let importedAssetCount = 0;

  // 1. Restaurar assets con deduplicación por hash
  if (Array.isArray(pkg.assets)) {
    for (const asset of pkg.assets) {
      try {
        await registerOptimizedAsset({
          name: asset.name,
          type: asset.type,
          dataUrl: asset.dataUrl,
          thumbnailUrl: asset.thumbnailUrl,
          originalDataUrl: asset.originalDataUrl,
          originalSize: asset.originalSize,
          optimizedSize: asset.optimizedSize,
          sha256: asset.sha256,
          dimensions: asset.dimensions,
          originUrl: asset.originUrl,
        });
        importedAssetCount++;
      } catch (err) {
        console.warn('Error restaurando asset:', asset.name, err);
      }
    }
  }

  // 2. Restaurar campañas según el modo
  for (const c of pkg.campaigns) {
    if (mode === 'copy') {
      const newCampaign: Campaign = {
        ...c,
        id: generateId('campaign'),
        title: `${c.title} (Restaurado)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.campaigns.put(newCampaign);
      importedCampaignCount++;
    } else {
      // merge o replace
      await db.campaigns.put(c);
      importedCampaignCount++;
    }
  }

  // 3. Restaurar presets de composición si existen
  if (Array.isArray(pkg.presets) && pkg.presets.length > 0) {
    for (const p of pkg.presets) {
      await db.scenePresets.put(p);
    }
  }

  return {
    success: true,
    mode,
    importedCampaigns: importedCampaignCount,
    importedAssets: importedAssetCount,
    message: `Se restauraron exitosamente ${importedCampaignCount} campañas y ${importedAssetCount} recursos.`,
  };
}
