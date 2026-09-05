import 'fake-indexeddb/auto';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { MobileResourcesEdgeDrawer } from './MobileResourcesEdgeDrawer';
import { db } from '../../../../db';
import type { Campaign } from '../../../../types';

const mockCampaign: Campaign = {
  id: 'camp-1',
  title: 'Campaña Test',
  createdAt: 1700000000000,
  scenes: [
    {
      id: 'scene-crypt',
      name: 'Cripta Olvidada',
      backgroundUrl: 'https://example.com/crypt.jpg',
    },
  ],
  characters: [
    {
      id: 'char-lyra',
      name: 'Lyra',
      roleOrTitle: 'Maga Elfa',
      defaultAvatarUrl: 'https://example.com/lyra.png',
    },
  ],
  encounters: [],
  favorites: [
    {
      id: 'fav-1',
      label: 'Luz Celestial',
      type: 'macro',
    },
  ],
};

describe('MobileResourcesEdgeDrawer', () => {
  beforeEach(async () => {
    await db.assets.clear();
    await db.resourcePacks.clear();
  });

  it('no renderiza nada cuando isOpen es false', () => {
    render(
      <MobileResourcesEdgeDrawer
        isOpen={false}
        onClose={vi.fn()}
        campaign={mockCampaign}
      />
    );

    expect(screen.queryByTestId('mobile-resources-drawer')).toBeNull();
  });

  it('renderiza favoritos, lista de escenas y personajes de biblioteca cuando isOpen es true', () => {
    render(
      <MobileResourcesEdgeDrawer
        isOpen={true}
        onClose={vi.fn()}
        campaign={mockCampaign}
      />
    );

    expect(screen.getByTestId('mobile-resources-drawer')).toBeDefined();
    expect(screen.getByText('Recursos y Gestión')).toBeDefined();
    expect(screen.getByText('Luz Celestial')).toBeDefined();
    expect(screen.getByText('Cripta Olvidada')).toBeDefined();
    expect(screen.getByText('Lyra')).toBeDefined();
  });

  it('al tocar una escena invoca onSelectScene y cierra el drawer', () => {
    const onSelectScene = vi.fn();
    const onClose = vi.fn();

    render(
      <MobileResourcesEdgeDrawer
        isOpen={true}
        onClose={onClose}
        campaign={mockCampaign}
        onSelectScene={onSelectScene}
      />
    );

    fireEvent.click(screen.getByText('Cripta Olvidada'));
    expect(onSelectScene).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'scene-crypt' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('al tocar un NPC invoca onInvokeCharacter y cierra el drawer', () => {
    const onInvokeCharacter = vi.fn();
    const onClose = vi.fn();

    render(
      <MobileResourcesEdgeDrawer
        isOpen={true}
        onClose={onClose}
        campaign={mockCampaign}
        onInvokeCharacter={onInvokeCharacter}
      />
    );

    fireEvent.click(screen.getByText('Lyra'));
    expect(onInvokeCharacter).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'char-lyra' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('al tocar un favorito invoca onExecuteFavorite y cierra el drawer', async () => {
    const onExecuteFavorite = vi.fn();
    const onClose = vi.fn();

    render(
      <MobileResourcesEdgeDrawer
        isOpen={true}
        onClose={onClose}
        campaign={mockCampaign}
        onExecuteFavorite={onExecuteFavorite}
      />
    );

    fireEvent.click(screen.getByText('Luz Celestial'));
    expect(onExecuteFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fav-1' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('permite buscar y usar recursos instalados desde packs durante la sesión', async () => {
    const onUseResourceAsset = vi.fn();
    const onClose = vi.fn();

    await db.assets.bulkPut([
      {
        id: 'asset-bg-forest',
        name: 'Bosque Nocturno',
        type: 'image',
        dataUrl: 'data:image/webp;base64,bosque',
        thumbnailUrl: 'data:image/webp;base64,bosque-thumb',
        createdAt: 1700000000100,
        packId: 'pack-fondos',
        packName: 'Fondos Elementales',
        category: 'background',
        tags: ['bosque', 'noche'],
      },
      {
        id: 'asset-token-bandit',
        name: 'Bandido de Camino',
        type: 'image',
        dataUrl: 'data:image/webp;base64,bandido',
        createdAt: 1700000000200,
        packId: 'pack-tokens',
        packName: 'PNJs y Aldeanos',
        category: 'token',
        tags: ['bandido'],
      },
    ]);

    render(
      <MobileResourcesEdgeDrawer
        isOpen={true}
        onClose={onClose}
        campaign={mockCampaign}
        onUseResourceAsset={onUseResourceAsset}
      />
    );

    expect(await screen.findByText('Bosque Nocturno')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Buscar recursos de packs instalados'), {
      target: { value: 'bandido' },
    });

    fireEvent.click(await screen.findByText('Bandido de Camino'));
    expect(onUseResourceAsset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'asset-token-bandit', category: 'token' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
