/**
 * Utilidades para la optimización de imágenes en cliente (Android y Web).
 * Adapta resoluciones según el tipo de recurso (fondo, personaje, prop),
 * genera miniaturas para listas/bibliotecas y calcula hash SHA-256 para deduplicación.
 */

export interface OptimizeImageOptions {
  keepOriginal?: boolean;
  maxDimension?: number;
  quality?: number;
}

export interface OptimizedImageResult {
  dataUrl: string;
  thumbnailUrl: string;
  originalDataUrl?: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  format: 'webp' | 'png' | 'jpeg';
  sha256: string;
}

/**
 * Calcula el hash SHA-256 de un ArrayBuffer o string para deduplicación por contenido.
 */
export async function calculateSha256(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple si crypto.subtle no estuviera disponible en entornos limitados
  let hash = 0;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash + bytes[i]) | 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Convierte un Blob o File a ArrayBuffer.
 */
function fileToArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Carga una imagen de forma segura en un elemento HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('No se pudo decodificar la imagen: ' + e));
    img.src = src;
  });
}

/**
 * Verifica si un lienzo Canvas contiene píxeles con transparencia (canal alfa < 255).
 */
function hasAlphaChannel(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const sampleWidth = Math.min(width, 100);
    const sampleHeight = Math.min(height, 100);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    for (let i = 3; i < imageData.length; i += 4) {
      if (imageData[i] < 250) {
        return true;
      }
    }
  } catch {
    // Si hay error de seguridad o contexto, asumimos falso
  }
  return false;
}

/**
 * Optimiza una imagen subida según su rol esperado:
 * - 'background': máx 1920×1080 proporcional (sin agrandar menores), WebP/JPEG ~82%
 * - 'character' | 'prop': máx 1536px lado mayor proporcional, preservando alfa en WebP/PNG ~85%
 */
export async function optimizeUploadedImage(
  file: File | Blob,
  role: 'background' | 'character' | 'prop' = 'background',
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> {
  // Comprobar formato HEIC no soportado directamente en navegadores
  const fileName = file instanceof File ? file.name.toLowerCase() : '';
  const fileType = file.type.toLowerCase();
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif') || fileType.includes('heic') || fileType.includes('heif')) {
    throw new Error('El formato HEIC/HEIF de Apple no es compatible directamente. Por favor expórtalo como JPG o PNG desde Fotos.');
  }

  const rawBuffer = await fileToArrayBuffer(file);
  const sha256 = await calculateSha256(rawBuffer);
  const originalSize = file.size;

  // Convertir a DataURL temporal para cargar en Image
  const tempUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(tempUrl);
  } finally {
    URL.revokeObjectURL(tempUrl);
  }

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  // Calcular dimensiones según rol acordado
  let targetWidth = naturalWidth;
  let targetHeight = naturalHeight;

  if (role === 'background') {
    const MAX_W = 1920;
    const MAX_H = 1080;
    // Solo reducir, nunca agrandar imágenes pequeñas
    if (naturalWidth > MAX_W || naturalHeight > MAX_H) {
      const scale = Math.min(MAX_W / naturalWidth, MAX_H / naturalHeight);
      targetWidth = Math.round(naturalWidth * scale);
      targetHeight = Math.round(naturalHeight * scale);
    }
  } else {
    // Personajes y props: limitar el lado mayor a 1536px
    const MAX_SIDE = options.maxDimension || 1536;
    const maxSide = Math.max(naturalWidth, naturalHeight);
    if (maxSide > MAX_SIDE) {
      const scale = MAX_SIDE / maxSide;
      targetWidth = Math.round(naturalWidth * scale);
      targetHeight = Math.round(naturalHeight * scale);
    }
  }

  // Renderizar a Canvas principal
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D para optimizar la imagen.');
  }

  // Suavizado de imagen de alta calidad
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Detectar canal alfa para decidir formato óptimo
  const isAlpha = hasAlphaChannel(ctx, targetWidth, targetHeight);
  let format: 'webp' | 'png' | 'jpeg' = 'webp';
  const quality = options.quality || (role === 'background' ? 0.82 : 0.85);

  let dataUrl = canvas.toDataURL('image/webp', quality);
  // Fallback si el navegador no soporta webp export
  if (!dataUrl.startsWith('data:image/webp')) {
    if (isAlpha) {
      format = 'png';
      dataUrl = canvas.toDataURL('image/png');
    } else {
      format = 'jpeg';
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
  } else {
    format = 'webp';
  }

  // Estimar peso en bytes del DataURL base64 (~ 3/4 del largo del string base64)
  const base64Content = dataUrl.split(',')[1] || '';
  const optimizedSize = Math.round((base64Content.length * 3) / 4);

  // Generar miniatura independiente (160×160 máx manteniendo proporción)
  const thumbSize = 160;
  const thumbScale = Math.min(thumbSize / naturalWidth, thumbSize / naturalHeight);
  const thumbWidth = Math.max(1, Math.round(naturalWidth * thumbScale));
  const thumbHeight = Math.max(1, Math.round(naturalHeight * thumbScale));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;
  const thumbCtx = thumbCanvas.getContext('2d', { alpha: true });
  let thumbnailUrl = dataUrl;

  if (thumbCtx) {
    thumbCtx.imageSmoothingEnabled = true;
    thumbCtx.imageSmoothingQuality = 'medium';
    thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
    const thumbData = thumbCanvas.toDataURL('image/webp', 0.75);
    if (thumbData.startsWith('data:image/webp')) {
      thumbnailUrl = thumbData;
    } else {
      thumbnailUrl = thumbCanvas.toDataURL(isAlpha ? 'image/png' : 'image/jpeg', 0.75);
    }
  }

  // Leer original DataURL solo si el usuario pidió conservarlo explícitamente
  let originalDataUrl: string | undefined = undefined;
  if (options.keepOriginal) {
    const originalReader = new FileReader();
    originalDataUrl = await new Promise((resolve) => {
      originalReader.onload = () => resolve(originalReader.result as string);
      originalReader.onerror = () => resolve(undefined);
      originalReader.readAsDataURL(file);
    });
  }

  return {
    dataUrl,
    thumbnailUrl,
    originalDataUrl,
    originalSize,
    optimizedSize,
    width: targetWidth,
    height: targetHeight,
    format,
    sha256,
  };
}

/**
 * Formatea tamaños en bytes a una representación legible (ej: "2.4 MB", "340 KB").
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
