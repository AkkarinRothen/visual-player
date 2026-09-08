import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConversationEditorModal } from './ConversationEditorModal';
import type { Campaign, SavedConversation } from '../../../types';

describe('ConversationEditorModal Suite', () => {
  const mockCampaign: Campaign = {
    id: 'camp-1',
    title: 'Campaña de Prueba',
    createdAt: Date.now(),
    characters: [
      {
        id: 'char-1',
        name: 'Grom Garra Oscura',
        roleOrTitle: 'Líder Orco',
        defaultAvatarUrl: 'https://example.com/grom.png',
        expressions: {
          enojado: 'https://example.com/grom-angry.png',
        },
      },
    ],
    scenes: [],
    macros: [
      {
        id: 'macro-thunder',
        name: 'Trueno y Relámpago',
        description: 'Efecto de tormenta',
        icon: 'zap',
        steps: [],
      },
    ],
  };

  const sampleConversation: SavedConversation = {
    id: 'conv-1',
    title: 'Encuentro con el Oráculo',
    description: 'Encuentro místico en la cueva',
    lines: [
      {
        id: 'line-1',
        speakerName: 'Narrador',
        text: 'La caverna resuena con un murmullo profundo.',
        style: 'narration',
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('renders modal header, line list and line detail form when open', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      <ConversationEditorModal
        isOpen={true}
        campaign={mockCampaign}
        conversation={sampleConversation}
        onSave={handleSave}
        onClose={handleClose}
      />
    );

    expect(screen.getAllByText('Editar Conversación')[0]).toBeDefined();
    expect(screen.getByDisplayValue('Encuentro con el Oráculo')).toBeDefined();
    expect(screen.getByText('Intervenciones (1)')).toBeDefined();
    expect(screen.getByText('Intervención #1')).toBeDefined();
    expect(screen.getByDisplayValue('La caverna resuena con un murmullo profundo.')).toBeDefined();

    // Close button
    const closeBtn = screen.getByTitle('Cerrar');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows adding and editing lines in the script', () => {
    const handleSave = vi.fn();

    render(
      <ConversationEditorModal
        isOpen={true}
        campaign={mockCampaign}
        conversation={null}
        onSave={handleSave}
        onClose={vi.fn()}
      />
    );

    expect(screen.getAllByText('Nueva Conversación')[0]).toBeDefined();

    // Add line
    const addBtn = screen.getByText('Añadir');
    fireEvent.click(addBtn);

    expect(screen.getByText('Intervenciones (2)')).toBeDefined();
    expect(screen.getByText('Intervención #2')).toBeDefined();

    // Edit textarea
    const textarea = screen.getByPlaceholderText('Escribe el diálogo que aparecerá en la Mesa...');
    fireEvent.change(textarea, { target: { value: '¡Alto ahí, intrusos!' } });
    expect(screen.getByDisplayValue('¡Alto ahí, intrusos!')).toBeDefined();
  });

  it('toggles rehearsal mode on and off', () => {
    render(
      <ConversationEditorModal
        isOpen={true}
        campaign={mockCampaign}
        conversation={sampleConversation}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const rehearsalToggle = screen.getByText('Modo Ensayo');
    fireEvent.click(rehearsalToggle);

    expect(screen.getByText('Modo Ensayo Local (Sin conexión a la Mesa)')).toBeDefined();
    expect(screen.getByText('Salir del Ensayo')).toBeDefined();

    // Toggle off
    fireEvent.click(screen.getByText('Salir del Ensayo'));
    expect(screen.getByText('Intervención #1')).toBeDefined();
  });

  it('triggers onSave and onClose when saving changes', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <ConversationEditorModal
        isOpen={true}
        campaign={mockCampaign}
        conversation={sampleConversation}
        onSave={handleSave}
        onClose={handleClose}
      />
    );

    const saveBtn = screen.getByText('Guardar');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
