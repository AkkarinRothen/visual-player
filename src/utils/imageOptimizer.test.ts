import { describe, it, expect } from 'vitest';
import { calculateSha256, formatBytes, optimizeUploadedImage } from './imageOptimizer';

describe('imageOptimizer', () => {
  it('calcula hash SHA-256 consistente para deduplicación por contenido', async () => {
    const encoder = new TextEncoder();
    const buffer1 = encoder.encode('archivo_imagen_prueba').buffer;
    const buffer2 = encoder.encode('archivo_imagen_prueba').buffer;
    const buffer3 = encoder.encode('otra_imagen').buffer;

    const hash1 = await calculateSha256(buffer1);
    const hash2 = await calculateSha256(buffer2);
    const hash3 = await calculateSha256(buffer3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64);
  });

  it('formatea tamaños de bytes a representaciones legibles', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
    expect(formatBytes(500)).toBe('500 B');
  });

  it('detecta y rechaza archivos con formato HEIC/HEIF de Apple con mensaje instructivo', async () => {
    const fakeHeicFile = new File(['fake-bytes'], 'foto_vacaciones.heic', { type: 'image/heic' });
    await expect(optimizeUploadedImage(fakeHeicFile, 'character')).rejects.toThrow(
      /El formato HEIC\/HEIF de Apple no es compatible directamente/
    );
  });
});
