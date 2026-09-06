import React from 'react';
import { X, Plus, Skull, Trash2 } from 'lucide-react';
import type { EncounterEditorModalProps } from './savedEncountersTypes';

export const EncounterEditorModal: React.FC<EncounterEditorModalProps> = ({
  isEditing,
  campaign,
  encName,
  setEncName,
  encDesc,
  setEncDesc,
  encDifficulty,
  setEncDifficulty,
  encRewards,
  setEncRewards,
  encNotes,
  setEncNotes,
  encCombatants,
  onAddGenericMonster,
  onAddCombatantFromLibrary,
  onUpdateCombatant,
  onRemoveCombatant,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="modal-overlay editor-submodal-overlay" onClick={onClose}>
      <div className="modal-content encounter-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Editar Encuentro' : 'Nuevo Encuentro de Combate'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="modal-form">
          <div className="form-grid-2">
            <div>
              <label>Nombre del Encuentro</label>
              <input
                type="text"
                required
                placeholder="Ej. Emboscada de los No-Muertos"
                value={encName}
                onChange={(e) => setEncName(e.target.value)}
                className="master-input"
              />
            </div>
            <div>
              <label>Dificultad Estimada</label>
              <select
                value={encDifficulty}
                onChange={(e) => setEncDifficulty(e.target.value as 'facil' | 'medio' | 'dificil' | 'letal')}
                className="master-select"
              >
                <option value="facil">Fácil</option>
                <option value="medio">Medio</option>
                <option value="dificil">Difícil</option>
                <option value="letal">Letal</option>
              </select>
            </div>
          </div>

          <label>Descripción / Ambientación</label>
          <input
            type="text"
            placeholder="Ej. Una niebla densa cubre el cementerio..."
            value={encDesc}
            onChange={(e) => setEncDesc(e.target.value)}
            className="master-input"
          />

          <label>Recompensas (Oro, EXP, Objetos)</label>
          <input
            type="text"
            placeholder="Ej. 450 XP, 120 PO, Poción de Curación"
            value={encRewards}
            onChange={(e) => setEncRewards(e.target.value)}
            className="master-input"
          />

          {/* Combatants list builder */}
          <div className="editor-combatants-section">
            <div className="flex-between mb-2">
              <span className="section-title">Combatientes ({encCombatants.length})</span>
              <div className="flex-align-gap">
                <button type="button" className="btn-secondary-sm" onClick={onAddGenericMonster}>
                  <Plus size={13} />
                  <span>+ Monstruo</span>
                </button>
              </div>
            </div>

            {/* Quick Add from Characters Library */}
            {campaign?.characters && campaign.characters.length > 0 && (
              <div className="quick-add-chars-row">
                <span className="quick-add-label">+ Añadir de Biblioteca:</span>
                {campaign.characters.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    className="quick-add-chip"
                    onClick={() => onAddCombatantFromLibrary(ch)}
                  >
                    <img src={ch.defaultAvatarUrl} alt={ch.name} />
                    <span>{ch.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="editor-combatants-list">
              {encCombatants.map((cbt, idx) => (
                <div key={cbt.id || idx} className="cbt-edit-row">
                  <img src={cbt.avatarUrl} alt={cbt.name} className="cbt-avatar" />
                  <div className="cbt-edit-fields">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={cbt.name}
                      onChange={(e) => onUpdateCombatant(idx, { name: e.target.value })}
                      className="master-input-sm"
                    />
                    <div className="cbt-edit-subfields">
                      <label>
                        HP Máx:
                        <input
                          type="number"
                          min="1"
                          value={cbt.maxHp}
                          onChange={(e) =>
                            onUpdateCombatant(idx, {
                              maxHp: parseInt(e.target.value) || 10,
                              currentHp: parseInt(e.target.value) || 10,
                            })
                          }
                          className="master-input-mini"
                        />
                      </label>

                      <label>
                        Mod Inic:
                        <input
                          type="number"
                          value={cbt.initiativeModifier ?? 0}
                          onChange={(e) =>
                            onUpdateCombatant(idx, {
                              initiativeModifier: parseInt(e.target.value) || 0,
                            })
                          }
                          className="master-input-mini"
                        />
                      </label>

                      <label className="checkbox-pill-sm">
                        <input
                          type="checkbox"
                          checked={cbt.isMonster}
                          onChange={(e) => onUpdateCombatant(idx, { isMonster: e.target.checked })}
                        />
                        <Skull size={12} />
                        <span>Monstruo</span>
                      </label>

                      <label className="checkbox-pill-sm">
                        <input
                          type="checkbox"
                          checked={cbt.isWaveReinforcement === true}
                          onChange={(e) =>
                            onUpdateCombatant(idx, {
                              isWaveReinforcement: e.target.checked,
                              triggerRound: e.target.checked ? cbt.triggerRound || 2 : undefined,
                            })
                          }
                        />
                        <span>🌊 Refuerzo</span>
                      </label>

                      {cbt.isWaveReinforcement && (
                        <label>
                          Ronda:
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={cbt.triggerRound || 2}
                            onChange={(e) =>
                              onUpdateCombatant(idx, {
                                triggerRound: parseInt(e.target.value) || 2,
                              })
                            }
                            className="master-input-mini"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-action-btn danger"
                    onClick={() => onRemoveCombatant(idx)}
                    disabled={encCombatants.length <= 1}
                    title="Eliminar Combatiente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label>Notas Secretas del DM / Tácticas</label>
          <textarea
            placeholder="Vulnerabilidades, trampas, tácticas de ataque..."
            value={encNotes}
            onChange={(e) => setEncNotes(e.target.value)}
            className="master-input textarea"
          />

          <button type="submit" className="btn-primary full mt-3">
            {isEditing ? 'Guardar Encuentro' : 'Crear Encuentro'}
          </button>
        </form>
      </div>
    </div>
  );
};
