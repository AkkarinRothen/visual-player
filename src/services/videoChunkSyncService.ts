/**
 * Servicio de Fragmentación, Transmisión por Bloques y Reensamblado de Videos sobre WebRTC.
 * Garantiza transferencia resiliente en bloques de 64KB sin saturar el canal de control.
 */

import { calculateBlobSha256 } from '../utils/videoOptimizer';
import { db, registerOptimizedAsset } from '../db';
import type { VideoChunkTransferPayload } from '../domain/protocol/types';

export const VIDEO_CHUNK_SIZE = 64 * 1024; // 64KB por bloque

export interface VideoTransferProgress {
  transferId: string;
  assetId: string;
  chunksReceived: number;
  totalChunks: number;
  percent: number;
  isComplete: boolean;
  error?: string;
}

export class VideoChunkSyncService {
  private activeTransfers = new Map<string, {
    assetId: string;
    totalChunks: number;
    expectedChecksum: string;
    chunks: string[];
    createdAt: number;
  }>();

  private outgoingAborts = new Set<string>();

  /**
   * Divide un DataURL o string base64 en bloques de 64KB.
   */
  public splitIntoChunks(assetId: string, dataUrl: string, checksum: string): VideoChunkTransferPayload[] {
    const transferId = `vtx-${assetId}-${Date.now()}`;
    const chunks: VideoChunkTransferPayload[] = [];
    const totalLength = dataUrl.length;
    const totalChunks = Math.ceil(totalLength / VIDEO_CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * VIDEO_CHUNK_SIZE;
      const end = Math.min(totalLength, start + VIDEO_CHUNK_SIZE);
      const slice = dataUrl.substring(start, end);

      chunks.push({
        transferId,
        assetId,
        chunkIndex: i,
        totalChunks,
        data: slice,
        checksum,
      });
    }

    return chunks;
  }

  /**
   * Procesa la llegada de un bloque en la Mesa / Receptor.
   * Reensambla y valida el hash final una vez recibidos todos los bloques.
   */
  public async receiveChunk(
    payload: VideoChunkTransferPayload,
    onProgress?: (progress: VideoTransferProgress) => void
  ): Promise<{ isComplete: boolean; assetId: string; dataUrl?: string; error?: string }> {
    const { transferId, assetId, chunkIndex, totalChunks, data, checksum } = payload;

    if (!this.activeTransfers.has(transferId)) {
      this.activeTransfers.set(transferId, {
        assetId,
        totalChunks,
        expectedChecksum: checksum,
        chunks: new Array(totalChunks),
        createdAt: Date.now(),
      });
    }

    const transfer = this.activeTransfers.get(transferId)!;
    transfer.chunks[chunkIndex] = data;

    const receivedCount = transfer.chunks.filter((c) => typeof c === 'string').length;
    const percent = Math.round((receivedCount / totalChunks) * 100);

    if (onProgress) {
      onProgress({
        transferId,
        assetId,
        chunksReceived: receivedCount,
        totalChunks,
        percent,
        isComplete: receivedCount === totalChunks,
      });
    }

    // Comprobar si se completaron todos los bloques
    if (receivedCount === totalChunks) {
      const fullDataUrl = transfer.chunks.join('');
      this.activeTransfers.delete(transferId);

      // Validar integridad
      try {
        // En base64 extraemos los bytes para verificar hash si es dataUrl
        const blob = await dataUrlToBlob(fullDataUrl);
        const computedSha256 = await calculateBlobSha256(blob);

        // Si se especificó checksum y no coincide
        if (checksum && checksum.length > 8 && computedSha256 !== checksum) {
          return {
            isComplete: false,
            assetId,
            error: `Error de integridad: el hash SHA-256 no coincide (${computedSha256} vs ${checksum})`,
          };
        }

        // Guardar automáticamente en db.assets local si está en entorno de navegador
        if (typeof db !== 'undefined' && db.assets) {
          await registerOptimizedAsset({
            name: `Video-${assetId}`,
            type: 'video',
            dataUrl: fullDataUrl,
            sha256: computedSha256,
          });
        }

        return {
          isComplete: true,
          assetId,
          dataUrl: fullDataUrl,
        };
      } catch (err: any) {
        return {
          isComplete: false,
          assetId,
          error: `Fallo al validar o persistir video: ${err.message}`,
        };
      }
    }

    return {
      isComplete: false,
      assetId,
    };
  }

  /**
   * Cancela una transferencia activa en curso por cambio rápido de escena.
   */
  public cancelTransfer(transferId: string): void {
    this.activeTransfers.delete(transferId);
    this.outgoingAborts.add(transferId);
  }

  /**
   * Limpia transferencias huérfanas con más de 5 minutos de antigüedad.
   */
  public pruneStaleTransfers(): void {
    const now = Date.now();
    for (const [transferId, t] of this.activeTransfers.entries()) {
      if (now - t.createdAt > 5 * 60 * 1000) {
        this.activeTransfers.delete(transferId);
      }
    }
  }
}

/**
 * Convierte un DataURL a Blob.
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'video/mp4';
  const binaryStr = atob(parts[1] || '');
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export const videoChunkSyncService = new VideoChunkSyncService();

/**
 * Función auxiliar para dividir un video en bloques listos para transmisión WebRTC.
 */
export function createVideoChunks(opts: {
  assetId: string;
  name?: string;
  dataUrl: string;
  sha256: string;
  durationSeconds?: number;
  posterDataUrl?: string;
}) {
  return videoChunkSyncService.splitIntoChunks(opts.assetId, opts.dataUrl, opts.sha256);
}

