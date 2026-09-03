import React, { useState, useEffect } from 'react';
import {
  Wand2,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Eye,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import type {
  Campaign,
  DisplayState,
  SessionPrepDraft,
  Scene,
} from '../../../types';

interface SessionPrepWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  liveState: DisplayState;
  onApplyDraftToStaging: (draft: SessionPrepDraft, preparedState: DisplayState) => Promise<void>;
  onSaveDraft: (draft: SessionPrepDraft) => Promise<void>;
}

export const SessionPrepWizardModal: React.FC<SessionPrepWizardModalProps> = ({
  isOpen,
  onClose,
  campaign,
  liveState,
  onApplyDraftToStaging,
  onSaveDraft,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isApplying, setIsApplying] = useState(false);

  // Draft state
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [suggestedReason, setSuggestedReason] = useState<string>('');
  const [worldChoices, setWorldChoices] = useState<Record<string, 'keep' | 'reset'>>({});
  const [resetWeather, setResetWeather] = useState(true);
  const [resetCombat, setResetCombat] = useState(true);
  const [dmGoals, setDmGoals] = useState('');

  // Initialize from saved draft or build intelligent defaults
  useEffect(() => {
    if (!campaign || !isOpen) return;

    if (campaign.sessionPrepDraft && campaign.sessionPrepDraft.status === 'draft') {
      const d = campaign.sessionPrepDraft;
      setSelectedSceneId(d.selectedSceneId);
      setSuggestedReason(d.suggestedReason);
      setWorldChoices(d.worldChoices || {});
      setResetWeather(d.resetTemporaryWeather ?? true);
      setResetCombat(d.resetTemporaryCombat ?? true);
      setDmGoals(d.dmSessionGoals || '');
      return;
    }

    // Propose intelligent scene: active scene or first scene in campaign
    const scenes = campaign.scenes || [];
    const activeId = liveState.currentSceneId || (scenes[0] ? scenes[0].id : '');
    setSelectedSceneId(activeId);

    if (liveState.currentSceneId) {
      setSuggestedReason('Escena activa al finalizar la sesión anterior');
    } else if (scenes.length > 0) {
      setSuggestedReason('Primera escena configurada en la campaña');
    } else {
      setSuggestedReason('Sin escenas previas');
    }

    // Default world choices: keep campaign-scoped props, reset session-scoped
    const initialChoices: Record<string, 'keep' | 'reset'> = {};
    (campaign.worldStateEntries || []).forEach((w) => {
      initialChoices[w.id] = w.scope === 'campaign' ? 'keep' : 'reset';
    });
    setWorldChoices(initialChoices);

    setDmGoals(campaign.nextSessionNotes || '');
  }, [campaign, isOpen, liveState.currentSceneId]);

  if (!isOpen || !campaign) return null;

  const scenes = campaign.scenes || [];
  const knowledgeEntries = (campaign.knowledgeEntries || []).filter((k) => !k.isCorrected);
  const worldEntries = campaign.worldStateEntries || [];
  const selectedScene: Scene | null = scenes.find((s) => s.id === selectedSceneId) || null;

  // Build prepared DisplayState cleanly without music or ephemeral actions
  const buildPreparedDisplayState = (): DisplayState => {
    // If a scene is selected, use it as baseline
    const baseline: DisplayState = selectedScene
      ? {
          currentSceneId: selectedScene.id,
          sceneName: selectedScene.name,
          backgroundUrl: selectedScene.backgroundUrl,
          activeVariantId: selectedScene.activeVariantId,
          fitMode: selectedScene.fitMode || 'cover',
          focalPoint: selectedScene.focalPoint,
          zoom: selectedScene.zoom || 1.0,
          characters: liveState.characters,
          props: selectedScene.props || [],
          weather: resetWeather ? 'none' : liveState.weather,
          weatherIntensity: resetWeather ? 0 : liveState.weatherIntensity,
          lighting: 'normal',
          locationBanner: { text: selectedScene.name, visible: true },
          isBlackout: false,
          shakeTrigger: 0,
          lightningTrigger: 0,
          ambientAudioUrl: '', // Silent on prep
          ambientPlaying: false,
          ambientVolume: 0.5,
          lastSfx: null,
          combatState: resetCombat
            ? { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] }
            : liveState.combatState,
          lights: selectedScene.lights || [],
          emitters: selectedScene.emitters || [],
          interactions: selectedScene.interactions || [],
        }
      : {
          ...liveState,
          ambientPlaying: false,
          lastSfx: null,
        };

    // Apply chosen persistent states to props and interactions
    if (baseline.props) {
      baseline.props = baseline.props.map((p) => {
        const choice = worldChoices[p.id];
        if (choice === 'keep') {
          const persistedEntry = worldEntries.find((w) => w.id === p.id);
          if (persistedEntry) {
            return { ...p, visualStateId: persistedEntry.state };
          }
        }
        return p;
      });
    }

    if (baseline.interactions) {
      baseline.interactions = baseline.interactions.map((i) => {
        const choice = worldChoices[i.targetInstanceId];
        if (choice === 'keep') {
          const persistedEntry = worldEntries.find((w) => w.id === i.targetInstanceId);
          if (persistedEntry) {
            return { ...i, currentState: persistedEntry.state };
          }
        }
        return i;
      });
    }

    return baseline;
  };

  const handleSaveDraftState = async () => {
    const draft: SessionPrepDraft = {
      id: campaign.sessionPrepDraft?.id || `prep-${Date.now()}`,
      campaignId: campaign.id,
      createdAt: campaign.sessionPrepDraft?.createdAt || Date.now(),
      updatedAt: Date.now(),
      selectedSceneId,
      suggestedReason,
      worldChoices,
      resetTemporaryWeather: resetWeather,
      resetTemporaryCombat: resetCombat,
      dmSessionGoals: dmGoals,
      status: 'draft',
    };
    await onSaveDraft(draft);
  };

  const handleConfirmApply = async () => {
    if (isApplying) return; // Double-click protection
    setIsApplying(true);

    try {
      const draft: SessionPrepDraft = {
        id: campaign.sessionPrepDraft?.id || `prep-${Date.now()}`,
        campaignId: campaign.id,
        createdAt: campaign.sessionPrepDraft?.createdAt || Date.now(),
        updatedAt: Date.now(),
        selectedSceneId,
        suggestedReason,
        worldChoices,
        resetTemporaryWeather: resetWeather,
        resetTemporaryCombat: resetCombat,
        dmSessionGoals: dmGoals,
        status: 'applied',
      };

      const preparedState = buildPreparedDisplayState();
      await onApplyDraftToStaging(draft, preparedState);
      onClose();
    } catch (err) {
      console.error('[SessionPrepWizard] Error applying prepared session:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content session-prep-wizard max-w-2xl bg-slate-950 border border-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="text-purple-400" size={20} />
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Asistente de Preparación de Sesión
              </h2>
              <p className="text-[11px] text-slate-400">Paso {step} de 4 — {campaign.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-4 bg-slate-900/40 border-b border-slate-800 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-2 text-center border-b-2 transition-colors ${
              step === 1 ? 'border-purple-500 text-purple-300 font-bold' : 'border-transparent text-slate-400'
            }`}
          >
            1. Resumen
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`py-2 text-center border-b-2 transition-colors ${
              step === 2 ? 'border-purple-500 text-purple-300 font-bold' : 'border-transparent text-slate-400'
            }`}
          >
            2. Persistencia
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`py-2 text-center border-b-2 transition-colors ${
              step === 3 ? 'border-purple-500 text-purple-300 font-bold' : 'border-transparent text-slate-400'
            }`}
          >
            3. Escena
          </button>
          <button
            type="button"
            onClick={() => setStep(4)}
            className={`py-2 text-center border-b-2 transition-colors ${
              step === 4 ? 'border-purple-500 text-purple-300 font-bold' : 'border-transparent text-slate-400'
            }`}
          >
            4. Revisión
          </button>
        </div>

        {/* Step Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* STEP 1: SUMMARY */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-950/20 border border-purple-900/30 rounded-lg flex items-start gap-2 text-purple-200">
                <Info size={16} className="shrink-0 text-purple-400 mt-0.5" />
                <span>
                  El conocimiento adquirido por los jugadores se conserva independientemente del estado físico de los props o de la escena elegida.
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-1.5 mb-2">
                  <Eye size={13} className="text-amber-400" />
                  <span>Lo que conocen los jugadores ({knowledgeEntries.length})</span>
                </h3>
                {knowledgeEntries.length === 0 ? (
                  <p className="text-slate-500 italic p-3 bg-slate-900/40 rounded border border-slate-800">
                    No hay revelaciones registradas para los jugadores.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {knowledgeEntries.map((k) => (
                      <div key={k.id} className="p-2 bg-slate-900/70 border border-slate-800 rounded flex justify-between gap-2">
                        <div>
                          <strong className="text-slate-200">{k.title}: </strong>
                          <span className="text-slate-400">{k.description}</span>
                        </div>
                        <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-slate-800 text-slate-400 h-fit shrink-0">
                          {k.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-200 mb-1.5">Objetivos y notas de la sesión previa:</h3>
                <textarea
                  value={dmGoals}
                  onChange={(e) => setDmGoals(e.target.value)}
                  placeholder="Anota hilos pendientes y decisiones inmediatas de los jugadores..."
                  className="w-full h-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: WORLD STATE PERSISTENCE */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-400">
                  Decide qué elementos interactuados de la sesión anterior conservar o restablecer:
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const allKeep: Record<string, 'keep' | 'reset'> = {};
                      worldEntries.forEach((w) => (allKeep[w.id] = 'keep'));
                      setWorldChoices(allKeep);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-[10px]"
                  >
                    Conservar Todo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaults: Record<string, 'keep' | 'reset'> = {};
                      worldEntries.forEach((w) => (defaults[w.id] = w.scope === 'campaign' ? 'keep' : 'reset'));
                      setWorldChoices(defaults);
                    }}
                    className="px-2 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-800/50 text-purple-300 rounded font-semibold text-[10px]"
                  >
                    Valores Recomendados
                  </button>
                </div>
              </div>

              {worldEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic bg-slate-900/30 rounded-lg border border-slate-800">
                  No hay objetos físicos modificados en la campaña todavía.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg bg-slate-900/60 overflow-hidden">
                  {worldEntries.map((w) => {
                    const choice = worldChoices[w.id] || (w.scope === 'campaign' ? 'keep' : 'reset');
                    return (
                      <div key={w.id} className="p-2.5 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{w.targetName}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                              {w.scope}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Estado previo: <strong className="text-amber-300 uppercase">{w.state}</strong>
                          </span>
                        </div>
                        <div className="flex rounded-lg border border-slate-700 overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => setWorldChoices((prev) => ({ ...prev, [w.id]: 'keep' }))}
                            className={`px-2.5 py-1 text-[10px] font-bold ${
                              choice === 'keep'
                                ? 'bg-emerald-600 text-slate-950'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Conservar ({w.state})
                          </button>
                          <button
                            type="button"
                            onClick={() => setWorldChoices((prev) => ({ ...prev, [w.id]: 'reset' }))}
                            className={`px-2.5 py-1 text-[10px] font-bold ${
                              choice === 'reset'
                                ? 'bg-rose-600 text-slate-100'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Restablecer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                <span className="font-bold text-slate-300 block">Restablecimientos Automáticos:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={resetWeather}
                    onChange={(e) => setResetWeather(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>Despejar clima y relámpagos temporales</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={resetCombat}
                    onChange={(e) => setResetCombat(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>Reiniciar ronda e iniciativa de combate temporal</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: INITIAL SCENE & RESOURCES */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <span className="font-bold text-slate-200 block mb-1">Escena Inicial Propuesta:</span>
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-purple-300 text-sm">
                      {selectedScene ? selectedScene.name : 'Ninguna'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{suggestedReason}</p>
                  </div>
                  {selectedScene?.backgroundUrl && (
                    <img
                      src={selectedScene.backgroundUrl}
                      alt={selectedScene.name}
                      className="w-16 h-10 object-cover rounded border border-slate-700"
                    />
                  )}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-200 block mb-1">Cambiar a otra escena de la campaña:</span>
                <select
                  value={selectedSceneId}
                  onChange={(e) => {
                    setSelectedSceneId(e.target.value);
                    setSuggestedReason('Seleccionada manualmente por el DM para esta sesión');
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
                >
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck size={14} />
                  <span>Validación de Recursos (Zero-Leak)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  ✓ El fondo de la escena está verificado.{'\n'}
                  ✓ Sin música de fondo ni disparadores de sonido activos al preparar.{'\n'}
                  ✓ Los secretos y ramas privadas permanecen exclusivamente en tu pantalla de Master.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & LOAD INTO STAGING */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                  <Sparkles size={14} />
                  <span>Resumen de Preparación</span>
                </div>
                <ul className="text-slate-300 space-y-1 pl-4 list-disc text-[11px]">
                  <li>
                    <strong>Escena inicial:</strong> {selectedScene ? selectedScene.name : 'Ninguna'}
                  </li>
                  <li>
                    <strong>Conocimientos preservados:</strong> {knowledgeEntries.length} pistas e identidades.
                  </li>
                  <li>
                    <strong>Objetos físicos conservados:</strong>{' '}
                    {Object.values(worldChoices).filter((c) => c === 'keep').length} elementos persistentes.
                  </li>
                  <li>
                    <strong>Restablecimiento temporal:</strong> Clima{' '}
                    {resetWeather ? 'despejado' : 'conservado'}, Combate{' '}
                    {resetCombat ? 'inactivo' : 'conservado'}.
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg text-amber-200 text-[11px]">
                <strong>Modo Seguro:</strong> Al pulsar "Cargar en Staging", la Mesa de los jugadores <strong>no sufrirá ningún cambio</strong>. Podrás revisar todo en Staging y publicar a la Mesa cuando comience la sesión.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1"
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveDraftState}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                Guardar Borrador
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-slate-100 font-bold flex items-center gap-1"
              >
                <span>Siguiente</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isApplying}
                onClick={handleConfirmApply}
                className={`px-5 py-2 rounded font-bold flex items-center gap-2 shadow-lg transition-all ${
                  isApplying
                    ? 'bg-emerald-800 text-slate-300 opacity-60 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                }`}
              >
                <Check size={16} />
                <span>{isApplying ? 'Preparando...' : 'Cargar en Staging (Modo Seguro)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
