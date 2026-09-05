import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { videoChunkSyncService, VIDEO_CHUNK_SIZE } from './videoChunkSyncService';
import { db } from '../db';
import { calculateBlobSha256 } from '../utils/videoOptimizer';

describe('Video Chunk Synchronization & Reassembly Suite', () => {
  beforeEach(async () => {
    await db.assets.clear();
  });

  it('1. Splits a large video string into uniform 64KB chunks', () => {
    // Generar un payload ficticio de ~200KB
    const fakeData = 'data:video/mp4;base64,' + 'A'.repeat(200 * 1024);
    const chunks = videoChunkSyncService.splitIntoChunks('asset-video-1', fakeData, 'dummy-hash');

    expect(chunks.length).toBe(Math.ceil(fakeData.length / VIDEO_CHUNK_SIZE));
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].totalChunks).toBe(chunks.length);
    expect(chunks[0].data.length).toBe(VIDEO_CHUNK_SIZE);
  });

  it('2. Receives and reassembles all chunks in order and completes transfer', async () => {
    const rawContent = 'dummy-video-binary-content-sample';
    const fakeDataUrl = `data:video/mp4;base64,${btoa(rawContent)}`;
    const blob = new Blob([rawContent], { type: 'video/mp4' });
    const checksum = await calculateBlobSha256(blob);

    const chunks = videoChunkSyncService.splitIntoChunks('asset-test-complete', fakeDataUrl, checksum);
    expect(chunks.length).toBeGreaterThan(0);

    let finalResult: any = null;
    for (const chunk of chunks) {
      finalResult = await videoChunkSyncService.receiveChunk(chunk);
    }

    expect(finalResult.isComplete).toBe(true);
    expect(finalResult.assetId).toBe('asset-test-complete');
    expect(finalResult.dataUrl).toBe(fakeDataUrl);

    // Verificar que se haya registrado en db.assets
    const stored = await db.assets.where('type').equals('video').first();
    expect(stored).toBeDefined();
    expect(stored?.name).toContain('asset-test-complete');
  });

  it('3. Cancels transfer cleanly and does not assemble incomplete chunks', async () => {
    const fakeData = 'data:video/mp4;base64,' + 'B'.repeat(150 * 1024);
    const chunks = videoChunkSyncService.splitIntoChunks('asset-cancel', fakeData, 'some-hash');
    const transferId = chunks[0].transferId;

    // Recibir primer bloque
    await videoChunkSyncService.receiveChunk(chunks[0]);

    // Cancelar transferencia
    videoChunkSyncService.cancelTransfer(transferId);

    // Próximo bloque intentado no debe completar
    const result = await videoChunkSyncService.receiveChunk(chunks[1]);
    expect(result.isComplete).toBe(false);
  });
});
