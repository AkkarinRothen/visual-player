import React, { useState } from 'react';
import type { Campaign, CinematicMacro, MacroStep } from '../../types';
import {
  Sparkles,
  Play,
  Layers,
  Plus,
  Trash2,
  Edit,
  Clock,
  Zap,
  Activity,
  EyeOff,
  ChevronRight,
  X,
  Volume2,
} from 'lucide-react';

interface MomentsTabProps {
  campaign: Campaign | null;
  onExecuteMacro: (macro: CinematicMacro) => void;
  onLoadMacroToStaging: (macro: CinematicMacro) => void;
  onUpdateMacros: (macros: CinematicMacro[]) => void;
}

export const MomentsTab: React.FC<MomentsTabProps> = ({
  campaign,
  onExecuteMacro,
  onLoadMacroToStaging,
  onUpdateMacros,
}) => {
  const [showEditorModal, setShowEditorModal] = useState<boolean>(false);
  const [editingMacro, setEditingMacro] = useState<CinematicMacro | null>(null);

  // Form State
  const [macroName, setMacroName] = useState<string>('');
  const [macroDesc, setMacroDesc] = useState<string>('');
  const [macroSteps, setMacroSteps] = useState<MacroStep[]>([]);

  const macros = campaign?.macros || [];

  const openCreateModal = () => {
    setEditingMacro(null);
    setMacroName('');
    setMacroDesc('');
    setMacroSteps([
      {
        id: `step-${Date.now()}-1`,
        delayMs: 1500,
        actionLabel: 'Paso 1: Suspenso',
        blackout: true,
        sfxPreset: 'thunder',
        shake: true,
      },
      {
        id: `step-${Date.now()}-2`,
        delayMs: 0,
        actionLabel: 'Paso 2: Revelación de Escenario',
        blackout: false,
        sceneId: campaign?.scenes[0]?.id || '',
        backgroundUrl: campaign?.scenes[0]?.backgroundUrl || '',
        weather: 'storm',
        lighting: 'night',
        locationBanner: {
          text: 'MOMENTO DRAMÁTICO',
          subtitle: 'Secuencia en Vivo',
          visible: true,
        },
      },
    ]);
    setShowEditorModal(true);
  };

  const openEditModal = (m: CinematicMacro) => {
    setEditingMacro(m);
    setMacroName(m.name);
    setMacroDesc(m.description);
    setMacroSteps(m.steps);
    setShowEditorModal(true);
  };

  const handleSaveMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!macroName.trim() || macroSteps.length === 0) return;

    if (editingMacro) {
      const updated = macros.map((m) =>
        m.id === editingMacro.id
          ? { ...m, name: macroName, description: macroDesc, steps: macroSteps }
          : m
      );
      onUpdateMacros(updated);
    } else {
      const newMacro: CinematicMacro = {
        id: `macro-${Date.now()}`,
        name: macroName,
        description: macroDesc,
        icon: 'Sparkles',
        steps: macroSteps,
      };
      onUpdateMacros([...macros, newMacro]);
    }
    setShowEditorModal(false);
  };

  const handleDeleteMacro = (id: string, name: string) => {
    if (window.confirm(`¿Eliminar el momento dramático "${name}"?`)) {
      onUpdateMacros(macros.filter((m) => m.id !== id));
    }
  };

  const addStepToForm = () => {
    const newStep: MacroStep = {
      id: `step-${Date.now()}-${macroSteps.length + 1}`,
      delayMs: 1000,
      actionLabel: `Paso ${macroSteps.length + 1}`,
      sfxPreset: 'magic_spell',
    };
    setMacroSteps([...macroSteps, newStep]);
  };

  const updateStepInForm = (index: number, updated: Partial<MacroStep>) => {
    const next = [...macroSteps];
    next[index] = { ...next[index], ...updated };
    setMacroSteps(next);
  };

  const removeStepFromForm = (index: number) => {
    if (macroSteps.length <= 1) return;
    setMacroSteps(macroSteps.filter((_, i) => i !== index));
  };

  return (
    <div className="moments-tab-root">
      {/* Header section */}
      <section className="control-section moments-header-section">
        <div className="flex-between">
          <div>
            <span className="section-title">Momentos Dramáticos & Macros ({macros.length})</span>
            <p className="section-subtitle">
              Secuencias de acciones cinematográficas coordinadas con tiempos personalizables.
            </p>
          </div>
          <button className="btn-primary-sm" onClick={openCreateModal}>
            <Plus size={14} />
            <span>+ Nuevo Momento</span>
          </button>
        </div>
      </section>

      {/* Macros List */}
      <div className="macros-grid">
        {macros.length === 0 ? (
          <div className="empty-history-box">
            <Sparkles size={36} className="text-amber-400/40 mb-2" />
            <p>No hay momentos dramáticos creados.</p>
            <span className="text-xs text-slate-400">
              Pulsa "+ Nuevo Momento" para armar tu primera macro.
            </span>
          </div>
        ) : (
          macros.map((m) => {
            const totalDurationSec = (
              m.steps.reduce((acc, s) => acc + (s.delayMs || 0), 0) / 1000
            ).toFixed(1);

            return (
              <div key={m.id} className="macro-card">
                <div className="macro-card-header">
                  <div className="macro-title-group">
                    <Sparkles size={18} className="text-amber-400" />
                    <strong>{m.name}</strong>
                  </div>
                  <div className="macro-badges">
                    <span className="macro-steps-pill">{m.steps.length} pasos</span>
                    <span className="macro-duration-pill">
                      <Clock size={12} /> {totalDurationSec}s
                    </span>
                  </div>
                </div>

                <p className="macro-desc">{m.description}</p>

                {/* Steps Mini Timeline */}
                <div className="macro-timeline-preview">
                  {m.steps.map((step, idx) => (
                    <div key={step.id || idx} className="timeline-step-badge">
                      <span className="step-num">{idx + 1}</span>
                      <span className="step-name">{step.actionLabel || `Paso ${idx + 1}`}</span>
                      {step.delayMs > 0 && (
                        <span className="step-delay">{step.delayMs / 1000}s</span>
                      )}
                      {idx < m.steps.length - 1 && <ChevronRight size={12} className="step-arrow" />}
                    </div>
                  ))}
                </div>

                {/* Macro Card Actions */}
                <div className="macro-card-actions">
                  <button
                    className="btn-primary-sm run-macro-btn"
                    onClick={() => onExecuteMacro(m)}
                    title="Ejecutar secuencia en vivo"
                  >
                    <Play size={14} />
                    <span>Ejecutar en Vivo</span>
                  </button>

                  <button
                    className="btn-secondary-sm stage-macro-btn"
                    onClick={() => onLoadMacroToStaging(m)}
                    title="Cargar resultado en modo Preparación"
                  >
                    <Layers size={14} />
                    <span>Cargar Borrador</span>
                  </button>

                  <button
                    className="icon-action-btn"
                    onClick={() => openEditModal(m)}
                    title="Editar Momento"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    className="icon-action-btn danger"
                    onClick={() => handleDeleteMacro(m.id, m.name)}
                    title="Eliminar Momento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: CREATE / EDIT MACRO */}
      {showEditorModal && (
        <div className="modal-overlay" onClick={() => setShowEditorModal(false)}>
          <div className="modal-content macro-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMacro ? 'Editar Momento Dramático' : 'Crear Momento Dramático'}</h2>
              <button className="modal-close" onClick={() => setShowEditorModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMacro} className="modal-form">
              <label>Nombre del Momento</label>
              <input
                type="text"
                required
                placeholder="Ej. Emboscada de los No-Muertos"
                value={macroName}
                onChange={(e) => setMacroName(e.target.value)}
                className="master-input"
              />

              <label>Descripción</label>
              <input
                type="text"
                placeholder="Ej. Blackout, relámpago, trueno y aparición de esqueletos..."
                value={macroDesc}
                onChange={(e) => setMacroDesc(e.target.value)}
                className="master-input"
              />

              {/* Steps List Builder */}
              <div className="macro-steps-builder">
                <div className="flex-between mb-2">
                  <span className="section-title">Pasos de la Secuencia ({macroSteps.length})</span>
                  <button type="button" className="btn-secondary-sm" onClick={addStepToForm}>
                    <Plus size={14} />
                    <span>Agregar Paso</span>
                  </button>
                </div>

                <div className="steps-form-list">
                  {macroSteps.map((step, idx) => (
                    <div key={step.id || idx} className="step-edit-card">
                      <div className="step-card-header">
                        <span className="step-card-title">Paso {idx + 1}</span>
                        <div className="flex-align-gap">
                          <label className="step-delay-label">
                            Demora:
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={(step.delayMs || 0) / 1000}
                              onChange={(e) =>
                                updateStepInForm(idx, {
                                  delayMs: Math.round(parseFloat(e.target.value || '0') * 1000),
                                })
                              }
                              className="delay-input"
                            />
                            seg
                          </label>
                          <button
                            type="button"
                            className="icon-action-btn danger"
                            onClick={() => removeStepFromForm(idx)}
                            disabled={macroSteps.length <= 1}
                            title="Eliminar Paso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Etiqueta del paso (Ej. Trueno y Rayo)"
                        value={step.actionLabel || ''}
                        onChange={(e) => updateStepInForm(idx, { actionLabel: e.target.value })}
                        className="master-input secondary mb-2"
                      />

                      {/* Step Action Configs */}
                      <div className="step-action-toggles">
                        <label className="checkbox-pill">
                          <input
                            type="checkbox"
                            checked={step.blackout === true}
                            onChange={(e) => updateStepInForm(idx, { blackout: e.target.checked })}
                          />
                          <EyeOff size={14} />
                          <span>Blackout</span>
                        </label>

                        <label className="checkbox-pill">
                          <input
                            type="checkbox"
                            checked={step.lightning === true}
                            onChange={(e) => updateStepInForm(idx, { lightning: e.target.checked })}
                          />
                          <Zap size={14} />
                          <span>Rayo</span>
                        </label>

                        <label className="checkbox-pill">
                          <input
                            type="checkbox"
                            checked={step.shake === true}
                            onChange={(e) => updateStepInForm(idx, { shake: e.target.checked })}
                          />
                          <Activity size={14} />
                          <span>Temblor</span>
                        </label>
                      </div>

                      {/* SFX Preset selector */}
                      <div className="step-select-row">
                        <label>
                          <Volume2 size={14} /> SFX:
                        </label>
                        <select
                          value={step.sfxPreset || ''}
                          onChange={(e) => updateStepInForm(idx, { sfxPreset: e.target.value || undefined })}
                          className="master-select"
                        >
                          <option value="">(Ninguno)</option>
                          <option value="thunder">Trueno</option>
                          <option value="monster_roar">Rugido de Monstruo</option>
                          <option value="sword_clash">Choque de Espadas</option>
                          <option value="magic_spell">Hechizo Mágico</option>
                          <option value="gong">Gong</option>
                          <option value="church_bell">Campana</option>
                          <option value="fanfare_victory">Victoria</option>
                          <option value="heartbeat">Latido / Tensión</option>
                        </select>
                      </div>

                      {/* Scene switch option */}
                      {campaign?.scenes && campaign.scenes.length > 0 && (
                        <div className="step-select-row">
                          <label>Escenario:</label>
                          <select
                            value={step.sceneId || ''}
                            onChange={(e) => {
                              const sc = campaign.scenes.find((s) => s.id === e.target.value);
                              updateStepInForm(idx, {
                                sceneId: sc?.id,
                                backgroundUrl: sc?.backgroundUrl,
                                weather: sc?.weather,
                                lighting: sc?.lighting,
                                ambientAudioUrl: sc?.ambientAudioUrl,
                                ambientPlaying: sc?.ambientAudioUrl ? true : undefined,
                              });
                            }}
                            className="master-select"
                          >
                            <option value="">(Mantener escenario actual)</option>
                            {campaign.scenes.map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                {sc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary full mt-3">
                {editingMacro ? 'Guardar Momento' : 'Crear Momento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
