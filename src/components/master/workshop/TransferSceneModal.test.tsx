import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TransferSceneModal } from './TransferSceneModal';
import type { Scene } from '../../../types';

const { mockSession, mockCampaign } = vi.hoisted(() => ({
  mockSession: {
    id: 'sess-1',
    name: 'Sesión Principal',
    campaignId: 'camp-1',
    status: 'preparing' as const,
    schemaVersion: 1,
    planNotes: '',
    stagedState: null,
    liveState: null,
    frozenScenes: [],
    revision: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  mockCampaign: {
    id: 'camp-1',
    title: 'Campaña de Prueba',
    createdAt: Date.now(),
    scenes: [],
    characters: [],
  },
}));

const mockScene: Scene = {
  id: 'sc-1',
  name: 'Templo en Ruinas',
  backgroundUrl: 'https://example.com/temple.jpg',
  activeCharacters: [
    {
      id: 'char-1',
      name: 'Explorador',
      avatarUrl: 'https://example.com/exp.png',
      position: 'center-left',
      isSpeaking: false,
    },
  ],
  weather: 'rain',
  lighting: 'sunset',
};

vi.mock('../../../db/sessionDb', () => ({
  getSessionsByCampaign: vi.fn().mockResolvedValue([mockSession]),
  createGameSession: vi.fn().mockImplementation((campId: string, name: string) =>
    Promise.resolve({
      id: 'sess-new',
      name,
      campaignId: campId,
      frozenScenes: [],
      status: 'preparing',
      schemaVersion: 1,
      planNotes: '',
      stagedState: null,
      liveState: null,
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  ),
}));

vi.mock('../../../db', () => ({
  db: {
    sessions: {
      get: vi.fn().mockResolvedValue(mockSession),
      update: vi.fn().mockResolvedValue(1),
    },
    transaction: vi.fn().mockImplementation((_mode: string, _table: any, callback: () => Promise<any>) =>
      callback()
    ),
    campaigns: {
      get: vi.fn().mockResolvedValue(mockCampaign),
    },
  },
}));

describe('TransferSceneModal Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders scene summary, destination session picker and transfer modes', async () => {
    const handleClose = vi.fn();

    await act(async () => {
      render(
        <TransferSceneModal
          isOpen={true}
          scene={mockScene}
          campaign={mockCampaign}
          onClose={handleClose}
        />
      );
    });

    expect(screen.getByText('Llevar Escena a Preparación')).toBeDefined();
    expect(screen.getByText('Templo en Ruinas')).toBeDefined();
    expect(screen.getByText('1 figura')).toBeDefined();
    expect(screen.getByText('Sesión o Preparación de Destino:')).toBeDefined();
    expect(screen.getByText(/Añadir al repertorio disponible/i)).toBeDefined();
    expect(screen.getByText(/Abrir como escena en preparación/i)).toBeDefined();

    const closeBtn = screen.getByLabelText('Cerrar modal');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows toggling new session input form', async () => {
    await act(async () => {
      render(
        <TransferSceneModal
          isOpen={true}
          scene={mockScene}
          campaign={mockCampaign}
          onClose={vi.fn()}
        />
      );
    });

    const toggleBtn = screen.getByText('+ Nueva preparación');
    fireEvent.click(toggleBtn);

    expect(screen.getByPlaceholderText('Nombre de la nueva sesión...')).toBeDefined();
    expect(screen.getByText('Cancelar nueva')).toBeDefined();
  });

  it('confirms transfer and transitions to success view with open session option', async () => {
    const handleSuccess = vi.fn();
    const handleOpenSession = vi.fn();
    const handleClose = vi.fn();

    await act(async () => {
      render(
        <TransferSceneModal
          isOpen={true}
          scene={mockScene}
          campaign={mockCampaign}
          onClose={handleClose}
          onSuccess={handleSuccess}
          onOpenSession={handleOpenSession}
        />
      );
    });

    const confirmBtn = screen.getByText('Confirmar Traslado');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Success view should appear
    expect(screen.getByText('¡Escena incorporada con éxito!')).toBeDefined();
    expect(handleSuccess).toHaveBeenCalledWith('Sesión Principal', 'repertoire');

    // Click "Abrir Preparación"
    const openSessionBtn = screen.getByText('Abrir Preparación');
    fireEvent.click(openSessionBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenSession).toHaveBeenCalledWith('sess-1');
  });
});
