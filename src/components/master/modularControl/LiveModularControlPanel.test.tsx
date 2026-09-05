import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LiveModularControlPanel } from './LiveModularControlPanel';
import type { Campaign, DisplayState, CharacterOnScreen } from '../../../types';

const mockCharacter: CharacterOnScreen = {
  id: 'char-bromir',
  name: 'Bromir',
  avatarUrl: 'https://example.com/bromir.png',
  position: 'center-left',
  normalizedX: 50,
  normalizedY: 20,
  scale: 1.0,
  zIndex: 2,
  isHidden: false,
  isSpeaking: false,
};

const mockHiddenChar: CharacterOnScreen = {
  id: 'char-elara',
  name: 'Elara',
  avatarUrl: 'https://example.com/elara.png',
  position: 'left',
  normalizedX: 25,
  normalizedY: 20,
  scale: 0.9,
  zIndex: 1,
  isHidden: true,
  isSpeaking: false,
};

const mockLiveState: DisplayState = {
  currentSceneId: 'scene-tavern',
  sceneName: 'Taberna del Jabalí',
  backgroundUrl: 'https://example.com/tavern.jpg',
  characters: [mockCharacter, mockHiddenChar],
  weather: 'rain',
  weatherIntensity: 0.65,
  lighting: 'night',
  locationBanner: { text: '', visible: false },
  isBlackout: false,
  shakeTrigger: 0,
  lightningTrigger: 0,
  ambientAudioUrl: 'https://example.com/tavern-ambience.mp3',
  ambientPlaying: true,
  ambientVolume: 0.6,
  lastSfx: null,
  combatState: {
    isActive: false,
    round: 1,
    currentTurnIndex: 0,
    combatants: [],
  },
};

const mockCampaign: Campaign = {
  id: 'camp-1',
  title: 'Crónicas de Valoria',
  createdAt: 1700000000000,
  scenes: [
    {
      id: 'scene-tavern',
      name: 'Taberna del Jabalí',
      backgroundUrl: 'https://example.com/tavern.jpg',
      lighting: 'night',
    },
  ],
  characters: [
    {
      id: 'char-bromir',
      name: 'Bromir',
      roleOrTitle: 'Enano — Guerrero',
      defaultAvatarUrl: 'https://example.com/bromir.png',
    },
    {
      id: 'char-elara',
      name: 'Elara',
      roleOrTitle: 'Elfa — Pícara',
      defaultAvatarUrl: 'https://example.com/elara.png',
    },
  ],
  encounters: [],
  favorites: [],
};

describe('LiveModularControlPanel (Propuesta 4 + Propuesta 1)', () => {
  it('1. Renderiza el escenario 16:9 y los 4 módulos de control cuando no hay figura seleccionada', () => {
    render(
      <LiveModularControlPanel
        campaign={mockCampaign}
        liveState={mockLiveState}
        isConnected={true}
      />
    );

    // 16:9 stage section
    expect(screen.getByLabelText('Escenario en vivo 16:9')).toBeDefined();
    expect(screen.getByText('Mesa conectada')).toBeDefined();

    // 4 Modular cards
    expect(screen.getByLabelText('Escena actual')).toBeDefined();
    expect(screen.getByText('Taberna del Jabalí')).toBeDefined();

    expect(screen.getByLabelText('Personajes en mesa')).toBeDefined();
    expect(screen.getByTestId('modular-char-chip-char-bromir')).toBeDefined();
    expect(screen.getByTestId('modular-char-chip-char-elara')).toBeDefined();

    expect(screen.getByLabelText('Ambiente y clima')).toBeDefined();
    expect(screen.getByText('Lluvia')).toBeDefined();
    expect(screen.getByText('65%')).toBeDefined();

    expect(screen.getByLabelText('Control de Audio')).toBeDefined();
    expect(screen.getByText('60%')).toBeDefined();

    // Instant status badge
    expect(screen.getByText(/Todos los cambios se aplican/i)).toBeDefined();
  });

  it('2. Seleccionar un personaje en el carrusel transiciona fluidamente al inspector (Propuesta 1)', () => {
    render(
      <LiveModularControlPanel
        campaign={mockCampaign}
        liveState={mockLiveState}
      />
    );

    // Tap on Bromir's chip
    fireEvent.click(screen.getByTestId('modular-char-chip-char-bromir'));

    // Inspector should now be visible
    expect(screen.getByLabelText('Inspector de Bromir')).toBeDefined();
    expect(screen.getByText('Enano — Guerrero')).toBeDefined();
    expect(screen.getByText('Visible en mesa')).toBeDefined();
    expect(screen.getByText('Tamaño')).toBeDefined();
    expect(screen.getByText('Capa 2')).toBeDefined();
    expect(screen.getByText('Espejo')).toBeDefined();

    // Modular cards should be replaced
    expect(screen.queryByLabelText('Escena actual')).toBeNull();
  });

  it('3. El botón de cerrar o volver en el inspector regresa al panel modular', () => {
    render(
      <LiveModularControlPanel
        campaign={mockCampaign}
        liveState={mockLiveState}
      />
    );

    // Open Bromir
    fireEvent.click(screen.getByTestId('modular-char-chip-char-bromir'));
    expect(screen.getByLabelText('Inspector de Bromir')).toBeDefined();

    // Click back to modular controls
    fireEvent.click(screen.getByText('Volver al panel modular'));

    // Modular cards are back
    expect(screen.getByLabelText('Escena actual')).toBeDefined();
    expect(screen.queryByLabelText('Inspector de Bromir')).toBeNull();
  });

  it('4. Permite cambiar tamaño, capa, espejo y visibilidad instantáneamente sin publicación intermedia', () => {
    const onUpdateCharacter = vi.fn();

    render(
      <LiveModularControlPanel
        campaign={mockCampaign}
        liveState={mockLiveState}
        onUpdateCharacter={onUpdateCharacter}
      />
    );

    // Open Bromir
    fireEvent.click(screen.getByTestId('modular-char-chip-char-bromir'));

    // Increase size (+)
    const plusBtn = screen.getByLabelText('Aumentar tamaño');
    fireEvent.click(plusBtn);
    expect(onUpdateCharacter).toHaveBeenCalledWith(
      'char-bromir',
      { scale: 1.1 },
      expect.stringContaining('Escala de Bromir')
    );

    // Send layer down
    const downLayerBtn = screen.getByLabelText('Enviar capa atrás');
    fireEvent.click(downLayerBtn);
    expect(onUpdateCharacter).toHaveBeenCalledWith(
      'char-bromir',
      { zIndex: 1 },
      expect.stringContaining('Capa de Bromir: 1')
    );

    // Toggle mirror
    const mirrorBtn = screen.getByText('Espejo');
    fireEvent.click(mirrorBtn);
    expect(onUpdateCharacter).toHaveBeenCalledWith(
      'char-bromir',
      { isFlipped: true },
      expect.stringContaining('Reflejo de Bromir')
    );
  });

  it('5. Tocar la hitbox de una figura en el visor 16:9 la selecciona', () => {
    render(
      <LiveModularControlPanel
        campaign={mockCampaign}
        liveState={mockLiveState}
      />
    );

    const bromirHitbox = screen.getByTestId('stage-char-hitbox-char-bromir');
    fireEvent.pointerDown(bromirHitbox, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(bromirHitbox, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(screen.getByLabelText('Inspector de Bromir')).toBeDefined();
  });

  it('6. El botón Hablar... en el inspector invoca el callback para abrir el diálogo rápido', () => {
    const onOpenQuickDialogue = vi.fn();

    render(
      <LiveModularControlPanel
        campaign={mockCampaign}
        liveState={mockLiveState}
        onOpenQuickDialogue={onOpenQuickDialogue}
      />
    );

    fireEvent.click(screen.getByTestId('modular-char-chip-char-bromir'));
    fireEvent.click(screen.getByText('Hablar…'));

    expect(onOpenQuickDialogue).toHaveBeenCalledWith('char-bromir');
  });

  it('7. Modificar clima y volumen dispara actualizaciones instantáneas', () => {
    const onUpdateDisplayField = vi.fn();

    render(
      <LiveModularControlPanel
        campaign={mockCampaign}
        liveState={mockLiveState}
        onUpdateDisplayField={onUpdateDisplayField}
      />
    );

    // Atmosphere intensity slider
    const intensitySlider = screen.getByLabelText('Intensidad del clima');
    fireEvent.change(intensitySlider, { target: { value: '80' } });
    expect(onUpdateDisplayField).toHaveBeenCalledWith(
      'weatherIntensity',
      0.8,
      expect.any(String)
    );

    // Lighting palette: click "Místico"
    const mysticBtn = screen.getByLabelText('Místico');
    fireEvent.click(mysticBtn);
    expect(onUpdateDisplayField).toHaveBeenCalledWith(
      'lighting',
      'mystic_violet',
      expect.any(String)
    );
  });
});
