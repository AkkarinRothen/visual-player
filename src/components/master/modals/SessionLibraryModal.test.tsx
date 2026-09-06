import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionLibraryModal } from './SessionLibraryModal';
import type { GameSession } from '../../../types';

// Mock hook useGameSession
const mockSessions: GameSession[] = [
  {
    id: 'sess-1',
    name: 'Asalto a la Fortaleza',
    campaignId: 'camp-1',
    status: 'preparing',
    schemaVersion: 1,
    planNotes: '',
    stagedState: null,
    liveState: null,
    revision: 1,
    createdAt: Date.now() - 10000,
    updatedAt: Date.now() - 5000,
    tags: ['mazmorra'],
  },
  {
    id: 'sess-2',
    name: 'El Bosque Olvidado',
    campaignId: 'camp-1',
    status: 'active',
    schemaVersion: 1,
    planNotes: '',
    stagedState: null,
    liveState: null,
    revision: 1,
    createdAt: Date.now() - 20000,
    updatedAt: Date.now() - 15000,
    tags: ['exploracion'],
  },
];

const mockTrashedSessions: GameSession[] = [
  {
    id: 'sess-trash-1',
    name: 'Sesión Cancelada',
    campaignId: 'camp-1',
    status: 'preparing',
    schemaVersion: 1,
    planNotes: '',
    stagedState: null,
    liveState: null,
    revision: 1,
    isDeleted: true,
    deletedAt: Date.now() - 25000,
    createdAt: Date.now() - 30000,
    updatedAt: Date.now() - 25000,
  },
];

vi.mock('../../../hooks/useGameSession', () => ({
  useGameSession: () => ({
    sessions: mockSessions,
    trashedSessions: mockTrashedSessions,
    templates: [],
    currentSession: null,
    isLoading: false,
    createNewSession: vi.fn(),
    switchSession: vi.fn(),
    duplicateCurrentSession: vi.fn(),
    archiveSession: vi.fn(),
    trashSession: vi.fn(),
    restoreFromTrash: vi.fn(),
    emptyTrash: vi.fn(),
    deleteSession: vi.fn(),
    saveAsTemplate: vi.fn(),
    restoreCheckpointAsCopy: vi.fn(),
    getBackupStatus: vi.fn().mockReturnValue({ hasBackup: false }),
    refreshSessions: vi.fn(),
    prepareNextSession: vi.fn(),
    createSessionForNewGroup: vi.fn(),
  }),
}));

vi.mock('../../../db', () => ({
  db: {
    campaigns: {
      toArray: vi.fn().mockResolvedValue([
        { id: 'camp-1', title: 'Campaña Principal' },
      ]),
    },
    sessions: {
      put: vi.fn(),
    },
  },
  createSessionFromTemplate: vi.fn(),
}));

vi.mock('../../../services/gameSessionService', () => ({
  gameSessionService: {
    preflightExport: vi.fn(),
    exportSessionPackage: vi.fn(),
    analyzePackageDiff: vi.fn(),
    importFromPackage: vi.fn(),
    getSessionCheckpoints: vi.fn().mockResolvedValue([]),
  },
}));

describe('SessionLibraryModal Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. No renderiza nada si isOpen es false', () => {
    const { container } = render(
      <SessionLibraryModal
        isOpen={false}
        onClose={vi.fn()}
        campaignId="camp-1"
        onLoadSession={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('2. Renderiza la biblioteca con pestañas y sesiones en preparación cuando isOpen es true', async () => {
    render(
      <SessionLibraryModal
        isOpen={true}
        onClose={vi.fn()}
        campaignId="camp-1"
        onLoadSession={vi.fn()}
      />
    );

    expect(await screen.findByText('Biblioteca de Preparaciones')).toBeDefined();
    expect(screen.getByText('En preparación')).toBeDefined();
    expect(screen.getByText('En curso')).toBeDefined();
    expect(screen.getByText('Asalto a la Fortaleza')).toBeDefined();
    expect(screen.getByPlaceholderText('Nombre de la nueva preparación…')).toBeDefined();
  });

  it('3. Permite alternar de pestaña y muestra sesiones en papelera', async () => {
    render(
      <SessionLibraryModal
        isOpen={true}
        onClose={vi.fn()}
        campaignId="camp-1"
        onLoadSession={vi.fn()}
      />
    );

    await screen.findByText('Biblioteca de Preparaciones');
    const trashTab = screen.getByText('Papelera');
    fireEvent.click(trashTab);

    expect(await screen.findByText('Sesión Cancelada')).toBeDefined();
    expect(screen.getByText('Vaciar papelera')).toBeDefined();
  });

});
