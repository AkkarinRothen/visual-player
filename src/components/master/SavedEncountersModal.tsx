import React, { useState } from 'react';
import type { Campaign, SavedEncounter, EncounterCombatant, Combatant } from '../../types';
import {
  Swords,
  Plus,
  Play,
  Layers,
  Edit,
  Trash2,
  X,
  Skull,
  Dices,
  Award,
  Sparkles,
} from 'lucide-react';

interface SavedEncountersModalProps {
  campaign: Campaign | null;
  encounters: SavedEncounter[];
  isCombatActive: boolean;
  onLaunchEncounterLive: (encounter: SavedEncounter, combatants: Combatant[]) => void;
  onLoadEncounterToStaging: (encounter: SavedEncounter, combatants: Combatant[]) => void;
  onSaveEncounter: (encounter: SavedEncounter) => void;
  onDeleteEncounter: (id: string) => void;
  onClose: () => void;
}

export const SavedEncountersModal: React.FC<SavedEncountersModalProps> = ({
  campaign,
  encounters,
  isCombatActive,
  onLaunchEncounterLive,
  onLoadEncounterToStaging,
  onSaveEncounter,
  onDeleteEncounter,
  onClose,
}) => {
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingEncounter, setEditingEncounter] = useState<SavedEncounter | null>(null);

  // Quick Launch initiative resolution dialog
  const [resolvingEncounter, setResolvingEncounter] = useState<SavedEncounter | null>(null);
  const [resolutionMode, setResolutionMode] = useState<'live' | 'staging'>('live');
  const [combatantsWithInitiative, setCombatantsWithInitiative] = useState<Combatant[]>([]);

  // Editor form state
  const [encName, setEncName] = useState<string>('');
  const [encDesc, setEncDesc] = useState<string>('');
  const [encDifficulty, setEncDifficulty] = useState<'facil' | 'medio' | 'dificil' | 'letal'>('medio');
  const [encRewards, setEncRewards] = useState<string>('');
  const [encNotes, setEncNotes] = useState<string>('');
  const [encCombatants, setEncCombatants] = useState<EncounterCombatant[]>([]);

  // Open Quick Launch Dialog
  const openLaunchDialog = (enc: SavedEncounter, mode: 'live' | 'staging') => {
    setResolvingEncounter(enc);
    setResolutionMode(mode);

    // Roll or calculate initiative for all combatants
    const instantiated: Combatant[] = enc.combatants.map((c) => {
      let init = c.fixedInitiative ?? 10;
      if (c.initiativeType === 'roll_d20') {
        const roll = Math.floor(Math.random() * 20) + 1;
        init = roll + (c.initiativeModifier ?? 0);
      }

      return {
        id: `cbt-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: c.name,
        avatarUrl: c.avatarUrl,
        initiative: init,
        currentHp: c.maxHp,
        maxHp: c.maxHp,
        showHpToPlayers: c.showHpToPlayers,
        conditions: c.initialConditions || [],
        isMonster: c.isMonster,
        isWaveReinforcement: c.isWaveReinforcement,
        triggerRound: c.triggerRound,
        isDeployed: !c.isWaveReinforcement, // Wave reinforcements start undeployed
      };
    });

    // Sort by initiative descending
    instantiated.sort((a, b) => b.initiative - a.initiative);
    setCombatantsWithInitiative(instantiated);
  };

  const reRollAllInitiatives = () => {
    if (!resolvingEncounter) return;
    const next = combatantsWithInitiative.map((c, idx) => {
      const template = resolvingEncounter.combatants[idx] || resolvingEncounter.combatants[0];
      const roll = Math.floor(Math.random() * 20) + 1;
      const mod = template.initiativeModifier || 0;
      return { ...c, initiative: roll + mod };
    });
    next.sort((a, b) => b.initiative - a.initiative);
    setCombatantsWithInitiative(next);
  };

  const confirmLaunch = () => {
    if (!resolvingEncounter) return;

    if (resolutionMode === 'live') {
      if (
        isCombatActive &&
        !window.confirm('⚠️ Ya hay un combate en curso. ¿Deseas reemplazarlo con este nuevo encuentro?')
      ) {
        return;
      }
      onLaunchEncounterLive(resolvingEncounter, combatantsWithInitiative);
    } else {
      onLoadEncounterToStaging(resolvingEncounter, combatantsWithInitiative);
    }

    setResolvingEncounter(null);
    onClose();
  };

  // Editor Actions
  const openCreateModal = () => {
    setEditingEncounter(null);
    setEncName('');
    setEncDesc('');
    setEncDifficulty('medio');
    setEncRewards('350 XP, 50 PO');
    setEncNotes('');
    setEncCombatants([
      {
        id: `cbt-${Date.now()}-1`,
        name: 'Monstruo Hostil',
        avatarUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
        maxHp: 30,
        currentHp: 30,
        isMonster: true,
        showHpToPlayers: false,
        initiativeType: 'roll_d20',
        initiativeModifier: 2,
      },
    ]);
    setShowEditor(true);
  };

  const openEditModal = (enc: SavedEncounter) => {
    setEditingEncounter(enc);
    setEncName(enc.name);
    setEncDesc(enc.description);
    setEncDifficulty(enc.difficulty);
    setEncRewards(enc.rewardsSummary || '');
    setEncNotes(enc.dmNotes || '');
    setEncCombatants(enc.combatants);
    setShowEditor(true);
  };

  const handleSaveEncounterForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!encName.trim() || encCombatants.length === 0 || !campaign) return;

    const saved: SavedEncounter = {
      id: editingEncounter ? editingEncounter.id : `enc-${Date.now()}`,
      campaignId: campaign.id,
      name: encName,
      description: encDesc,
      difficulty: encDifficulty,
      rewardsSummary: encRewards,
      dmNotes: encNotes,
      combatants: encCombatants,
      turnTimerSeconds: 60,
    };

    onSaveEncounter(saved);
    setShowEditor(false);
  };

  const addCombatantFromLibrary = (char: { name: string; defaultAvatarUrl: string; maxHp?: number }) => {
    const newCbt: EncounterCombatant = {
      id: `cbt-${Date.now()}-${encCombatants.length + 1}`,
      name: char.name,
      avatarUrl: char.defaultAvatarUrl,
      maxHp: char.maxHp || 30,
      currentHp: char.maxHp || 30,
      isMonster: false,
      showHpToPlayers: true,
      initiativeType: 'roll_d20',
      initiativeModifier: 2,
    };
    setEncCombatants([...encCombatants, newCbt]);
  };

  const addGenericMonster = () => {
    const newMonster: EncounterCombatant = {
      id: `cbt-mob-${Date.now()}-${encCombatants.length + 1}`,
      name: `Enemigo ${encCombatants.length + 1}`,
      avatarUrl: 'https://images.unsplash.com/photo-1564865878688-9a244444042a?w=600&auto=format&fit=crop&q=80',
      maxHp: 25,
      currentHp: 25,
      isMonster: true,
      showHpToPlayers: false,
      initiativeType: 'roll_d20',
      initiativeModifier: 1,
    };
    setEncCombatants([...encCombatants, newMonster]);
  };

  const updateCombatantInForm = (idx: number, updated: Partial<EncounterCombatant>) => {
    const next = [...encCombatants];
    next[idx] = { ...next[idx], ...updated };
    setEncCombatants(next);
  };

  const removeCombatantFromForm = (idx: number) => {
    if (encCombatants.length <= 1) return;
    setEncCombatants(encCombatants.filter((_, i) => i !== idx));
  };

  const getDifficultyBadge = (diff: SavedEncounter['difficulty']) => {
    switch (diff) {
      case 'facil':
        return <span className="diff-badge facil">FÁCIL</span>;
      case 'medio':
        return <span className="diff-badge medio">MEDIO</span>;
      case 'dificil':
        return <span className="diff-badge dificil">DIFÍCIL</span>;
      case 'letal':
        return <span className="diff-badge letal">LETAL 💀</span>;
    }
  };

  return (
    <div className="modal-overlay encounters-modal-overlay" onClick={onClose}>
      <div className="modal-content encounters-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex-align-gap">
            <Swords size={20} className="text-amber-400" />
            <h2>Biblioteca de Encuentros de Combate</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="modal-subtitle">
          Plantillas inmutables de batallas tácticas con iniciativas calculables, oleadas de refuerzo y recompensas configurables.
        </p>

        {/* Create Bar */}
        <div className="encounters-top-bar">
          <span className="section-count">{encounters.length} encuentros guardados</span>
          <button className="btn-primary-sm" onClick={openCreateModal}>
            <Plus size={14} />
            <span>+ Nuevo Encuentro</span>
          </button>
        </div>

        {/* Encounters Grid */}
        <div className="encounters-grid">
          {encounters.length === 0 ? (
            <div className="empty-history-box">
              <Swords size={36} className="text-slate-600 mb-2" />
              <p>No hay encuentros preparados en esta campaña.</p>
            </div>
          ) : (
            encounters.map((enc) => {
              const activeCount = enc.combatants.filter((c) => !c.isWaveReinforcement).length;
              const wavesCount = enc.combatants.filter((c) => c.isWaveReinforcement).length;

              return (
                <div key={enc.id} className="encounter-card">
                  <div className="encounter-card-header">
                    <div className="encounter-title-group">
                      <strong>{enc.name}</strong>
                      {getDifficultyBadge(enc.difficulty)}
                    </div>
                    <div className="encounter-meta-pills">
                      <span className="meta-pill">{activeCount} iniciales</span>
                      {wavesCount > 0 && <span className="meta-pill wave">+{wavesCount} refuerzos</span>}
                    </div>
                  </div>

                  <p className="encounter-desc">{enc.description}</p>

                  {/* Combatants Avatars Row */}
                  <div className="encounter-combatants-preview">
                    {enc.combatants.map((c) => (
                      <div key={c.id} className="cbt-mini-thumb" title={`${c.name} (${c.maxHp} HP)`}>
                        <img src={c.avatarUrl} alt={c.name} />
                        {c.isWaveReinforcement && <span className="wave-mini-dot" title="Refuerzo">🌊</span>}
                      </div>
                    ))}
                  </div>

                  {enc.rewardsSummary && (
                    <div className="encounter-rewards-preview">
                      <Award size={13} className="text-amber-400" />
                      <span>{enc.rewardsSummary}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="encounter-card-actions">
                    <button
                      className="btn-primary-sm launch-live-btn"
                      onClick={() => openLaunchDialog(enc, 'live')}
                      title="Tirar iniciativa e iniciar combate en vivo"
                    >
                      <Play size={14} />
                      <span>⚔️ Iniciar Ahora</span>
                    </button>

                    <button
                      className="btn-secondary-sm launch-staging-btn"
                      onClick={() => openLaunchDialog(enc, 'staging')}
                      title="Cargar en borrador de Preparación"
                    >
                      <Layers size={14} />
                      <span>🛠️ Borrador</span>
                    </button>

                    <button
                      className="icon-action-btn"
                      onClick={() => openEditModal(enc)}
                      title="Editar Encuentro"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      className="icon-action-btn danger"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el encuentro "${enc.name}"?`)) {
                          onDeleteEncounter(enc.id);
                        }
                      }}
                      title="Eliminar Encuentro"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* QUICK LAUNCH & INITIATIVE RESOLUTION DIALOG */}
        {resolvingEncounter && (
          <div className="modal-overlay launch-dialog-overlay" onClick={() => setResolvingEncounter(null)}>
            <div className="modal-content launch-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {resolutionMode === 'live' ? '⚔️ Iniciar Combate' : '🛠️ Cargar en Borrador'}: {resolvingEncounter.name}
                </h2>
                <button className="modal-close" onClick={() => setResolvingEncounter(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="launch-dialog-body">
                <div className="launch-init-tools">
                  <span>Orden de Iniciativa Calculado:</span>
                  <button className="btn-secondary-sm" onClick={reRollAllInitiatives}>
                    <Dices size={14} />
                    <span>Volver a Tirar d20</span>
                  </button>
                </div>

                <div className="launch-combatants-list">
                  {combatantsWithInitiative.map((c, idx) => (
                    <div key={c.id} className={`launch-cbt-row ${c.isWaveReinforcement ? 'wave-row' : ''}`}>
                      <img src={c.avatarUrl} alt={c.name} className="cbt-avatar" />
                      <div className="cbt-info">
                        <strong>{c.name}</strong>
                        <span className="cbt-sub">
                          {c.maxHp} HP • {c.isMonster ? 'Monstruo' : 'Personaje'}
                          {c.isWaveReinforcement && ` • Refuerzo (Ronda ${c.triggerRound || 2})`}
                        </span>
                      </div>
                      <div className="cbt-init-input-group">
                        <label>Inic:</label>
                        <input
                          type="number"
                          value={c.initiative}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const next = [...combatantsWithInitiative];
                            next[idx].initiative = val;
                            next.sort((a, b) => b.initiative - a.initiative);
                            setCombatantsWithInitiative(next);
                          }}
                          className="init-number-input"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="launch-dialog-footer">
                <button className="btn-secondary" onClick={() => setResolvingEncounter(null)}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={confirmLaunch}>
                  <Sparkles size={16} />
                  <span>{resolutionMode === 'live' ? 'Desplegar Combate en Pantalla' : 'Montar en Preparación'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ENCOUNTER BUILDER / EDITOR MODAL */}
        {showEditor && (
          <div className="modal-overlay editor-submodal-overlay" onClick={() => setShowEditor(false)}>
            <div className="modal-content encounter-editor-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingEncounter ? 'Editar Encuentro' : 'Nuevo Encuentro de Combate'}</h2>
                <button className="modal-close" onClick={() => setShowEditor(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEncounterForm} className="modal-form">
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
                      onChange={(e) => setEncDifficulty(e.target.value as any)}
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
                      <button type="button" className="btn-secondary-sm" onClick={addGenericMonster}>
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
                          onClick={() => addCombatantFromLibrary(ch)}
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
                            onChange={(e) => updateCombatantInForm(idx, { name: e.target.value })}
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
                                  updateCombatantInForm(idx, {
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
                                  updateCombatantInForm(idx, {
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
                                onChange={(e) => updateCombatantInForm(idx, { isMonster: e.target.checked })}
                              />
                              <Skull size={12} />
                              <span>Monstruo</span>
                            </label>

                            <label className="checkbox-pill-sm">
                              <input
                                type="checkbox"
                                checked={cbt.isWaveReinforcement === true}
                                onChange={(e) =>
                                  updateCombatantInForm(idx, {
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
                                    updateCombatantInForm(idx, {
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
                          onClick={() => removeCombatantFromForm(idx)}
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
                  {editingEncounter ? 'Guardar Encuentro' : 'Crear Encuentro'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
