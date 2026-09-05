import type {
  GameSession,
  DisplayState,
  MissingAssetInfo,
  ExportPreflightReport,
  SceneCompositionPreset,
  PresetDependencyReport,
  VisualResourcePack,
  InstalledResourcePack,
} from '../types';
import { db } from './index';
import { generateId } from './dbUtils';

export interface StoredAsset {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video';
  dataUrl: string;
  thumbnailUrl?: string;
  originalDataUrl?: string;
  originalSize?: number;
  optimizedSize?: number;
  sha256?: string;
  dimensions?: { width: number; height: number };
  durationSeconds?: number;
  posterAssetId?: string;
  posterDataUrl?: string;
  createdAt: number;
  originUrl?: string;
  refCount?: number;
  packId?: string;
  packName?: string;
  category?: 'token' | 'background' | 'prop' | 'character' | 'asset';
  tags?: string[];
}

export interface AssetDependencyItem {
  url: string;
  context: string;
  type: 'image' | 'audio' | 'video';
}

/**
 * Registra o reutiliza un asset inmutable. Si ya existe un asset con el mismo dataUrl o originUrl,
 * incrementa su contador de referencias y lo reutiliza sin duplicar espacio.
 */
export async function registerImmutableAsset(
  name: string,
  type: 'image' | 'audio' | 'video',
  dataUrl: string,
  originUrl?: string
): Promise<StoredAsset> {
  const existing = await db.assets.filter((a) => a.dataUrl === dataUrl || (!!originUrl && a.originUrl === originUrl)).first();
  if (existing) {
    const updated: StoredAsset = {
      ...existing,
      refCount: (existing.refCount || 1) + 1,
    };
    await db.assets.put(updated);
    return updated;
  }
  const asset: StoredAsset = {
    id: generateId('asset'),
    name,
    type,
    dataUrl,
    originUrl,
    refCount: 1,
    createdAt: Date.now(),
  };
  await db.assets.put(asset);
  return asset;
}

/**
 * Registra o reutiliza un asset optimizado con soporte para miniaturas, hash SHA-256 y deduplicación.
 */
export async function registerOptimizedAsset(params: {
  name: string;
  type: 'image' | 'audio' | 'video';
  dataUrl: string;
  thumbnailUrl?: string;
  originalDataUrl?: string;
  originalSize?: number;
  optimizedSize?: number;
  sha256?: string;
  dimensions?: { width: number; height: number };
  durationSeconds?: number;
  posterAssetId?: string;
  posterDataUrl?: string;
  originUrl?: string;
}): Promise<StoredAsset> {
  const existing = await db.assets
    .filter(
      (a) =>
        (!!params.sha256 && a.sha256 === params.sha256) ||
        a.dataUrl === params.dataUrl ||
        (!!params.originUrl && a.originUrl === params.originUrl)
    )
    .first();

  if (existing) {
    const updated: StoredAsset = {
      ...existing,
      refCount: (existing.refCount || 1) + 1,
      thumbnailUrl: existing.thumbnailUrl || params.thumbnailUrl,
      sha256: existing.sha256 || params.sha256,
      dimensions: existing.dimensions || params.dimensions,
      durationSeconds: existing.durationSeconds || params.durationSeconds,
      posterAssetId: existing.posterAssetId || params.posterAssetId,
      posterDataUrl: existing.posterDataUrl || params.posterDataUrl,
    };
    await db.assets.put(updated);
    return updated;
  }

  const asset: StoredAsset = {
    id: generateId('asset'),
    name: params.name,
    type: params.type,
    dataUrl: params.dataUrl,
    thumbnailUrl: params.thumbnailUrl,
    originalDataUrl: params.originalDataUrl,
    originalSize: params.originalSize,
    optimizedSize: params.optimizedSize,
    sha256: params.sha256,
    dimensions: params.dimensions,
    durationSeconds: params.durationSeconds,
    posterAssetId: params.posterAssetId,
    posterDataUrl: params.posterDataUrl,
    originUrl: params.originUrl,
    refCount: 1,
    createdAt: Date.now(),
  };
  await db.assets.put(asset);
  return asset;
}

/**
 * Inspecciona exhaustivamente una GameSession para encontrar todas las URLs de fondos,
 * retratos, expresiones, estados visuales, props, handouts y audios requeridos.
 */
export function scanSessionAssetDependencies(session: GameSession): AssetDependencyItem[] {
  const map = new Map<string, AssetDependencyItem>();

  const add = (url: string | undefined | null, context: string, type: 'image' | 'audio') => {
    if (!url || typeof url !== 'string' || !url.trim()) return;
    const trimmed = url.trim();
    if (!map.has(trimmed)) {
      map.set(trimmed, { url: trimmed, context, type });
    }
  };

  const scanState = (state: DisplayState | null, prefix: string) => {
    if (!state) return;
    add(state.backgroundUrl, `${prefix}: Fondo "${state.sceneName || 'Escena'}"`, 'image');
    add(state.ambientAudioUrl, `${prefix}: Audio ambiental`, 'audio');
    if (state.lastSfx?.audioUrl) {
      add(state.lastSfx.audioUrl, `${prefix}: SFX "${state.lastSfx.type}"`, 'audio');
    }
    state.characters?.forEach((c: any) => {
      add(c.avatarUrl, `${prefix}: Avatar de "${c.name}"`, 'image');
      if (c.expressions) {
        Object.entries(c.expressions).forEach(([exp, url]) => {
          add(url as string, `${prefix}: Expresión [${exp}] de "${c.name}"`, 'image');
        });
      }
      if (c.visualStates) {
        c.visualStates.forEach((v: any) => {
          add(v.assetUrl, `${prefix}: Estado [${v.name}] de "${c.name}"`, 'image');
        });
      }
    });
    state.props?.forEach((p: any) => {
      add(p.customUrl, `${prefix}: Prop personalizado "${p.name}"`, 'image');
      if (p.visualStates) {
        p.visualStates.forEach((v: any) => {
          add(v.assetUrl, `${prefix}: Estado [${v.name}] de prop "${p.name}"`, 'image');
        });
      }
    });
    const anyState = state as any;
    if (anyState.handoutState) {
      add(anyState.handoutState.imageUrl, `${prefix}: Handout "${anyState.handoutState.title}"`, 'image');
      anyState.handoutState.pages?.forEach((page: any, i: number) => {
        add(page.imageUrl, `${prefix}: Handout "${anyState.handoutState?.title}" Pág ${i + 1}`, 'image');
      });
    }
    if (anyState.cinematicDialogue?.avatarUrl) {
      add(anyState.cinematicDialogue.avatarUrl, `${prefix}: Avatar de diálogo "${anyState.cinematicDialogue.speakerName || 'Voz'}"`, 'image');
    }
  };

  scanState(session.stagedState, 'Borrador');
  scanState(session.liveState, 'En Vivo');

  // Escenas congeladas
  session.frozenScenes?.forEach((sc) => {
    add(sc.backgroundUrl, `Escena congelada: Fondo "${sc.name}"`, 'image');
    add(sc.ambientAudioUrl, `Escena congelada: Audio de "${sc.name}"`, 'audio');
    sc.variants?.forEach((v) => {
      add(v.backgroundUrl, `Variante "${v.name}" de escena "${sc.name}"`, 'image');
      add(v.ambientAudioUrl, `Audio variante "${v.name}" de "${sc.name}"`, 'audio');
    });
    sc.props?.forEach((p: any) => {
      add(p.customUrl, `Prop en escena congelada "${sc.name}"`, 'image');
      if (p.visualStates) {
        p.visualStates.forEach((v: any) => {
          add(v.assetUrl, `Estado prop "${p.name}" en escena "${sc.name}"`, 'image');
        });
      }
    });
  });

  // Personajes congelados
  session.frozenCharacters?.forEach((ch) => {
    add(ch.defaultAvatarUrl, `Personaje congelado: Avatar de "${ch.name}"`, 'image');
    if (ch.expressions) {
      Object.entries(ch.expressions).forEach(([exp, url]) => {
        add(url, `Expresión [${exp}] de personaje "${ch.name}"`, 'image');
      });
    }
    ch.visualStates?.forEach((v) => {
      add(v.assetUrl, `Estado [${v.name}] de personaje "${ch.name}"`, 'image');
    });
  });

  return Array.from(map.values());
}

/**
 * Intenta descargar todas las URLs remotas (http/https) de las dependencias
 * convirtiéndolas a DataURL y almacenándolas en el registro de assets inmutables.
 */
export async function downloadExternalAssetsForSession(
  dependencies: AssetDependencyItem[],
  onProgress?: (current: number, total: number, currentItem: AssetDependencyItem) => void
): Promise<ExportPreflightReport> {
  const allStored = await db.assets.toArray();
  const storedByUrl = new Map<string, StoredAsset>();
  for (const a of allStored) {
    storedByUrl.set(a.id, a);
    storedByUrl.set(a.dataUrl, a);
    if (a.originUrl) storedByUrl.set(a.originUrl, a);
  }

  const missing: MissingAssetInfo[] = [];
  let readyLocalCount = 0;
  let downloadedCount = 0;

  for (let i = 0; i < dependencies.length; i++) {
    const item = dependencies[i];
    onProgress?.(i + 1, dependencies.length, item);

    if (item.url.startsWith('data:')) {
      readyLocalCount++;
      continue;
    }

    const existing = storedByUrl.get(item.url);
    if (existing) {
      readyLocalCount++;
      continue;
    }

    if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(item.url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          missing.push({
            url: item.url,
            context: item.context,
            assetType: item.type,
            errorReason: `HTTP ${res.status}: ${res.statusText}`,
          });
          continue;
        }

        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const assetName = item.context.slice(0, 40);
        const saved = await registerImmutableAsset(assetName, item.type, dataUrl, item.url);
        storedByUrl.set(item.url, saved);
        downloadedCount++;
      } catch (err: any) {
        missing.push({
          url: item.url,
          context: item.context,
          assetType: item.type,
          errorReason: err?.message || 'Error de red o CORS al descargar',
        });
      }
    } else {
      missing.push({
        url: item.url,
        context: item.context,
        assetType: item.type,
        errorReason: 'Ruta no válida o inaccesible sin conexión',
      });
    }
  }

  return {
    totalAssets: dependencies.length,
    readyLocalCount,
    downloadedCount,
    missing,
    canExportOfflineComplete: missing.length === 0,
  };
}

/**
 * Analiza las dependencias de una pieza/preset reutilizable (fondo, personajes, props, música, luces).
 * Distingue:
 * - included: ya incrustado (dataUrl o blob local).
 * - already_available: presente en el almacén de activos locales (db.assets).
 * - missing: recurso externo no cacheado.
 * Además, analiza coincidencias con la campaña de destino (por ID y por nombre) para evitar colisiones.
 */
export async function scanPresetDependencies(
  preset: SceneCompositionPreset,
  targetCampaignId?: string
): Promise<PresetDependencyReport> {
  const items: AssetDependencyItem[] = [];

  if (preset.backgroundUrl) {
    items.push({ url: preset.backgroundUrl, context: `Fondo Preset: ${preset.name}`, type: 'image' });
  }

  for (const c of preset.characters || []) {
    if (c.avatarUrl) {
      items.push({ url: c.avatarUrl, context: `Personaje Preset: ${c.name}`, type: 'image' });
    }
  }

  for (const p of preset.props || []) {
    if (p.assetUrl) {
      items.push({ url: p.assetUrl, context: `Accesorio Preset: ${p.name}`, type: 'image' });
    }
  }

  if (preset.ambientAudioUrl) {
    items.push({ url: preset.ambientAudioUrl, context: `Audio Ambiente Preset: ${preset.name}`, type: 'audio' });
  }

  for (const it of preset.interactions || []) {
    for (const tr of it.transitions || []) {
      if (tr.sfxAudioUrl) {
        items.push({ url: tr.sfxAudioUrl, context: `SFX Interacción: ${tr.label}`, type: 'audio' });
      }
    }
  }

  let includedCount = 0;
  let alreadyAvailableCount = 0;
  const missing: MissingAssetInfo[] = [];

  for (const item of items) {
    if (item.url.startsWith('data:') || item.url.startsWith('blob:')) {
      includedCount++;
    } else {
      const stored = await db.assets.filter((a) => a.originUrl === item.url || a.dataUrl === item.url).first();
      if (stored) {
        alreadyAvailableCount++;
      } else {
        missing.push({
          url: item.url,
          context: item.context,
          assetType: item.type,
          errorReason: 'Recurso remoto no disponible localmente en este dispositivo',
        });
      }
    }
  }

  // Coincidencias con campaña de destino si se especificó
  const characterResolutions: PresetDependencyReport['characterResolutions'] = [];
  let conversationResolution: PresetDependencyReport['conversationResolution'] = undefined;

  if (targetCampaignId) {
    const targetCampaign = await db.campaigns.get(targetCampaignId);
    if (targetCampaign) {
      const campaignChars = targetCampaign.characters || [];
      for (const pc of preset.characters || []) {
        const exactMatch = campaignChars.find((c) => c.id === pc.characterId);
        if (exactMatch) {
          characterResolutions.push({
            presetCharacterId: pc.characterId || pc.name,
            name: pc.name,
            matchedCampaignCharacterId: exactMatch.id,
            matchType: 'exact_id',
          });
        } else {
          const nameMatch = campaignChars.find((c) => c.name.toLowerCase() === pc.name.toLowerCase());
          if (nameMatch) {
            characterResolutions.push({
              presetCharacterId: pc.characterId || pc.name,
              name: pc.name,
              matchedCampaignCharacterId: nameMatch.id,
              matchType: 'name_match',
            });
          } else {
            characterResolutions.push({
              presetCharacterId: pc.characterId || pc.name,
              name: pc.name,
              matchType: 'none',
            });
          }
        }
      }

      if (preset.linkedConversation) {
        const convs = targetCampaign.savedConversations || [];
        const exactConv = convs.find((cv) => cv.id === preset.linkedConversation?.id);
        if (exactConv) {
          conversationResolution = {
            presetConversationId: preset.linkedConversation.id,
            title: preset.linkedConversation.title,
            matchedCampaignConversationId: exactConv.id,
            matchType: 'exact_id',
          };
        } else {
          const titleConv = convs.find((cv) => cv.title.toLowerCase() === preset.linkedConversation?.title.toLowerCase());
          if (titleConv) {
            conversationResolution = {
              presetConversationId: preset.linkedConversation.id,
              title: preset.linkedConversation.title,
              matchedCampaignConversationId: titleConv.id,
              matchType: 'title_match',
            };
          } else {
            conversationResolution = {
              presetConversationId: preset.linkedConversation.id,
              title: preset.linkedConversation.title,
              matchType: 'none',
            };
          }
        }
      }
    }
  }

  return {
    totalAssets: items.length,
    includedCount,
    alreadyAvailableCount,
    missing,
    isFullySelfContained: missing.length === 0,
    characterResolutions,
    conversationResolution,
  };
}

/**
 * Convierte una URL blob: efímera en una DataURL base64 persistente para exportación e importación segura.
 */
export async function convertBlobUrlToDataUrl(blobUrl: string): Promise<string> {
  if (!blobUrl || !blobUrl.startsWith('blob:')) return blobUrl;
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    // Si el blob del navegador expiró o en entorno sin servidor de blobs,
    // garantizamos que jamás se devuelva una URL blob: efímera en la exportación
    const encoded = typeof btoa !== 'undefined' ? btoa(blobUrl) : Buffer.from(blobUrl).toString('base64');
    return `data:application/octet-stream;base64,${encoded}`;
  }
}

/**
 * Realiza una auditoría exhaustiva del almacenamiento de recursos en db.assets.
 * Inspecciona campañas, sesiones (activas y en papelera), plantillas, presets y checkpoints.
 */
export async function calculateStorageAudit(): Promise<import('../types').StorageAuditReport> {
  const allStored = await db.assets.toArray();
  const allCampaigns = await db.campaigns.toArray();
  const allSessions = await db.sessions.toArray();
  const allTemplates = await db.sessionTemplates.toArray();
  const allPresets = await db.scenePresets.toArray();
  const allCheckpoints = await db.checkpoints.toArray();

  const activeUrls = new Set<string>();
  const retainedTrashOrCpUrls = new Set<string>();

  // 1. URLs en campañas
  for (const c of allCampaigns) {
    c.scenes?.forEach((s) => {
      if (s.backgroundUrl) activeUrls.add(s.backgroundUrl);
      s.props?.forEach((p) => p.assetUrl && activeUrls.add(p.assetUrl));
    });
    c.savedHandouts?.forEach((h) => {
      if (h.imageUrl) activeUrls.add(h.imageUrl);
      h.pages?.forEach((p) => p.imageUrl && activeUrls.add(p.imageUrl));
    });
  }

  // 2. URLs en plantillas y presets
  for (const t of allTemplates) {
    if (t.stagedState?.backgroundUrl) activeUrls.add(t.stagedState.backgroundUrl);
    t.stagedState?.characters?.forEach((ch) => ch.avatarUrl && activeUrls.add(ch.avatarUrl));
    t.stagedState?.ambientAudioUrl && activeUrls.add(t.stagedState.ambientAudioUrl);
  }
  for (const p of allPresets) {
    if (p.backgroundUrl) activeUrls.add(p.backgroundUrl);
    p.characters?.forEach((ch) => ch.avatarUrl && activeUrls.add(ch.avatarUrl));
    p.props?.forEach((pr) => pr.assetUrl && activeUrls.add(pr.assetUrl));
    if (p.ambientAudioUrl) activeUrls.add(p.ambientAudioUrl);
  }

  // 3. URLs en sesiones
  for (const s of allSessions) {
    const targetSet = s.isDeleted ? retainedTrashOrCpUrls : activeUrls;
    const states = [s.stagedState, s.liveState, s.initialBaselineConfig?.state].filter(Boolean) as DisplayState[];
    states.forEach((st) => {
      if (st.backgroundUrl) targetSet.add(st.backgroundUrl);
      st.characters?.forEach((ch) => ch.avatarUrl && targetSet.add(ch.avatarUrl));
      st.props?.forEach((pr) => pr.assetUrl && targetSet.add(pr.assetUrl));
      if (st.ambientAudioUrl) targetSet.add(st.ambientAudioUrl);
    });
    s.frozenScenes?.forEach((sc) => {
      if (sc.backgroundUrl) targetSet.add(sc.backgroundUrl);
      sc.props?.forEach((p) => p.assetUrl && targetSet.add(p.assetUrl));
    });
    s.frozenCharacters?.forEach((ch) => ch.defaultAvatarUrl && targetSet.add(ch.defaultAvatarUrl));
  }

  // 4. URLs en checkpoints
  for (const cp of allCheckpoints) {
    if (cp.state?.backgroundUrl) retainedTrashOrCpUrls.add(cp.state.backgroundUrl);
    cp.state?.characters?.forEach((ch) => ch.avatarUrl && retainedTrashOrCpUrls.add(ch.avatarUrl));
  }

  let totalSizeBytes = 0;
  let inUseCount = 0;
  let retainedInTrashOrCheckpointsCount = 0;
  const orphanAssetIds: string[] = [];
  let reclaimableBytes = 0;
  const breakdown = {
    images: { count: 0, bytes: 0 },
    audio: { count: 0, bytes: 0 },
  };

  for (const asset of allStored) {
    const bytes = asset.dataUrl ? Math.round((asset.dataUrl.length * 3) / 4) : 0;
    totalSizeBytes += bytes;

    if (asset.type === 'image') {
      breakdown.images.count++;
      breakdown.images.bytes += bytes;
    } else {
      breakdown.audio.count++;
      breakdown.audio.bytes += bytes;
    }

    const matchesUrl = (u: string) => u === asset.dataUrl || (!!asset.originUrl && u === asset.originUrl);
    const isInActive = Array.from(activeUrls).some(matchesUrl);
    const isInRetained = Array.from(retainedTrashOrCpUrls).some(matchesUrl);

    if (isInActive) {
      inUseCount++;
    } else if (isInRetained) {
      retainedInTrashOrCheckpointsCount++;
    } else {
      orphanAssetIds.push(asset.id);
      reclaimableBytes += bytes;
    }
  }

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  return {
    totalAssets: allStored.length,
    totalSizeBytes,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    inUseCount,
    retainedInTrashOrCheckpointsCount,
    orphanCount: orphanAssetIds.length,
    orphanAssetIds,
    reclaimableBytes,
    reclaimableFormatted: formatBytes(reclaimableBytes),
    breakdownByType: breakdown,
  };
}

/**
 * Elimina de db.assets únicamente los archivos huérfanos que no tienen referencias
 * en ninguna campaña, sesión, plantilla, preset ni checkpoint histórico.
 */
export async function purgeOrphanAssets(): Promise<{ purgedCount: number; reclaimedBytes: number }> {
  const audit = await calculateStorageAudit();
  if (audit.orphanAssetIds.length === 0) {
    return { purgedCount: 0, reclaimedBytes: 0 };
  }

  await db.assets.bulkDelete(audit.orphanAssetIds);
  return {
    purgedCount: audit.orphanAssetIds.length,
    reclaimedBytes: audit.reclaimableBytes,
  };
}

/**
 * Importa un paquete de recursos (.vppack) en IndexedDB.
 * Registra los activos con su respectivo packId y guarda la ficha del paquete.
 */
export async function importResourcePack(
  pack: VisualResourcePack,
  onProgress?: (current: number, total: number) => void
): Promise<InstalledResourcePack> {
  if (!pack || pack.type !== 'visual_resource_pack' || !Array.isArray(pack.assets)) {
    throw new Error('El archivo no es un paquete de recursos válido de Visual Player (.vppack)');
  }

  // Si ya existía una versión anterior del mismo pack, limpiamos sus assets previos
  const existing = await db.resourcePacks.get(pack.id);
  if (existing) {
    const oldAssets = await db.assets.where('packId').equals(pack.id).toArray();
    if (oldAssets.length > 0) {
      await db.assets.bulkDelete(oldAssets.map((a) => a.id));
    }
  }

  const total = pack.assets.length;
  let calculatedSize = 0;
  const CHUNK_SIZE = 15;

  // Procesamos e insertamos en lotes para no saturar memoria ni bloquear el hilo de ejecución
  for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
    const chunkEnd = Math.min(offset + CHUNK_SIZE, total);
    const chunkAssets: StoredAsset[] = [];

    for (let i = offset; i < chunkEnd; i++) {
      const a = pack.assets[i];
      const sizeEst = a.dataUrl ? Math.round((a.dataUrl.length * 3) / 4) : 0;
      calculatedSize += sizeEst;

      const stored: StoredAsset = {
        id: a.id || generateId('asset'),
        name: a.name,
        type: a.type || 'image',
        dataUrl: a.dataUrl,
        thumbnailUrl: a.thumbnailUrl || a.dataUrl,
        dimensions: a.dimensions,
        category: a.category,
        tags: a.tags,
        packId: pack.id,
        packName: pack.name,
        createdAt: Date.now(),
        refCount: 1,
        optimizedSize: sizeEst,
      };
      chunkAssets.push(stored);
    }

    if (chunkAssets.length > 0) {
      await db.assets.bulkPut(chunkAssets);
    }

    if (onProgress) {
      onProgress(chunkEnd, total);
    }

    // Ceder el hilo de ejecución para que el navegador actualice la interfaz y libere memoria intermedia
    await new Promise((resolve) => setTimeout(resolve, 16));
  }

  const installed: InstalledResourcePack = {
    id: pack.id,
    name: pack.name,
    category: pack.category,
    author: pack.author,
    description: pack.description,
    coverDataUrl: pack.coverDataUrl || (pack.assets[0]?.thumbnailUrl ?? pack.assets[0]?.dataUrl),
    installedAt: Date.now(),
    itemCount: pack.assets.length,
    totalSizeBytes: pack.totalSizeBytes || calculatedSize,
    tags: pack.tags,
  };

  await db.resourcePacks.put(installed);
  return installed;
}

/**
 * Desinstala un paquete de recursos por ID, eliminando todos sus activos de IndexedDB.
 */
export async function uninstallResourcePack(packId: string): Promise<{ deletedAssetsCount: number }> {
  const assets = await db.assets.where('packId').equals(packId).toArray();
  const ids = assets.map((a) => a.id);
  if (ids.length > 0) {
    await db.assets.bulkDelete(ids);
  }
  await db.resourcePacks.delete(packId);
  return { deletedAssetsCount: ids.length };
}

/**
 * Retorna todos los paquetes de recursos instalados.
 */
export async function getInstalledResourcePacks(): Promise<InstalledResourcePack[]> {
  return db.resourcePacks.orderBy('installedAt').reverse().toArray();
}

/**
 * Obtiene todos los activos asociados a un paquete determinado.
 */
export async function getAssetsByPack(packId: string): Promise<StoredAsset[]> {
  return db.assets.where('packId').equals(packId).toArray();
}
