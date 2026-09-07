import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

/** Writes text to the native clipboard when available and falls back to the browser API. */
export async function writeClipboardText(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Clipboard.write({ string: text });
      return;
    } catch {
      // Fall back to the browser clipboard when the native plugin is unavailable.
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('No se pudo acceder al portapapeles.');
  }
}
