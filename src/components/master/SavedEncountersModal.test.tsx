import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavedEncountersModal } from './SavedEncountersModal';
import type { Campaign, SavedEncounter } from '../../types';

describe('SavedEncountersModal Suite', () => {
  const mockCampaign: Campaign = {
    id: 'camp-1',
    title: 'La Mina Perdida',
    createdAt: Date.now(),
    scenes: [],
    characters: [
      {
        id: 'char-1',
        name: 'Guerrero Enano',
        defaultAvatarUrl: 'https://example.com/dwarf.png',
        roleOrTitle: 'Defensor',
        maxHp: 45,
      },
    ],
  };

  const sampleEncounters: SavedEncounter[] = [
    {
      id: 'enc-1',
      campaignId: 'camp-1',
      name: 'Emboscada Goblin',
      description: 'Goblins apostados en los matorrales',
      difficulty: 'medio',
      rewardsSummary: '100 XP, 15 PO',
      dmNotes: 'Huyen si el líder muere',
      combatants: [
        {
          id: 'cbt-1',
          name: 'Goblin Arquero',
          avatarUrl: 'https://example.com/goblin1.png',
          maxHp: 12,
          currentHp: 12,
          isMonster: true,
          showHpToPlayers: false,
          initiativeType: 'roll_d20',
          initiativeModifier: 2,
        },
        {
          id: 'cbt-2',
          name: 'Jefe Goblin (Refuerzo)',
          avatarUrl: 'https://example.com/goblin-boss.png',
          maxHp: 28,
          currentHp: 28,
          isMonster: true,
          showHpToPlayers: false,
          initiativeType: 'roll_d20',
          initiativeModifier: 1,
          isWaveReinforcement: true,
          triggerRound: 2,
        },
      ],
      turnTimerSeconds: 60,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renderiza la cabecera, lista de encuentros y detalles de dificultad', () => {
    const onClose = vi.fn();
    render(
      <SavedEncountersModal
        campaign={mockCampaign}
        encounters={sampleEncounters}
        isCombatActive={false}
        onLaunchEncounterLive={vi.fn()}
        onLoadEncounterToStaging={vi.fn()}
        onSaveEncounter={vi.fn()}
        onDeleteEncounter={vi.fn()}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Biblioteca de Encuentros de Combate')).toBeTruthy();
    expect(screen.getByText('Emboscada Goblin')).toBeTruthy();
    expect(screen.getByText('MEDIO')).toBeTruthy();
    expect(screen.getByText('1 iniciales')).toBeTruthy();
    expect(screen.getByText('+1 refuerzos')).toBeTruthy();
    expect(screen.getByText('100 XP, 15 PO')).toBeTruthy();
  });

  it('2. Abre el diálogo de resolución rápida de iniciativa y permite lanzar el combate en vivo', () => {
    const onLaunchLive = vi.fn();
    const onClose = vi.fn();

    render(
      <SavedEncountersModal
        campaign={mockCampaign}
        encounters={sampleEncounters}
        isCombatActive={false}
        onLaunchEncounterLive={onLaunchLive}
        onLoadEncounterToStaging={vi.fn()}
        onSaveEncounter={vi.fn()}
        onDeleteEncounter={vi.fn()}
        onClose={onClose}
      />
    );

    const launchBtn = screen.getByText('⚔️ Iniciar Ahora');
    fireEvent.click(launchBtn);

    // Dialog opens
    expect(screen.getByText('Orden de Iniciativa Calculado:')).toBeTruthy();
    expect(screen.getByText('Volver a Tirar d20')).toBeTruthy();

    // Re-roll initiatives
    const rerollBtn = screen.getByText('Volver a Tirar d20');
    fireEvent.click(rerollBtn);

    // Confirm launch
    const confirmBtn = screen.getByText('Desplegar Combate en Pantalla');
    fireEvent.click(confirmBtn);

    expect(onLaunchLive).toHaveBeenCalledWith(
      sampleEncounters[0],
      expect.arrayContaining([
        expect.objectContaining({ name: 'Goblin Arquero' }),
        expect.objectContaining({ name: 'Jefe Goblin (Refuerzo)' }),
      ])
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('3. Abre el editor para crear un nuevo encuentro, agrega combatiente de biblioteca y guarda', () => {
    const onSave = vi.fn();

    render(
      <SavedEncountersModal
        campaign={mockCampaign}
        encounters={sampleEncounters}
        isCombatActive={false}
        onLaunchEncounterLive={vi.fn()}
        onLoadEncounterToStaging={vi.fn()}
        onSaveEncounter={onSave}
        onDeleteEncounter={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const newBtn = screen.getByText('+ Nuevo Encuentro');
    fireEvent.click(newBtn);

    expect(screen.getByText('Nuevo Encuentro de Combate')).toBeTruthy();

    // Fill form
    const nameInput = screen.getByPlaceholderText('Ej. Emboscada de los No-Muertos');
    fireEvent.change(nameInput, { target: { value: 'Guarida de Arañas' } });

    // Quick add from library
    const charChip = screen.getByText('Guerrero Enano');
    fireEvent.click(charChip);

    // Save
    const submitBtn = screen.getByText('Crear Encuentro');
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Guarida de Arañas',
        campaignId: 'camp-1',
        combatants: expect.arrayContaining([
          expect.objectContaining({ name: 'Monstruo Hostil' }),
          expect.objectContaining({ name: 'Guerrero Enano' }),
        ]),
      })
    );
  });

  it('4. Solicita confirmación y ejecuta eliminación al pulsar el botón de papelera', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <SavedEncountersModal
        campaign={mockCampaign}
        encounters={sampleEncounters}
        isCombatActive={false}
        onLaunchEncounterLive={vi.fn()}
        onLoadEncounterToStaging={vi.fn()}
        onSaveEncounter={vi.fn()}
        onDeleteEncounter={onDelete}
        onClose={vi.fn()}
      />
    );

    const deleteBtn = screen.getByTitle('Eliminar Encuentro');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('enc-1');
  });

  it('5. Cierra el modal principal al pulsar el botón de cerrar', () => {
    const onClose = vi.fn();
    render(
      <SavedEncountersModal
        campaign={mockCampaign}
        encounters={sampleEncounters}
        isCombatActive={false}
        onLaunchEncounterLive={vi.fn()}
        onLoadEncounterToStaging={vi.fn()}
        onSaveEncounter={vi.fn()}
        onDeleteEncounter={vi.fn()}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: '' });
    // First button with class modal-close
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
