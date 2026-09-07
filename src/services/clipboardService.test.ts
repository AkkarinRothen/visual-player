import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeClipboardText } from './clipboardService';

describe('clipboardService', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('usa el portapapeles web en el navegador', async () => {
    await writeClipboardText('Visual Player');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Visual Player');
  });
});
