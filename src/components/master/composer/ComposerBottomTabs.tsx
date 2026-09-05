import React from 'react';
import {
  ImageIcon,
  Plus,
  ChevronUp,
  ChevronDown,
  Users,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Campaign, Character, CharacterOnScreen, LightingFilter, WeatherType } from '../../../types';
import type { ComposerBottomTab } from './composerTypes';

interface ComposerBottomTabsProps {
  activeBottomTab: ComposerBottomTab;
  setActiveBottomTab: (tab: ComposerBottomTab) => void;
  backgroundUrl: string;
  locationBanner: string;
  setLocationBanner: (val: string) => void;
  campaign: Campaign;
  characters: CharacterOnScreen[];
  selectedCharId: string | null;
  setSelectedCharId: (id: string | null) => void;
  lighting: LightingFilter;
  setLighting: (val: LightingFilter) => void;
  weather: WeatherType;
  setWeather: (val: WeatherType) => void;
  onOpenBackgroundPicker: () => void;
  onOpenQuickCharModal: () => void;
  onAddCharacterToCanvas: (ch: Character) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
}

export const ComposerBottomTabs: React.FC<ComposerBottomTabsProps> = ({
  activeBottomTab,
  setActiveBottomTab,
  backgroundUrl,
  locationBanner,
  setLocationBanner,
  campaign,
  characters,
  selectedCharId,
  setSelectedCharId,
  lighting,
  setLighting,
  weather,
  setWeather,
  onOpenBackgroundPicker,
  onOpenQuickCharModal,
  onAddCharacterToCanvas,
  onMoveLayer,
}) => {
  return (
    <>
      {/* Contenido contextual de la pestaña activa */}
      <div style={{ flex: 1, padding: '10px 14px', overflowY: 'auto' }}>
        {/* TAB 1: FONDO */}
        {activeBottomTab === 'background' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '90px',
                height: '50px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {backgroundUrl ? (
                <img src={backgroundUrl} alt="Fondo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                  <ImageIcon size={20} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenBackgroundPicker}
              style={{
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <ImageIcon size={16} />
              <span>{backgroundUrl ? 'Cambiar Fondo (Fotos / Galería)' : 'Elegir Fondo'}</span>
            </button>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <input
                type="text"
                value={locationBanner}
                onChange={(e) => setLocationBanner(e.target.value)}
                placeholder="Título en Pantalla (ej: Taberna del Dragón)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAJES */}
        {activeBottomTab === 'characters' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              type="button"
              onClick={onOpenQuickCharModal}
              style={{
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)',
              }}
              title="Crear un nuevo personaje e insertarlo directamente"
            >
              <Plus size={16} />
              <span>Nuevo</span>
            </button>

            <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              Toca para añadir:
            </span>

            {campaign.characters.map((ch) => {
              const isOnScreen = characters.some((c) => c.characterId === ch.id);

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onAddCharacterToCanvas(ch)}
                  style={{
                    background: isOnScreen ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.06)',
                    border: isOnScreen ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={ch.defaultAvatarUrl}
                    alt={ch.name}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>{ch.name}</span>
                  {isOnScreen && <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 3: CAPAS */}
        {activeBottomTab === 'layers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {characters.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No hay personajes en la escena todavía.</span>
            ) : (
              characters.map((char) => (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    background: char.id === selectedCharId ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: char.id === selectedCharId ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={char.avatarUrl}
                      alt={char.name}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#fff' }}>{char.name}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(char.id, 'up');
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                      title="Subir capa"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(char.id, 'down');
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                      title="Bajar capa"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: FX Y AMBIENTE */}
        {activeBottomTab === 'fx' && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
                Iluminación
              </label>
              <select
                value={lighting}
                onChange={(e) => setLighting(e.target.value as LightingFilter)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              >
                <option value="normal">Normal</option>
                <option value="night">Noche</option>
                <option value="sunset">Atardecer</option>
                <option value="blood_moon">Luna de Sangre</option>
                <option value="torch_flicker">Antorcha</option>
                <option value="mystic_violet">Místico Violeta</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
                Clima
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value as WeatherType)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              >
                <option value="none">Despejado</option>
                <option value="rain">Lluvia</option>
                <option value="storm">Tormenta</option>
                <option value="snow">Nieve</option>
                <option value="fog">Niebla</option>
                <option value="embers">Brasas</option>
                <option value="fireflies">Luciérnagas</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Barra de pestañas táctil estable */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveBottomTab('background')}
          style={{
            flex: 1,
            padding: '12px 6px',
            border: 'none',
            background: activeBottomTab === 'background' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeBottomTab === 'background' ? '#fbbf24' : '#94a3b8',
            borderTop: activeBottomTab === 'background' ? '2px solid #fbbf24' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <ImageIcon size={16} />
          <span>Fondo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBottomTab('characters')}
          style={{
            flex: 1,
            padding: '12px 6px',
            border: 'none',
            background: activeBottomTab === 'characters' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeBottomTab === 'characters' ? '#fbbf24' : '#94a3b8',
            borderTop: activeBottomTab === 'characters' ? '2px solid #fbbf24' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Users size={16} />
          <span>Personajes ({characters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBottomTab('layers')}
          style={{
            flex: 1,
            padding: '12px 6px',
            border: 'none',
            background: activeBottomTab === 'layers' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeBottomTab === 'layers' ? '#fbbf24' : '#94a3b8',
            borderTop: activeBottomTab === 'layers' ? '2px solid #fbbf24' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Layers size={16} />
          <span>Capas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBottomTab('fx')}
          style={{
            flex: 1,
            padding: '12px 6px',
            border: 'none',
            background: activeBottomTab === 'fx' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeBottomTab === 'fx' ? '#fbbf24' : '#94a3b8',
            borderTop: activeBottomTab === 'fx' ? '2px solid #fbbf24' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={16} />
          <span>Ambiente</span>
        </button>
      </div>
    </>
  );
};
