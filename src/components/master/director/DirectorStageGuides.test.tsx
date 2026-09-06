import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DirectorStageGuides } from './DirectorStageGuides';
import type { StageWaypoint } from '../../../types';

describe('DirectorStageGuides Suite', () => {
  const mockWaypoints: StageWaypoint[] = [
    {
      id: 'wp-1',
      name: 'Entrada Principal',
      normalizedX: 25,
      normalizedY: 0,
    },
    {
      id: 'wp-2',
      name: 'Balcón',
      normalizedX: 75,
      normalizedY: 30,
    },
  ];

  it('1. Renderiza los waypoints narrativos y responde a clics cuando showWaypoints es true', () => {
    const onWaypointClick = vi.fn();
    render(
      <DirectorStageGuides
        showWaypoints={true}
        showGuides={false}
        waypoints={mockWaypoints}
        groundLineY={10}
        onWaypointClick={onWaypointClick}
      />
    );

    expect(screen.getByText('Entrada Principal')).toBeDefined();
    expect(screen.getByText('Balcón')).toBeDefined();

    const wp1 = screen.getByTestId('director-waypoint-wp-1');
    fireEvent.click(wp1);
    expect(onWaypointClick).toHaveBeenCalledWith(mockWaypoints[0]);
  });

  it('2. Muestra las líneas de guía visual de suelo y margen seguro cuando showGuides es true', () => {
    render(
      <DirectorStageGuides
        showWaypoints={false}
        showGuides={true}
        waypoints={[]}
        groundLineY={15}
        onWaypointClick={vi.fn()}
      />
    );

    expect(screen.getByText('Línea de suelo (Y = 15%)')).toBeDefined();
    expect(screen.getByText('Margen seguro: Diálogos y Nombres')).toBeDefined();
  });

  it('3. Renderiza guías dinámicas magnéticas de snap en los ejes X e Y', () => {
    render(
      <DirectorStageGuides
        showWaypoints={false}
        showGuides={false}
        waypoints={[]}
        snapGuideLines={[
          { axis: 'x', position: 50, label: 'Centro X' },
          { axis: 'y', position: 20, label: 'Alineado Y' },
        ]}
        onWaypointClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('snap-guide-x-50')).toBeDefined();
    expect(screen.getByText('Centro X')).toBeDefined();
    expect(screen.getByTestId('snap-guide-y-20')).toBeDefined();
    expect(screen.getByText('Alineado Y')).toBeDefined();
  });
});
