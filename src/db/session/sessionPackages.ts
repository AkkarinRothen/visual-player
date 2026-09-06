import type {
  GameSession,
  GameSessionPackage,
  VersionConflictReport,
  SessionReadinessCheck,
  ExportPreflightReport,
  MissingAssetInfo,
  ImportDiffSummary,
  Campaign,
  AuditRestoreReport,
} from '../../types';
import { db } from '../index';
import { generateId } from '../dbUtils';
import {
  scanSessionAssetDependencies,
  downloadExternalAssetsForSession,
  registerImmutableAsset,
  convertBlobUrlToDataUrl,
  type StoredAsset,
  type AssetDependencyItem,
} from '../assetDb';

/**
 * Detecta si hay conflictos de versión al importar una sesión entre PC y móvil.
 * Previene sobrescrituras accidentales si la copia local tiene cambios más recientes o concurrentes.
 */
export function detectImportVersionConflict(
  pkg: GameSessionPackage,
  existingSession?: GameSession
): VersionConflictReport {
  if (!existingSession) {
    return {
      hasConflict: false,
      conflictType: 'none',
      localRevision: 0,
      remoteRevision: pkg.session.revision || 1,
      localUpdatedAt: 0,
      remoteUpdatedAt: pkg.session.updatedAt || pkg.exportedAt,
      recommendation: 'duplicate',
      detail: 'No existe ninguna sesión previa con este identificador en este dispositivo.',
    };
  }

  const localRev = existingSession.revision || 1;
  const remoteRev = pkg.session.revision || 1;
  const localTime = existingSession.updatedAt || existingSession.createdAt;
  const remoteTime = pkg.session.updatedAt || pkg.exportedAt;

  if (localTime > remoteTime && localRev > remoteRev) {
    return {
      hasConflict: true,
      conflictType: 'local_newer',
      localRevision: localRev,
      remoteRevision: remoteRev,
      localUpdatedAt: localTime,
      remoteUpdatedAt: remoteTime,
      recommendation: 'duplicate',
      detail: `La preparación local en este dispositivo es más reciente (Rev ${localRev}) que la del archivo importado (Rev ${remoteRev}). Sobrescribir provocaría pérdida de progreso jugado.`,
    };
  }

  if (remoteTime > localTime && remoteRev > localRev) {
    return {
      hasConflict: true,
      conflictType: 'remote_newer',
      localRevision: localRev,
      remoteRevision: remoteRev,
      localUpdatedAt: localTime,
      remoteUpdatedAt: remoteTime,
      recommendation: 'overwrite',
      detail: `El archivo importado contiene una versión posterior (Rev ${remoteRev}) a la copia local de este dispositivo (Rev ${localRev}).`,
    };
  }

  if (localRev === remoteRev) {
    const localSig = JSON.stringify({
      scenes: existingSession.frozenScenes?.map((s) => s.id) || [],
      convs: existingSession.frozenConversations?.map((c) => c.id) || [],
      stagedScene: existingSession.stagedState?.sceneName,
      stagedChars: existingSession.stagedState?.characters?.length,
    });
    const remoteSig = JSON.stringify({
      scenes: pkg.campaignSnippet.scenes?.map((s) => s.id) || [],
      convs: pkg.campaignSnippet.savedConversations?.map((c) => c.id) || [],
      stagedScene: pkg.session.stagedState?.sceneName,
      stagedChars: pkg.session.stagedState?.characters?.length,
    });

    if (localSig !== remoteSig) {
      return {
        hasConflict: true,
        conflictType: 'diverged_concurrent_branch',
        localRevision: localRev,
        remoteRevision: remoteRev,
        localUpdatedAt: localTime,
        remoteUpdatedAt: remoteTime,
        recommendation: 'duplicate',
        detail: `Ambas copias tienen el mismo número de revisión (Rev ${localRev}), pero sus contenidos difieren debido a modificaciones concurrentes en dispositivos separados. No debe decidirse el reemplazo únicamente por la hora del reloj. Se recomienda importar como copia paralela.`,
      };
    }
  }

  if (localRev !== remoteRev || Math.abs(localTime - remoteTime) > 5000) {
    return {
      hasConflict: true,
      conflictType: 'diverged',
      localRevision: localRev,
      remoteRevision: remoteRev,
      localUpdatedAt: localTime,
      remoteUpdatedAt: remoteTime,
      recommendation: 'duplicate',
      detail: `Ambas copias tienen modificaciones divergentes (Local: Rev ${localRev}, Archivo: Rev ${remoteRev}). Se recomienda importar como copia paralela.`,
    };
  }

  return {
    hasConflict: false,
    conflictType: 'none',
    localRevision: localRev,
    remoteRevision: remoteRev,
    localUpdatedAt: localTime,
    remoteUpdatedAt: remoteTime,
    recommendation: 'keep_local',
    detail: 'Ambas versiones son idénticas en revisión y fecha.',
  };
}

/**
 * Evaluación pre-partida («Lista para jugar»).
 * Reúne archivos disponibles offline, referencias de personajes, diálogos y estado de guardado.
 */
export async function checkSessionReadiness(sessionId: string): Promise<SessionReadinessCheck> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);

  const checks: SessionReadinessCheck['checks'] = [];
  let score = 100;

  // 1. Escena base para proyectar
  const hasStaged = !!session.stagedState && !!session.stagedState.sceneName;
  const hasLive = !!session.liveState && !!session.liveState.sceneName;
  if (hasStaged || hasLive) {
    checks.push({
      id: 'scene_prepared',
      title: 'Escena preparada para proyección',
      status: 'pass',
      detail: `Escena lista: "${session.stagedState?.sceneName || session.liveState?.sceneName}".`,
    });
  } else {
    score -= 30;
    checks.push({
      id: 'scene_prepared',
      title: 'Sin escena preparada',
      status: 'fail',
      detail: 'La sesión no tiene ninguna escena cargada en borrador ni en vivo.',
      action: {
        type: 'select_starting_scene',
        label: 'Elegir Escena de Inicio',
        description: 'Carga una escena de la campaña en Preparación antes de abrir la mesa.',
      },
    });
  }

  // 2. Dependencias de archivos offline
  const deps = await scanSessionAssetDependencies(session);
  const storedAssets = await db.assets.toArray();
  const storedUrls = new Set(storedAssets.flatMap((a) => [a.originUrl, a.dataUrl]).filter(Boolean));
  const missing = deps.filter(
    (d) => !d.url.startsWith('data:') && !d.url.startsWith('blob:') && !storedUrls.has(d.url)
  );
  const readyLocalCount = deps.length - missing.length;

  if (missing.length === 0) {
    checks.push({
      id: 'offline_assets',
      title: 'Activos 100% listos para uso sin conexión',
      status: 'pass',
      detail: `${readyLocalCount} recursos locales verificados. Ningún archivo faltante.`,
    });
  } else {
    score -= 25;
    checks.push({
      id: 'offline_assets',
      title: 'Recursos externos o faltantes detectados',
      status: 'warn',
      detail: `${missing.length} archivo(s) dependen de URLs remotas o no están disponibles localmente.`,
      action: {
        type: 'download_missing_assets',
        label: 'Descargar Recursos Faltantes',
        description: 'Descargar y cachear los archivos remotos en el almacenamiento local.',
      },
      actionPayload: { missingCount: missing.length, missingUrls: missing.map((m) => m.url) },
    });
  }

  // 3. Referencias de personajes e identidades
  const characters = session.stagedState?.characters || [];
  const charsWithoutAvatar = characters.filter((c) => !c.avatarUrl);
  if (charsWithoutAvatar.length === 0) {
    checks.push({
      id: 'characters_valid',
      title: 'Retratos e identidades de personajes válidos',
      status: 'pass',
      detail: `${characters.length} personaje(s) en escena con retrato y configuración completa.`,
    });
  } else {
    score -= 15;
    checks.push({
      id: 'characters_valid',
      title: 'Personajes con retratos faltantes',
      status: 'warn',
      detail: `${charsWithoutAvatar.length} personaje(s) no tienen imagen de retrato asignada.`,
      action: {
        type: 'fix_character_avatar',
        label: 'Asignar Retratos Faltantes',
        description: 'Asignar avatares o retratos válidos a los personajes en el editor.',
      },
      actionPayload: { characterIds: charsWithoutAvatar.map((c) => c.id) },
    });
  }

  // 4. Integridad de conversaciones vinculadas
  const convCount = session.frozenConversations?.length || 0;
  checks.push({
    id: 'dialogues_frozen',
    title: 'Diálogos y documentos protegidos',
    status: 'pass',
    detail: `${convCount} conversación(es) y ${session.frozenHandouts?.length || 0} documento(s) congelados de forma independiente.`,
    action: convCount === 0 ? {
      type: 'repair_dialogue',
      label: 'Vincular Diálogos',
      description: 'Añadir conversaciones o documentos si la sesión incluye interacciones narrativas.',
    } : undefined,
  });

  const canPlayOffline = missing.length === 0 && (hasStaged || hasLive);
  const isReady = score >= 70 && (hasStaged || hasLive);

  return {
    isReady,
    canPlayOffline,
    score: Math.max(0, score),
    summary: canPlayOffline
      ? 'Sesión lista para jugar sin conexión a Internet.'
      : 'La sesión se puede jugar, pero algunos recursos requieren conexión o revisión.',
    checks,
  };
}

// ─── Export / Import Robusto ────────────────────────────────────────────────

/**
 * Empaqueta una sesión con todos sus activos incrustados como DataURL.
 * Si downloadExternal es true, ejecuta el escáner y descarga las URLs remotas.
 */
export async function packSessionForExport(
  sessionId: string,
  downloadExternal: boolean = false,
  onProgress?: (current: number, total: number, item: AssetDependencyItem) => void
): Promise<GameSessionPackage> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);

  const dependencies = scanSessionAssetDependencies(session);
  let preflightReport: ExportPreflightReport | null = null;

  if (downloadExternal) {
    preflightReport = await downloadExternalAssetsForSession(dependencies, onProgress);
  }

  // Recopilar todos los assets almacenados en IndexedDB
  const allStored = await db.assets.toArray();
  const assetMap = new Map<string, StoredAsset>();
  for (const a of allStored) {
    assetMap.set(a.id, a);
    assetMap.set(a.dataUrl, a);
    if (a.originUrl) assetMap.set(a.originUrl, a);
  }

  const packedAssets: Array<{ id: string; name: string; type: 'image' | 'video' | 'audio'; dataUrl: string }> = [];
  const missingAssets: MissingAssetInfo[] = preflightReport ? [...preflightReport.missing] : [];

  for (const dep of dependencies) {
    if (dep.url.startsWith('data:')) {
      packedAssets.push({
        id: generateId('asset'),
        name: dep.context,
        type: dep.type,
        dataUrl: dep.url,
      });
      continue;
    }
    if (dep.url.startsWith('blob:')) {
      const dataUrl = await convertBlobUrlToDataUrl(dep.url);
      packedAssets.push({
        id: generateId('asset'),
        name: dep.context,
        type: dep.type,
        dataUrl,
      });
      continue;
    }
    const found = assetMap.get(dep.url);
    if (found) {
      packedAssets.push({
        id: found.id,
        name: found.name,
        type: found.type,
        dataUrl: found.dataUrl,
      });
    } else if (!preflightReport) {
      missingAssets.push({
        url: dep.url,
        context: dep.context,
        assetType: dep.type,
        errorReason: 'No almacenado localmente en db.assets',
      });
    }
  }

  const campaign = await db.campaigns.get(session.campaignId);
  const scenes = session.frozenScenes && session.frozenScenes.length > 0
    ? session.frozenScenes
    : (campaign?.scenes ?? []);
  const characters = session.frozenCharacters && session.frozenCharacters.length > 0
    ? session.frozenCharacters
    : (campaign?.characters ?? []);

  const isCompleteOfflinePackage = missingAssets.length === 0;

  const now = Date.now();
  session.lastExportedAt = now;
  session.lastExportIsComplete = isCompleteOfflinePackage;

  // Registrar timestamp de exportación e indicador de completitud en la sesión
  await db.sessions.update(sessionId, {
    lastExportedAt: now,
    lastExportIsComplete: isCompleteOfflinePackage,
  });

  return {
    schemaVersion: 1,
    exportedAt: now,
    type: 'game_session_package',
    session,
    assets: packedAssets,
    campaignSnippet: {
      id: campaign?.id ?? session.campaignId,
      title: campaign?.title ?? 'Campaña',
      scenes,
      characters,
      savedConversations: campaign?.savedConversations || [],
      macros: campaign?.macros || [],
      savedHandouts: campaign?.savedHandouts || [],
    },
    isCompleteOfflinePackage,
    missingAssets: missingAssets.length > 0 ? missingAssets : undefined,
  };
}

/**
 * Analiza un paquete para mostrar la previsualización de diferencias (Diff Review)
 * antes de proceder a la importación.
 */
export async function analyzeSessionPackageDiff(pkg: GameSessionPackage): Promise<ImportDiffSummary> {
  const existingCampaign = await db.campaigns.get(pkg.campaignSnippet.id);
  const pkgScenes = pkg.campaignSnippet.scenes || [];
  const pkgChars = pkg.campaignSnippet.characters || [];

  const existingSceneIds = new Set((existingCampaign?.scenes || []).map((s) => s.id));
  const newScenesCount = pkgScenes.filter((s) => !existingSceneIds.has(s.id)).length;
  const conflictingScenesCount = pkgScenes.filter((s) => existingSceneIds.has(s.id)).length;

  return {
    sessionName: pkg.session.name,
    isCompletePackage: pkg.isCompleteOfflinePackage ?? true,
    scenesCount: pkgScenes.length,
    charactersCount: pkgChars.length,
    newScenesCount,
    conflictingScenesCount,
    missingAssets: pkg.missingAssets || [],
  };
}

/**
 * Importa un paquete de sesión con remapeo transaccional de identificadores.
 * Si asIndependentCopy es true, garantiza que no se alterará ninguna entidad existente.
 */
export async function importSessionPackageWithRemap(
  pkg: GameSessionPackage,
  asIndependentCopy: boolean = true
): Promise<{ session: GameSession; campaignId: string }> {
  if (pkg.type !== 'game_session_package' || pkg.schemaVersion !== 1) {
    throw new Error('Formato de paquete inválido o versión incompatible');
  }

  return await db.transaction('rw', [db.sessions, db.assets, db.campaigns], async () => {
    // 1. Importar activos a db.assets de forma inmutable
    for (const asset of pkg.assets) {
      await registerImmutableAsset(asset.name, asset.type, asset.dataUrl);
    }

    // 2. Determinar o crear la campaña
    let targetCampaignId = pkg.session.campaignId;
    const existingCampaign = await db.campaigns.get(targetCampaignId);

    if (!existingCampaign) {
      const newCampaign: Campaign = {
        id: targetCampaignId,
        title: pkg.campaignSnippet.title || 'Campaña Importada',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        scenes: pkg.campaignSnippet.scenes || [],
        characters: pkg.campaignSnippet.characters || [],
        savedConversations: pkg.campaignSnippet.savedConversations || [],
        macros: pkg.campaignSnippet.macros || [],
        savedHandouts: pkg.campaignSnippet.savedHandouts || [],
      };
      await db.campaigns.put(newCampaign);
    } else if (asIndependentCopy) {
      // Incorporar escenas, personajes, conversaciones o handouts ausentes de manera no destructiva
      const existingSceneIds = new Set(existingCampaign.scenes.map((s) => s.id));
      const newScenes = (pkg.campaignSnippet.scenes || []).filter((s) => !existingSceneIds.has(s.id));
      const existingCharIds = new Set(existingCampaign.characters.map((c) => c.id));
      const newChars = (pkg.campaignSnippet.characters || []).filter((c) => !existingCharIds.has(c.id));
      const existingConvIds = new Set((existingCampaign.savedConversations || []).map((c) => c.id));
      const newConvs = (pkg.campaignSnippet.savedConversations || []).filter((c) => !existingConvIds.has(c.id));
      const existingHandoutIds = new Set((existingCampaign.savedHandouts || []).map((h) => h.id));
      const newHandouts = (pkg.campaignSnippet.savedHandouts || []).filter((h) => !existingHandoutIds.has(h.id));

      if (newScenes.length > 0 || newChars.length > 0 || newConvs.length > 0 || newHandouts.length > 0) {
        await db.campaigns.update(targetCampaignId, {
          scenes: [...existingCampaign.scenes, ...newScenes],
          characters: [...existingCampaign.characters, ...newChars],
          savedConversations: [...(existingCampaign.savedConversations || []), ...newConvs],
          savedHandouts: [...(existingCampaign.savedHandouts || []), ...newHandouts],
          updatedAt: Date.now(),
        });
      }
    }

    // 3. Crear sesión independiente con nuevo ID si corresponde
    const existingSession = await db.sessions.get(pkg.session.id);
    const mustGenerateNewId = asIndependentCopy || !!existingSession;

    const finalSessionId = mustGenerateNewId ? generateId('gs') : pkg.session.id;
    const finalSessionName = mustGenerateNewId ? `${pkg.session.name} (Copia Importada)` : pkg.session.name;

    const finalSession: GameSession = {
      ...pkg.session,
      id: finalSessionId,
      campaignId: targetCampaignId,
      name: finalSessionName,
      status: 'preparing',
      schemaVersion: 1,
      frozenScenes: pkg.campaignSnippet.scenes,
      frozenCharacters: pkg.campaignSnippet.characters,
      revision: 1,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.sessions.put(finalSession);
    return { session: finalSession, campaignId: targetCampaignId };
  });
}

/**
 * Importa un paquete de sesión (método compatible con suite de pruebas anterior).
 */
export async function importSessionPackage(
  pkg: GameSessionPackage,
  conflictStrategy: 'keep_local' | 'overwrite' | 'duplicate' = 'duplicate'
): Promise<{ session: GameSession; conflicts: string[] }> {
  if (conflictStrategy === 'duplicate') {
    const res = await importSessionPackageWithRemap(pkg, true);
    return { session: res.session, conflicts: [pkg.session.id] };
  }
  const existingSession = await db.sessions.get(pkg.session.id);
  if (existingSession && conflictStrategy === 'keep_local') {
    return { session: existingSession, conflicts: [pkg.session.id] };
  }
  const res = await importSessionPackageWithRemap(pkg, false);
  return { session: res.session, conflicts: existingSession ? [pkg.session.id] : [] };
}

/**
 * Importa una sesión como copia de comprobación aislada.
 * No altera la campaña activa, no publica en la Mesa y verifica la integridad del paquete.
 */
export async function importSessionAsAuditCopy(
  pkg: GameSessionPackage
): Promise<AuditRestoreReport> {
  if (pkg.type !== 'game_session_package' || pkg.schemaVersion !== 1) {
    throw new Error('Formato de paquete inválido');
  }

  const res = await importSessionPackageWithRemap(pkg, true);
  const auditSession = res.session;

  auditSession.name = `[Comprobación] ${pkg.session.name}`;
  auditSession.isAuditCopy = true;
  auditSession.liveState = null; // Aislamiento absoluto de la Mesa
  auditSession.status = 'preparing';
  await db.sessions.put(auditSession);

  const readiness = await checkSessionReadiness(auditSession.id);

  return {
    isSuccess: true,
    auditSessionId: auditSession.id,
    declaredAssetsCount: pkg.assets.length,
    restoredAssetsCount: pkg.assets.length,
    missingAssetsCount: readiness.canPlayOffline ? 0 : 1,
    isolatedFromLiveTable: true,
    details: 'Copia de comprobación creada con éxito en modo preparación. La Mesa conectada no fue alterada y la campaña activa se mantuvo intacta.',
  };
}
