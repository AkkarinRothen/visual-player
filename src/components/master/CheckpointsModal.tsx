import React, { useState } from 'react';
import type { SessionCheckpoint } from '../../types';
import { Bookmark, Plus, Trash2, RotateCcw, X, Clock, Eye } from 'lucide-react';

interface CheckpointsModalProps {
  checkpoints: SessionCheckpoint[];
  onSaveManualCheckpoint: (name: string) => void;
  onRestoreCheckpoint: (checkpoint: SessionCheckpoint) => void;
  onDeleteCheckpoint: (id: string) => void;
  onClose: () => void;
}

export const CheckpointsModal: React.FC<CheckpointsModalProps> = ({
  checkpoints,
  onSaveManualCheckpoint,
  onRestoreCheckpoint,
  onDeleteCheckpoint,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'manual' | 'auto'>('all');
  const [newCheckpointName, setNewCheckpointName] = useState<string>('');
  const [previewingCheckpoint, setPreviewingCheckpoint] = useState<SessionCheckpoint | null>(null);

  const filtered = checkpoints.filter((cp) => {
    if (activeTab === 'manual') return cp.type === 'manual';
    if (activeTab === 'auto') return cp.type === 'auto';
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointName.trim()) return;
    onSaveManualCheckpoint(newCheckpointName.trim());
    setNewCheckpointName('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content checkpoints-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex-align-gap">
            <Bookmark size={20} className="text-amber-400" />
            <h2>Puntos de Restauración (Checkpoints)</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Save New Checkpoint Bar */}
        <form onSubmit={handleCreate} className="checkpoint-create-bar">
          <input
            type="text"
            placeholder="Nombre del punto (Ej. Antes de abrir el sarcófago)..."
            value={newCheckpointName}
            onChange={(e) => setNewCheckpointName(e.target.value)}
            className="master-input"
          />
          <button type="submit" className="btn-primary-sm">
            <Plus size={14} />
            <span>Guardar</span>
          </button>
        </form>

        {/* Filter Tabs */}
        <div className="checkpoint-filter-tabs">
          <button
            className={`filter-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Todos ({checkpoints.length})
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            📌 Manuales ({checkpoints.filter((c) => c.type === 'manual').length})
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'auto' ? 'active' : ''}`}
            onClick={() => setActiveTab('auto')}
          >
            🤖 Automáticos ({checkpoints.filter((c) => c.type === 'auto').length})
          </button>
        </div>

        {/* Checkpoints List */}
        {filtered.length === 0 ? (
          <div className="empty-history-box">
            <Bookmark size={36} className="text-slate-600 mb-2" />
            <p>No hay checkpoints en esta categoría.</p>
          </div>
        ) : (
          <div className="checkpoints-grid">
            {filtered.map((cp) => {
              const timeStr = new Date(cp.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={cp.id} className={`checkpoint-card ${cp.type}`}>
                  <div
                    className="checkpoint-thumb"
                    style={{ backgroundImage: `url(${cp.state.backgroundUrl})` }}
                  >
                    <span className={`cp-type-badge ${cp.type}`}>
                      {cp.type === 'manual' ? 'MANUAL' : 'AUTO'}
                    </span>
                  </div>

                  <div className="checkpoint-meta">
                    <strong className="cp-title">{cp.name}</strong>
                    <div className="cp-details-row">
                      <span className="cp-scene-name">{cp.state.sceneName}</span>
                      <span className="cp-time">
                        <Clock size={12} /> {timeStr}
                      </span>
                    </div>
                    <span className="cp-trigger-desc">
                      {cp.state.characters.length} NPCs • Clima: {cp.state.weather} • Luz: {cp.state.lighting}
                    </span>
                  </div>

                  <div className="checkpoint-actions">
                    <button
                      className="icon-action-btn"
                      onClick={() => setPreviewingCheckpoint(cp)}
                      title="Previsualizar estado"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="btn-secondary-sm restore-cp-btn"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Restaurar la partida al checkpoint "${cp.name}"? (Se creará un punto de guardado de seguridad del estado actual)`
                          )
                        ) {
                          onRestoreCheckpoint(cp);
                          onClose();
                        }
                      }}
                      title="Restaurar a la pantalla"
                    >
                      <RotateCcw size={14} />
                      <span>Restaurar</span>
                    </button>
                    <button
                      className="icon-action-btn danger"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el checkpoint "${cp.name}"?`)) {
                          onDeleteCheckpoint(cp.id);
                        }
                      }}
                      title="Eliminar Checkpoint"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Checkpoint Preview Confirmation Modal */}
        {previewingCheckpoint && (
          <div className="modal-overlay preview-submodal-overlay" onClick={() => setPreviewingCheckpoint(null)}>
            <div className="modal-content preview-submodal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Previsualización: {previewingCheckpoint.name}</h2>
                <button className="modal-close" onClick={() => setPreviewingCheckpoint(null)}>
                  <X size={20} />
                </button>
              </div>

              <div
                className="checkpoint-preview-stage"
                style={{ backgroundImage: `url(${previewingCheckpoint.state.backgroundUrl})` }}
              >
                <div className="preview-stage-characters">
                  {previewingCheckpoint.state.characters.map((ch) => (
                    <div key={ch.id} className="preview-stage-char">
                      <img src={ch.avatarUrl} alt={ch.name} className="char-avatar" />
                      <span>{ch.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="preview-meta-details">
                <p>
                  <strong>Escenario:</strong> {previewingCheckpoint.state.sceneName}
                </p>
                <p>
                  <strong>Clima / Iluminación:</strong> {previewingCheckpoint.state.weather} /{' '}
                  {previewingCheckpoint.state.lighting}
                </p>
                <p>
                  <strong>Combatientes en turno:</strong>{' '}
                  {previewingCheckpoint.state.combatState?.combatants?.length || 0}
                </p>
              </div>

              <div className="preview-modal-footer">
                <button
                  className="btn-primary full"
                  onClick={() => {
                    onRestoreCheckpoint(previewingCheckpoint);
                    setPreviewingCheckpoint(null);
                    onClose();
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Restaurar este Checkpoint Ahora</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
