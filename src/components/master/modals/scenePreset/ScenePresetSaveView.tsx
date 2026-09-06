import React from 'react';
import { Users, Layers, Lightbulb, Flame, Volume2, FileText } from 'lucide-react';
import type { ScenePresetSaveViewProps } from './scenePresetTypes';

export const ScenePresetSaveView: React.FC<ScenePresetSaveViewProps> = ({
  stagedState,
  presetName,
  setPresetName,
  description,
  setDescription,
  tagsInput,
  setTagsInput,
  selectedConvId,
  setSelectedConvId,
  allAvailableConversations,
}) => {
  return (
    <>
      {/* Preview Card */}
      <div className="preset-preview-card">
        <div
          className="preset-thumbnail-box"
          style={{
            backgroundImage: stagedState.backgroundUrl
              ? `url(${stagedState.backgroundUrl})`
              : 'none',
          }}
        >
          <span className="preset-thumbnail-label">
            {stagedState.sceneName || 'Borrador sin nombre'}
          </span>
        </div>
        <div className="preset-stats-grid">
          <div className="preset-stat-chip">
            <Users size={13} className="text-amber-400" />
            <span>{stagedState.characters.length} Personajes</span>
          </div>
          <div className="preset-stat-chip">
            <Layers size={13} className="text-indigo-400" />
            <span>{stagedState.props?.length || 0} Props</span>
          </div>
          <div className="preset-stat-chip">
            <Lightbulb size={13} className="text-yellow-400" />
            <span>{stagedState.lights?.length || 0} Luces</span>
          </div>
          <div className="preset-stat-chip">
            <Flame size={13} className="text-rose-400" />
            <span>{stagedState.emitters?.length || 0} Emisores</span>
          </div>
          <div className="preset-stat-chip">
            <Volume2 size={13} className="text-emerald-400" />
            <span>{stagedState.ambientAudioUrl ? 'Audio Activo' : 'Sin Audio'}</span>
          </div>
          <div className="preset-stat-chip">
            <FileText size={13} className="text-blue-400" />
            <span>{selectedConvId ? 'Diálogo Vinculado' : 'Sin Diálogo'}</span>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="preset-form-group">
        <label className="preset-form-label">Nombre del Preset</label>
        <input
          type="text"
          className="preset-form-input"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="Ej: Taberna Bulliciosa con Bardo"
        />
      </div>

      <div className="preset-form-group">
        <label className="preset-form-label">Descripción (Opcional)</label>
        <textarea
          className="preset-form-textarea"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Taberna interior con chimenea, música alegre, bardo en el escenario y conversación sobre rumores..."
        />
      </div>

      <div className="preset-form-group">
        <label className="preset-form-label">Etiquetas (Separadas por comas)</label>
        <input
          type="text"
          className="preset-form-input"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="taberna, social, interior, musica"
        />
      </div>

      {allAvailableConversations.length > 0 && (
        <div className="preset-form-group">
          <label className="preset-form-label">Vincular Conversación / Diálogo (Opcional)</label>
          <select
            className="preset-form-select"
            value={selectedConvId}
            onChange={(e) => setSelectedConvId(e.target.value)}
          >
            <option value="">-- Ninguna conversación vinculada --</option>
            {allAvailableConversations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.lines.length} líneas)
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};
