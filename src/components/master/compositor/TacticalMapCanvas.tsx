import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Line, Stage, Text } from 'react-konva';
import type { CharacterOnScreen, TacticalGridConfig } from '../../../types';
import { tacticalDistanceInCells } from '../../../domain/display/tacticalDistance';

interface TacticalMapCanvasProps {
  characters: CharacterOnScreen[];
  grid: TacticalGridConfig;
  selectedCharacterId?: string;
  onSelectCharacter: (id: string) => void;
  onDragStart: () => void;
  onMoveCharacter: (id: string, normalizedX: number, normalizedY: number) => void;
}

interface CanvasSize { width: number; height: number; }

function useLoadedImage(source: string): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    if (!source) return;
    const next = new Image();
    next.onload = () => setImage(next);
    next.onerror = () => setImage(undefined);
    next.src = source;
    return () => { next.onload = null; next.onerror = null; };
  }, [source]);
  return image;
}

const TacticalToken: React.FC<{
  character: CharacterOnScreen;
  x: number;
  y: number;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
}> = ({ character, x, y, selected, draggable, onSelect, onDragStart, onDragEnd }) => {
  const image = useLoadedImage(character.avatarUrl);
  const radius = Math.max(18, Math.min(38, 25 * (character.scale ?? 1)));
  const teamColor = character.tacticalTeam === 'enemies' ? '#ef4444' : character.tacticalTeam === 'allies' ? '#22c55e' : '#fbbf24';

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onDragStart}
      onDragEnd={(event) => onDragEnd(event.target.x(), event.target.y())}
    >
      <Circle radius={radius + (selected ? 5 : 3)} fill="rgba(2, 6, 23, 0.88)" stroke={selected ? '#fef3c7' : teamColor} strokeWidth={selected ? 3 : 2} shadowColor="#000" shadowBlur={7} />
      {image ? <KonvaImage image={image} x={-radius} y={-radius} width={radius * 2} height={radius * 2} cornerRadius={radius} /> : <Circle radius={radius} fill={teamColor} />}
      <Text text={character.name} y={radius + 7} offsetX={radius} width={radius * 2} align="center" fontSize={11} fontStyle="bold" fill="#f8fafc" shadowColor="#020617" shadowBlur={3} />
    </Group>
  );
};

function gridLines(width: number, height: number, grid: TacticalGridConfig): React.ReactNode[] {
  const columns = Math.max(2, grid.columns);
  const rows = Math.max(2, Math.round(columns * 9 / 16));
  const color = 'rgba(167, 243, 208, 0.85)';
  if (grid.type === 'square') {
    return [
      ...Array.from({ length: columns + 1 }, (_, index) => <Line key={`v-${index}`} points={[index * width / columns, 0, index * width / columns, height]} stroke={color} strokeWidth={1} />),
      ...Array.from({ length: rows + 1 }, (_, index) => <Line key={`h-${index}`} points={[0, index * height / rows, width, index * height / rows]} stroke={color} strokeWidth={1} />),
    ];
  }
  const radius = width / columns / Math.sqrt(3);
  const verticalStep = radius * 1.5;
  const result: React.ReactNode[] = [];
  for (let row = -1; row < Math.ceil(height / verticalStep) + 1; row += 1) {
    for (let column = -1; column < columns + 1; column += 1) {
      const centerX = column * radius * Math.sqrt(3) + (row % 2 ? radius * Math.sqrt(3) / 2 : 0);
      const centerY = row * verticalStep;
      const points = Array.from({ length: 7 }, (_, index) => {
        const angle = Math.PI / 180 * (60 * index);
        return [centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)];
      }).flat();
      result.push(<Line key={`hex-${row}-${column}`} points={points} stroke={color} strokeWidth={1} />);
    }
  }
  return result;
}

export const TacticalMapCanvas: React.FC<TacticalMapCanvasProps> = ({
  characters, grid, selectedCharacterId, onSelectCharacter, onDragStart, onMoveCharacter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 960, height: 540 });
  useEffect(() => {
    const update = () => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (bounds?.width && bounds.height) setSize({ width: Math.round(bounds.width), height: Math.round(bounds.height) });
    };
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const lines = useMemo(() => gridLines(size.width, size.height, grid), [size, grid]);
  const stepX = 100 / Math.max(2, grid.columns);
  const stepY = 100 / Math.max(2, Math.round(grid.columns * 9 / 16));
  const snap = (value: number, step: number) => Math.max(0, Math.min(100, Math.round(value / step) * step));
  const selected = characters.find((character) => character.id === selectedCharacterId);
  const nearestOpponent = selected && characters
    .filter((character) => character.id !== selected.id && character.tacticalTeam && character.tacticalTeam !== selected.tacticalTeam)
    .map((character) => ({ character, distance: tacticalDistanceInCells(selected, character, grid.columns) }))
    .sort((a, b) => a.distance - b.distance)[0];

  return (
    <div ref={containerRef} className="absolute inset-0 z-20" aria-label="Lienzo táctico con tokens">
      <Stage width={size.width} height={size.height}>
        <Layer listening={false} opacity={grid.opacity}>{lines}</Layer>
        <Layer>
          {characters.map((character) => {
            const x = ((character.normalizedX ?? 50) / 100) * size.width;
            const y = size.height - ((character.normalizedY ?? 0) / 100) * size.height;
            return <TacticalToken
              key={character.id}
              character={character}
              x={x}
              y={y}
              selected={selectedCharacterId === character.id}
              draggable={!character.isLocked}
              onSelect={() => onSelectCharacter(character.id)}
              onDragStart={onDragStart}
              onDragEnd={(nextX, nextY) => onMoveCharacter(character.id, snap(nextX / size.width * 100, stepX), snap((size.height - nextY) / size.height * 100, stepY))}
            />;
          })}
          {nearestOpponent && <Text text={`${nearestOpponent.distance.toFixed(1)} celdas a ${nearestOpponent.character.name}`} x={12} y={12} padding={7} fontSize={12} fill="#ecfdf5" fillAfterStrokeEnabled={false} shadowColor="#020617" shadowBlur={5} />}
        </Layer>
      </Stage>
    </div>
  );
};
