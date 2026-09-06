import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ScenePresetListColumnProps } from './scenePresetTypes';

export const ScenePresetListColumn: React.FC<ScenePresetListColumnProps> = ({
  searchQuery,
  setSearchQuery,
  filteredPresets,
  selectedPresetId,
  onSelectPreset,
}) => {
  return (
    <div className="preset-list-column">
      <div className="preset-form-group" style={{ marginBottom: 4 }}>
        <input
          type="text"
          className="preset-form-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar preset por nombre o tag..."
        />
      </div>

      {filteredPresets.length === 0 ? (
        <div className="session-library-empty">
          <Sparkles size={24} className="text-slate-600 mb-1" />
          <span>No hay presets guardados aún.</span>
          <span className="session-library-empty-hint">
            Guarda la escena actual con «Guardar como preset» para reutilizarla.
          </span>
        </div>
      ) : (
        filteredPresets.map((p) => (
          <div
            key={p.id}
            className={`preset-item-card ${selectedPresetId === p.id ? 'active' : ''}`}
            onClick={() => onSelectPreset(p)}
          >
            <div
              className="preset-item-thumb"
              style={{
                backgroundImage: p.backgroundUrl ? `url(${p.backgroundUrl})` : 'none',
              }}
            />
            <div className="preset-item-meta">
              <span className="preset-item-title">{p.name}</span>
              <span className="preset-item-sub">
                {p.characters?.length || 0} personajes • {p.lights?.length || 0} luces •{' '}
                {p.props?.length || 0} props
              </span>
              {p.tags && p.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                  {p.tags.slice(0, 2).map((t, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 9,
                        background: 'rgba(139,92,246,0.15)',
                        color: '#c4b5fd',
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
