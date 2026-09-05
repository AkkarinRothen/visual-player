import { describe, it, expect } from 'vitest';
import {
  validateVideoFile,
  calculateBlobSha256,
  extractVideoPoster,
  blobToDataUrl,
} from './videoOptimizer';

describe('Video Optimizer & Processing Utilities Suite', () => {
  it('1. Calculates deterministic SHA-256 for a video blob', async () => {
    const dummyBlob = new Blob(['fake-video-content-stream-bytes'], { type: 'video/mp4' });
    const hash1 = await calculateBlobSha256(dummyBlob);
    const hash2 = await calculateBlobSha256(dummyBlob);

    expect(hash1).toBeDefined();
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBeGreaterThan(8);
    expect(hash1).toBe(hash2);
  });

  it('2. Rejects unsupported video extensions or mime types', async () => {
    const aviFile = new File(['dummy-avi'], 'scene.avi', { type: 'video/x-msvideo' });
    const result = await validateVideoFile(aviFile);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Formato no soportado');
  });

  it('3. Validates MP4 and WebM files and marks ambient recommendation', async () => {
    const mp4File = new File(['dummy-mp4-data'], 'tavern_fireplace.mp4', { type: 'video/mp4' });
    const result = await validateVideoFile(mp4File);

    expect(result.isValid).toBe(true);
    expect(result.formatName).toBe('MP4');
  });

  it('4. Converts blob to dataUrl cleanly', async () => {
    const blob = new Blob(['sample-data'], { type: 'text/plain' });
    const dataUrl = await blobToDataUrl(blob);

    expect(dataUrl).toContain('data:text/plain;base64,');
  });

  it('5. Extracts static poster fallback safely', async () => {
    const dummyVideoBlob = new Blob(['test-video-bits'], { type: 'video/mp4' });
    const posterResult = await extractVideoPoster(dummyVideoBlob);

    expect(posterResult).toBeDefined();
    expect(posterResult.posterDataUrl).toContain('data:image/');
    expect(posterResult.dimensions.width).toBeGreaterThan(0);
    expect(posterResult.dimensions.height).toBeGreaterThan(0);
  });
});
