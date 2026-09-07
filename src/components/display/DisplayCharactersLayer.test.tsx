import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisplayCharactersLayer } from './DisplayCharactersLayer';
import type { CharacterOnScreen, TacticalGridConfig, CombatState } from '../../types';

const baseChar: CharacterOnScreen = {
  id: 'c-1',
  name: 'Valeros',
  avatarUrl: 'https://example.com/valeros.png',
  position: 'center-left',
  normalizedX: 40,
  normalizedY: 15,
  scale: 1.0,
  isSpeaking: false,
  tacticalTeam: 'allies',
};

const mockTacticalGrid: TacticalGridConfig = {
  enabled: true,
  type: 'square',
  columns: 10,
  opacity: 0.5,
};

describe('DisplayCharactersLayer - Dual Token and Standee Rendering', () => {
  it('1. Renderiza figura como Standee por defecto cuando no hay cuadrícula táctica', () => {
    const { container } = render(
      <DisplayCharactersLayer characters={[baseChar]} />
    );

    // Standee card is rendered
    expect(container.querySelector('.standee-proportional-frame')).toBeTruthy();
    expect(container.querySelector('.tactical-display-token')).toBeFalsy();
  });

  it('2. Renderiza como Token táctico circular cuando la cuadrícula táctica está activa', () => {
    const { container } = render(
      <DisplayCharactersLayer
        characters={[baseChar]}
        tacticalGrid={mockTacticalGrid}
      />
    );

    // Tactical token disc is rendered
    expect(container.querySelector('.tactical-display-token')).toBeTruthy();
    expect(container.querySelector('.tactical-token-disc')).toBeTruthy();
    expect(container.querySelector('.standee-proportional-frame')).toBeFalsy();
    expect(screen.getByText('Valeros')).toBeTruthy();
  });

  it('3. Muestra barra de HP compacta sobre el token cuando el personaje está en combate', () => {
    const combatState: CombatState = {
      isActive: true,
      currentTurnIndex: 0,
      round: 1,
      combatants: [
        {
          id: 'comb-1',
          characterId: 'c-1',
          name: 'Valeros',
          initiative: 18,
          currentHp: 24,
          maxHp: 30,
          avatarUrl: 'https://example.com/valeros.png',
          showHpToPlayers: true,
          conditions: [],
          isMonster: false,
        },
      ],
    };

    const { container } = render(
      <DisplayCharactersLayer
        characters={[baseChar]}
        tacticalGrid={mockTacticalGrid}
        combatState={combatState}
      />
    );

    expect(container.querySelector('.tactical-token-hp-container')).toBeTruthy();
    expect(container.querySelector('.tactical-token-hp-fill')).toBeTruthy();
  });

  it('4. Respeta override individual: standee forzado se muestra como standee en modo táctico', () => {
    const standeeOverride: CharacterOnScreen = {
      ...baseChar,
      displayStyle: 'standee',
    };

    const { container } = render(
      <DisplayCharactersLayer
        characters={[standeeOverride]}
        tacticalGrid={mockTacticalGrid}
      />
    );

    expect(container.querySelector('.standee-proportional-frame')).toBeTruthy();
    expect(container.querySelector('.tactical-display-token')).toBeFalsy();
  });

  it('5. Respeta override individual: token forzado se muestra como token aun sin cuadrícula', () => {
    const tokenOverride: CharacterOnScreen = {
      ...baseChar,
      displayStyle: 'token',
    };

    const { container } = render(
      <DisplayCharactersLayer
        characters={[tokenOverride]}
        tacticalGrid={{ ...mockTacticalGrid, enabled: false }}
      />
    );

    expect(container.querySelector('.tactical-display-token')).toBeTruthy();
    expect(container.querySelector('.standee-proportional-frame')).toBeFalsy();
  });
});
