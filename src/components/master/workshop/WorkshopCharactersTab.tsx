import React from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { Character } from '../../../types';

export interface WorkshopCharactersTabProps {
  characters: Character[];
  onAddCharacter: () => void;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter: (charId: string, charName: string) => void;
}

export const WorkshopCharactersTab: React.FC<WorkshopCharactersTabProps> = ({
  characters,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Personajes & NPCs</h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3af' }}>
            Fichas listas para invocar en cualquier escena
          </span>
        </div>

        <button
          type="button"
          onClick={onAddCharacter}
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
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>Nuevo Personaje</span>
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {characters.map((ch) => (
          <div
            key={ch.id}
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <img
              src={ch.defaultAvatarUrl}
              alt={ch.name}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(245, 158, 11, 0.4)',
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ch.name}
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{ch.roleOrTitle}</span>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => onEditCharacter(ch)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                }}
                title="Editar"
              >
                <Edit size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteCharacter(ch.id, ch.name)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: 'none',
                  color: '#f87171',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                }}
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
