import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScenePresetModal } from './ScenePresetModal';
import type { DisplayState, SceneCompositionPreset, SavedConversation } from '../../../types';

const {
  mockSaveSceneAsCompositionPreset,
  mockGetSceneCompositionPresets,
  mockInstantiateScenePresetIntoSession,
  mockScanPresetDependencies,
  mockCreateSessionCheckpoint,
} = vi.hoisted(() => ({
  mockSaveSceneAsCompositionPreset: vi.fn(),
  mockGetSceneCompositionPresets: vi.fn(),
  mockInstantiateScenePresetIntoSession: vi.fn(),
  mockScanPresetDependencies: vi.fn(),
  mockCreateSessionCheckpoint: vi.fn(),
}));

vi.mock('../../../db', () => ({
  saveSceneAsCompositionPreset: mockSaveSceneAsCompositionPreset,
  getSceneCompositionPresets: mockGetSceneCompositionPresets,
  instantiateScenePresetIntoSession: mockInstantiateScenePresetIntoSession,
  scanPresetDependencies: mockScanPresetDependencies,
  createSessionCheckpoint: mockCreateSessionCheckpoint,
}));

vi.mock('../../../services/gameSessionService', () => ({
  gameSessionService: {
    getCurrentSession: vi.fn(() => ({ id: 'sess-1' })),
  },
}));

describe('ScenePresetModal Suite', () => {
  const mockStagedState: DisplayState = {
    currentSceneId: 'sc-1',
    sceneName: 'Taberna El Dragon Verde',
    backgroundUrl: 'https://example.com/tavern.jpg',
    characters: [
      {
        id: 'c-1',
        name: 'Tabernero',
        avatarUrl: 'https://example.com/bartender.png',
        position: 'center-right',
        normalizedX: 60,
        normalizedY: 0,
        isSpeaking: false,
      },
    ],
    props: [],
    lights: [],
    emitters: [],
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: { text: 'Taberna', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/tavern.mp3',
    ambientPlaying: true,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
    },
  };

  const samplePresets: SceneCompositionPreset[] = [
    {
      id: 'preset-1',
      name: 'Castillo Encantado',
      description: 'Gran salón del trono con niebla',
      tags: ['castillo', 'trono'],
      backgroundUrl: 'https://example.com/castle.jpg',
      characters: [],
      lights: [],
      props: [],
      createdAt: 1000,
      updatedAt: 1000,
      campaignId: 'camp-1',
    },
  ];

  const sampleConversations: SavedConversation[] = [
    {
      id: 'conv-1',
      title: 'Rumores de la taberna',
      lines: [
        { id: 'l1', speakerCharacterId: 'c-1', text: 'Bienvenidos viajeros' },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSceneCompositionPresets.mockResolvedValue(samplePresets);
    mockScanPresetDependencies.mockResolvedValue({
      isFullySelfContained: true,
      includedCount: 1,
      alreadyAvailableCount: 2,
      missing: [],
      characterResolutions: [],
      conversationResolution: null,
    });
    mockSaveSceneAsCompositionPreset.mockResolvedValue(samplePresets[0]);
    mockInstantiateScenePresetIntoSession.mockResolvedValue({ id: 'sess-1' });
  });

  it('1. Renderiza correctamente en modo "save" con vista previa de borrador y formulario', () => {
    const onClose = vi.fn();
    render(
      <ScenePresetModal
        isOpen={true}
        mode="save"
        campaignId="camp-1"
        stagedState={mockStagedState}
        campaignConversations={sampleConversations}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Guardar Escena como Preset Reutilizable')).toBeTruthy();
    expect(screen.getByDisplayValue('Taberna El Dragon Verde')).toBeTruthy();
    expect(screen.getByText('1 Personajes')).toBeTruthy();
    expect(screen.getByText('Audio Activo')).toBeTruthy();
    expect(screen.getByText('Guardar Preset de Escena')).toBeTruthy();
  });

  it('2. Ejecuta el guardado al pulsar "Guardar Preset de Escena" en modo save', async () => {
    const onClose = vi.fn();
    const onPresetSaved = vi.fn();

    render(
      <ScenePresetModal
        isOpen={true}
        mode="save"
        campaignId="camp-1"
        stagedState={mockStagedState}
        onClose={onClose}
        onPresetSaved={onPresetSaved}
      />
    );

    const saveBtn = screen.getByText('Guardar Preset de Escena');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSaveSceneAsCompositionPreset).toHaveBeenCalledWith(
        'camp-1',
        mockStagedState,
        'Taberna El Dragon Verde',
        expect.objectContaining({
          description: undefined,
          tags: [],
        })
      );
    });
  });

  it('3. Renderiza en modo "insert", carga presets y permite inspeccionar y añadir como escena nueva', async () => {
    const onClose = vi.fn();
    const onPresetInstantiated = vi.fn();

    render(
      <ScenePresetModal
        isOpen={true}
        mode="insert"
        campaignId="camp-1"
        sessionId="sess-1"
        stagedState={mockStagedState}
        onClose={onClose}
        onPresetInstantiated={onPresetInstantiated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Insertar Preset de Escena en Preparación')).toBeTruthy();
      expect(screen.getAllByText('Castillo Encantado').length).toBeGreaterThanOrEqual(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Pieza 100% Autocontenida (Lista sin Internet)')).toBeTruthy();
    });

    const appendBtn = screen.getByText('Añadir como Escena Nueva (Recomendado)');
    fireEvent.click(appendBtn);

    await waitFor(() => {
      expect(mockInstantiateScenePresetIntoSession).toHaveBeenCalledWith(
        'sess-1',
        'preset-1',
        expect.objectContaining({
          mode: 'append_scene',
        })
      );
      expect(onPresetInstantiated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('4. Cierra el modal al hacer clic en el botón de cerrar o en el overlay', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ScenePresetModal
        isOpen={true}
        mode="save"
        campaignId="camp-1"
        stagedState={mockStagedState}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByTitle('Cerrar');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = container.querySelector('.scene-preset-overlay');
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
