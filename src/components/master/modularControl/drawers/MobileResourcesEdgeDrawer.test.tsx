import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileResourcesEdgeDrawer } from './MobileResourcesEdgeDrawer';
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
});
