import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetPickerModal } from './AssetPickerModal';
import { ModalErrorBoundary } from './ModalErrorBoundary';
import { db } from '../../db';

describe('AssetPickerModal & ModalErrorBoundary', () => {
  beforeEach(async () => {
    await db.assets.clear();
  });

  it('1. ModalErrorBoundary captura errores sin desmontar la aplicación ni dejar pantalla negra', () => {
    const ProblematicChild = () => {
      throw new Error('Fallo simulado en componente');
    };

    render(
      <ModalErrorBoundary modalTitle="Test Modal" onClose={vi.fn()}>
        <ProblematicChild />
      </ModalErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Test Modal')).toBeDefined();
    expect(screen.getByText(/Fallo simulado en componente/)).toBeDefined();
    expect(screen.getByText('Reintentar')).toBeDefined();
  });

  it('2. AssetPickerModal en modo character se abre por defecto en Mi Biblioteca', async () => {
    render(
      <AssetPickerModal
        isOpen={true}
        mode="character"
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Mi Biblioteca/)).toBeDefined();
    // La pestaña activa debe ser Mi Biblioteca
    const libraryTab = screen.getByRole('button', { name: /Mi Biblioteca/i });
    expect(libraryTab).toBeDefined();
  });

  it('3. Búsqueda segura filtra sin fallar aunque haya activos con nombres o tags nulos', async () => {
    // Insertar activo con nombre vacío o indefinido y activo normal
    await db.assets.bulkPut([
      {
        id: 'asset-1',
        name: undefined as any,
        type: 'image',
        dataUrl: 'data:image/png;base64,aaa',
        createdAt: 100,
      },
      {
        id: 'asset-2',
        name: 'Mago Elfo de Fuego',
        type: 'image',
        dataUrl: 'data:image/png;base64,bbb',
        createdAt: 200,
        tags: ['mago', 'fuego'],
      },
    ]);

    render(
      <AssetPickerModal
        isOpen={true}
        mode="character"
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Esperar a que cargue de IndexedDB
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar en recursos guardados...')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Buscar en recursos guardados...');
    // Escribir en el buscador no debe lanzar excepción de TypeError
    fireEvent.change(searchInput, { target: { value: 'mago' } });

    await waitFor(() => {
      expect(screen.getByText('Mago Elfo de Fuego')).toBeDefined();
    });
  });

  it('4. Pre-selecciona pack de personajes si existe en la base de datos', async () => {
    await db.assets.bulkPut([
      {
        id: 'char-1',
        name: 'Hero Knight',
        type: 'image',
        dataUrl: 'data:image/png;base64,knight',
        packId: 'pack-heroes-vol1',
        packName: 'Pack de Héroes y Personajes',
        category: 'character',
        createdAt: 300,
      },
      {
        id: 'map-1',
        name: 'Dungeon Map 4K',
        type: 'image',
        dataUrl: 'data:image/png;base64,map',
        packId: 'pack-maps',
        packName: 'Pack de Mapas',
        category: 'background',
        createdAt: 100,
      },
    ]);

    render(
      <AssetPickerModal
        isOpen={true}
        mode="character"
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      const select = screen.getByLabelText('Filtrar por pack de recursos') as HTMLSelectElement;
      expect(select.value).toBe('pack-heroes-vol1');
    });
  });
});
