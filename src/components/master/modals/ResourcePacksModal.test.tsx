import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourcePacksModal } from './ResourcePacksModal';
import { resourcePackService } from '../../../services/resourcePackService';
import type { VisualResourcePack } from '../../../types';
import { db } from '../../../db';

describe('ResourcePacksModal', () => {
  beforeEach(async () => {
    await db.assets.clear();
    await db.resourcePacks.clear();
    vi.restoreAllMocks();
  });

  const samplePack: VisualResourcePack = {
    schemaVersion: 1,
    type: 'visual_resource_pack',
    id: 'pack-monsters-vol1',
    name: 'Monstruos Legendarios Vol. 1',
    category: 'tokens',
    author: 'Czepeku',
    description: 'Pack de bestias y monstruos',
    coverDataUrl: 'data:image/webp;base64,sample',
    createdAt: 1725500000000,
    itemCount: 2,
    totalSizeBytes: 2048,
    assets: [
      {
        id: 'm1',
        name: 'Beholder Terrible',
        type: 'image',
        category: 'token',
        dataUrl: 'data:image/webp;base64,beholder',
      },
      {
        id: 'm2',
        name: 'Dragón Rojo Adulto',
        type: 'image',
        category: 'token',
        dataUrl: 'data:image/webp;base64,dragon',
      },
    ],
  };

  it('1. No renderiza nada cuando isOpen es false', () => {
    const { container } = render(<ResourcePacksModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('2. Muestra cabecera y estado vacío cuando no hay packs instalados', async () => {
    render(<ResourcePacksModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Packs de Recursos Visuales/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/No tenés ningún paquete instalado todavía/i)).toBeDefined();
    });
  });

  it('3. Renderiza lista de paquetes instalados', async () => {
    await resourcePackService.installPackObject(samplePack);

    render(<ResourcePacksModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Monstruos Legendarios Vol. 1')).toBeDefined();
      expect(screen.getByText(/por Czepeku/i)).toBeDefined();
      expect(screen.getAllByText(/2 recursos/i).length).toBeGreaterThan(0);
    });
  });

  it('4. Permite previsualizar los recursos de un paquete al hacer clic en Ver recursos', async () => {
    await resourcePackService.installPackObject(samplePack);

    render(<ResourcePacksModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Monstruos Legendarios Vol. 1')).toBeDefined();
    });

    const viewBtn = screen.getByLabelText(/Ver recursos de Monstruos Legendarios Vol. 1/i);
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText('Beholder Terrible')).toBeDefined();
      expect(screen.getByText('Dragón Rojo Adulto')).toBeDefined();
      expect(screen.getByText(/Volver a lista de packs/i)).toBeDefined();
    });

    const backBtn = screen.getByText(/Volver a lista de packs/i);
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Monstruos Legendarios Vol. 1')).toBeDefined();
    });
  });

  it('5. Permite desinstalar un paquete tras confirmación', async () => {
    await resourcePackService.installPackObject(samplePack);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ResourcePacksModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Monstruos Legendarios Vol. 1')).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText(/Desinstalar Monstruos Legendarios Vol. 1/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/desinstalado/i)).toBeDefined();
      expect(screen.getByText(/No tenés ningún paquete instalado todavía/i)).toBeDefined();
    });
  });
});
