import React from 'react';
import { Users, Eye, EyeOff, UserPlus, ChevronRight } from 'lucide-react';
import type { Character, CharacterOnScreen } from '../../../types';

export interface ModularCharactersCardProps {
  characters: CharacterOnScreen[];
  campaignCharacters?: Character[];
  selectedCharId: string | null;
  onSelectCharacter: (id: string) => void;
  onToggleCharacterVisibility: (id: string, currentlyHidden: boolean) => void;
  onOpenCharacterLibrary?: () => void;
}

export const ModularCharactersCard: React.FC<ModularCharactersCardProps> = ({
  characters,
  campaignCharacters = [],
  selectedCharId,
  onSelectCharacter,
  onToggleCharacterVisibility,
  onOpenCharacterLibrary,
}) => {
  const getCharacterSubtitle = (char: CharacterOnScreen): string => {
    const meta = campaignCharacters.find((c) => c.id === char.characterId || c.name === char.name);
    if (meta?.roleOrTitle) return meta.roleOrTitle;
    return char.isHidden ? 'Oculto' : 'En mesa';
  };

  return (
    <section className="modular-card" aria-label="Personajes en mesa">
      <div className="modular-card-header">
        <div className="modular-card-title-group">
          <Users size={18} className="modular-card-icon" />
          <span>Personajes en mesa</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
            ({characters.length})
          </span>
        </div>
        {onOpenCharacterLibrary && (
          <button
            type="button"
            className="modular-card-arrow"
            onClick={onOpenCharacterLibrary}
            aria-label="Abrir biblioteca de personajes"
            title="Invocar o gestionar personajes"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="modular-chars-carousel">
        {characters.length === 0 ? (
          <div
            style={{
              padding: '12px',
              fontSize: '0.82rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>No hay personajes en escena.</span>
            {onOpenCharacterLibrary && (
              <button
                type="button"
                className="modular-btn-action"
                style={{ height: '30px', padding: '0 10px' }}
                onClick={onOpenCharacterLibrary}
              >
                <UserPlus size={13} />
                <span>Invocar</span>
              </button>
            )}
          </div>
        ) : (
          characters.map((char) => {
            const isSelected = char.id === selectedCharId;
            const isVisible = !char.isHidden;
            const subtitle = getCharacterSubtitle(char);

            return (
              <div
                key={char.id}
                data-testid={`modular-char-chip-${char.id}`}
                className={`modular-char-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectCharacter(char.id)}
                title={`Tocar para editar a ${char.name}`}
              >
                <img
                  src={char.avatarUrl}
                  alt=""
                  className="modular-char-avatar"
                />
                <div className="modular-char-info">
                  <span className="modular-char-name">{char.name}</span>
                  <span className="modular-char-role">{subtitle}</span>
                </div>
                <button
                  type="button"
                  className={`modular-char-eye-btn ${isVisible ? 'visible' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCharacterVisibility(char.id, !!char.isHidden);
                  }}
                  title={isVisible ? 'Ocultar de la mesa' : 'Mostrar en la mesa'}
                  aria-label={isVisible ? `Ocultar ${char.name}` : `Mostrar ${char.name}`}
                >
                  {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            );
          })
        )}

        {characters.length > 0 && onOpenCharacterLibrary && (
          <button
            type="button"
            className="modular-char-chip"
            style={{
              justifyContent: 'center',
              minWidth: '100px',
              maxWidth: '120px',
              borderStyle: 'dashed',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
            onClick={onOpenCharacterLibrary}
            title="Invocar más personajes"
          >
            <UserPlus size={16} style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
              Invocar
            </span>
          </button>
        )}
      </div>
    </section>
  );
};
