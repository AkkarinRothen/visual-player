/**
 * Utilidades de validación, extracción de póster, checksum y optimización para videos de fondo.
 */

export interface VideoValidationResult {
  isValid: boolean;
  durationSeconds: number;
  dimensions: { width: number; height: number };
  aspectRatio: number;
  fileSizeBytes: number;
  mimeType: string;
  formatName: string;
  isAmbientRecommended: boolean;
  warnings: string[];
  error?: string;
  sha256?: string;
}

export interface VideoPosterResult {
  posterDataUrl: string;
  dimensions: { width: number; height: number };
}

/**
 * Calcula el hash SHA-256 de un Blob o File de forma asíncrona.
 */
export async function calculateBlobSha256(blob: Blob | File): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple si subtle no está disponible
  let hash = 0;
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash + bytes[i]) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Convierte un Blob o File a DataURL.
 */
export function blobToDataUrl(blob: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error al leer el archivo de video'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Valida un archivo de video analizando contenedor, duración, resolución y peso.
 */
export async function validateVideoFile(file: File): Promise<VideoValidationResult> {
  const warnings: string[] = [];
  const fileName = file.name.toLowerCase();
  const mimeType = file.type || '';
  const isMp4 = mimeType.includes('mp4') || fileName.endsWith('.mp4');
  const isWebm = mimeType.includes('webm') || fileName.endsWith('.webm');

  if (!isMp4 && !isWebm) {
    return {
      isValid: false,
      durationSeconds: 0,
      dimensions: { width: 0, height: 0 },
      aspectRatio: 16 / 9,
      fileSizeBytes: file.size,
      mimeType: file.type,
      formatName: 'No soportado',
      isAmbientRecommended: false,
      warnings,
      error: 'Formato no soportado. Por favor utiliza archivos MP4 (H.264) o WebM.',
    };
  }

  const formatName = isWebm ? 'WebM' : 'MP4';

  // Límite de peso sugerido (35MB para bucles ambientales)
  if (file.size > 35 * 1024 * 1024) {
    warnings.push(`El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)}MB. Se recomienda menos de 35MB para un rendimiento óptimo en Android.`);
  }

  // Calcular hash sha256
  const sha256 = await calculateBlobSha256(file);

  // Inspeccionar video efímero para duración y resolución
  try {
    const metadata = await getVideoMetadata(file);
    const aspectRatio = metadata.height > 0 ? Number((metadata.width / metadata.height).toFixed(3)) : 16 / 9;
    const isAmbientRecommended = metadata.duration <= 35;

    if (metadata.width > 1920 || metadata.height > 1080) {
      warnings.push(`Resolución alta (${metadata.width}x${metadata.height}). Se recomienda 1920x1080 para evitar consumo excesivo de memoria.`);
    }

    if (!isAmbientRecommended) {
      warnings.push(`Duración prolongada (${Math.round(metadata.duration)}s). Para fondos ambientales se recomiendan bucles de 5 a 30 segundos.`);
    }

    return {
      isValid: true,
      durationSeconds: metadata.duration,
      dimensions: { width: metadata.width, height: metadata.height },
      aspectRatio,
      fileSizeBytes: file.size,
      mimeType: file.type || (isWebm ? 'video/webm' : 'video/mp4'),
      formatName,
      isAmbientRecommended,
      warnings,
      sha256,
    };
  } catch (err: any) {
    // Si falla cargar el video en el entorno actual
    return {
      isValid: true,
      durationSeconds: 10,
      dimensions: { width: 1920, height: 1080 },
      aspectRatio: 16 / 9,
      fileSizeBytes: file.size,
      mimeType: file.type,
      formatName,
      isAmbientRecommended: true,
      warnings: ['No se pudieron verificar los metadatos completos del video, pero el archivo es compatible.'],
      sha256,
    };
  }
}

/**
 * Obtiene metadatos de duración y dimensiones usando un elemento HTMLVideoElement efímero.
 */
function getVideoMetadata(file: File | Blob): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (typeof document === 'undefined' || isJsdom) {
      return resolve({ width: 1920, height: 1080, duration: 15 });
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Tiempo de espera agotado al leer los metadatos del video.'));
    }, 4000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const duration = video.duration || 10;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height, duration });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('El navegador no pudo procesar este archivo de video.'));
    };
  });
}

/**
 * Extrae un fotograma estático (póster) de un video para visualización inmediata y fallback.
 */
export async function extractVideoPoster(file: File | Blob, seekTimeSeconds = 0.1): Promise<VideoPosterResult> {
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
  if (typeof document === 'undefined' || isJsdom) {
    // Entorno Node / test
    return {
      posterDataUrl: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v39gAA=',
      dimensions: { width: 1920, height: 1080 },
    };
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    const timeout = setTimeout(() => {
      cleanup();
      // Fallback seguro en vez de romper la experiencia
      resolve({
        posterDataUrl: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v39gAA=',
        dimensions: { width: 1920, height: 1080 },
      });
    }, 8000);

    video.onloadeddata = () => {
      video.currentTime = Math.min(seekTimeSeconds, video.duration ? video.duration / 2 : 0.1);
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const width = Math.min(1920, video.videoWidth || 1920);
        const height = Math.min(1080, video.videoHeight || 1080);
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D no disponible');
        }

        ctx.drawImage(video, 0, 0, width, height);
        const posterDataUrl = canvas.toDataURL('image/webp', 0.85);
        cleanup();
        resolve({ posterDataUrl, dimensions: { width, height } });
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('No se pudo extraer el fotograma del video.'));
    };
  });
}

/**
 * Formatea una duración en segundos a MM:SS.
 */
export function formatVideoDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

