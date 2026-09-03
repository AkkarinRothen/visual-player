import React, { useState, useEffect, useMemo } from 'react';
import type {
  DisplayState,
  SceneCompositionPreset,
  SavedConversation,
  PresetDependencyReport,
  InstantiatePresetOptions,
  GameSession,
} from '../../../types';
import {
  saveSceneAsCompositionPreset,
  getSceneCompositionPresets,
  instantiateScenePresetIntoSession,
  scanPresetDependencies,
  createSessionCheckpoint,
} from '../../../db';
import { gameSessionService } from '../../../services/gameSessionService';
import {
  X,
  Sparkles,
  Layers,
  Users,
  Volume2,
  ShieldCheck,
  AlertTriangle,
  Check,
  Plus,
  Flame,
  Lightbulb,
  FileText,
  Copy,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import '../../../styles/scenePresetModal.css';

interface ScenePresetModalProps {
  isOpen: boolean;
  mode: 'save' | 'insert';
  campaignId: string;
  sessionId?: string;
  stagedState: DisplayState;
  campaignConversations?: SavedConversation[];
  frozenConversations?: SavedConversation[];
  onClose: () => void;
  onPresetSaved?: (preset: SceneCompositionPreset) => void;
  onPresetInstantiated?: (session: GameSession, mode: 'append_scene' | 'replace_staged') => void;
}

export const ScenePresetModal: React.FC<ScenePresetModalProps> = ({
  isOpen,
  mode,
  campaignId,
  sessionId,
  stagedState,
  campaignConversations = [],
  frozenConversations = [],
  onClose,
  onPresetSaved,
  onPresetInstantiated,
}) => {
  // Save State
  const [presetName, setPresetName] = useState(stagedState.sceneName || 'Nueva Composición');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Insert State
  const [presets, setPresets] = useState<SceneCompositionPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dependencyReport, setDependencyReport] = useState<PresetDependencyReport | null>(null);
  const [charResolutions, setCharResolutions] = useState<Record<string, 'reuse_existing' | 'create_copy'>>({});
  const [convResolution, setConvResolution] = useState<'reuse_existing' | 'create_copy'>('reuse_existing');
  const [isScanning, setIsScanning] = useState(false);
  const [isInstantiating, setIsInstantiating] = useState(false);
  const [confirmReplaceStaged, setConfirmReplaceStaged] = useState(false);

  // Load presets on open
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'save') {
      setPresetName(stagedState.sceneName || 'Nueva Composición');
      setDescription('');
      setTagsInput('');
      setSelectedConvId('');
      setSaveSuccess(false);
    } else {
      loadPresets();
    }
  }, [isOpen, mode, campaignId, stagedState.sceneName]);

  const loadPresets = async () => {
    try {
      const all = await getSceneCompositionPresets(campaignId);
      setPresets(all);
      if (all.length > 0 && !selectedPresetId) {
        selectPresetForInspection(all[0]);
      }
    } catch (err) {
      console.error('Error al cargar presets:', err);
    }
  };

  const selectPresetForInspection = async (preset: SceneCompositionPreset) => {
    setSelectedPresetId(preset.id);
    setIsScanning(true);
    try {
      const report = await scanPresetDependencies(preset, campaignId);
      setDependencyReport(report);

      // Default resolutions
      const defaultCharRes: Record<string, 'reuse_existing' | 'create_copy'> = {};
      report.characterResolutions.forEach((cr) => {
        defaultCharRes[cr.name] = cr.matchType !== 'none' ? 'reuse_existing' : 'create_copy';
      });
      setCharResolutions(defaultCharRes);

      if (report.conversationResolution?.matchType !== 'none') {
        setConvResolution('reuse_existing');
      } else {
        setConvResolution('create_copy');
      }
    } catch (err) {
      console.error('Error al escanear dependencias del preset:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedPresetId) || null,
    [presets, selectedPresetId]
  );

  const filteredPresets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return presets;
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [presets, searchQuery]);

  const allAvailableConversations = useMemo(() => {
    const map = new Map<string, SavedConversation>();
    frozenConversations.forEach((c) => map.set(c.id, c));
    campaignConversations.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [frozenConversations, campaignConversations]);

  // Handle Save
  const handleSave = async () => {
    if (!presetName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const linkedConv = selectedConvId
        ? allAvailableConversations.find((c) => c.id === selectedConvId)
        : undefined;

      const saved = await saveSceneAsCompositionPreset(campaignId, stagedState, presetName.trim(), {
        description: description.trim() || undefined,
        tags,
        linkedConversation: linkedConv,
      });

      setSaveSuccess(true);
      onPresetSaved?.(saved);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error al guardar preset:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Instantiate
  const handleInstantiate = async (insertionMode: 'append_scene' | 'replace_staged') => {
    if (!selectedPreset || isInstantiating) return;
    const targetSessionId = sessionId || gameSessionService.getCurrentSession()?.id;
    if (!targetSessionId) {
      alert('No hay una sesión activa para insertar el preset.');
      return;
    }

    setIsInstantiating(true);
    try {
      // If replacing staged, create automatic checkpoint first
      if (insertionMode === 'replace_staged') {
        await createSessionCheckpoint(
          targetSessionId,
          campaignId,
          `Antes de reemplazar borrador con preset "${selectedPreset.name}"`,
          stagedState,
          'auto',
          'preset_replace'
        );
      }

      // Prepare options
      const options: InstantiatePresetOptions = {
        mode: insertionMode,
        characterResolution: Object.values(charResolutions).includes('create_copy')
          ? 'create_copy'
          : 'reuse_existing',
        conversationResolution: convResolution,
      };

      const updatedSession = await instantiateScenePresetIntoSession(
        targetSessionId,
        selectedPreset.id,
        options
      );

      onPresetInstantiated?.(updatedSession, insertionMode);
      onClose();
    } catch (err) {
      console.error('Error al instanciar preset:', err);
      alert('Error al insertar preset en la sesión.');
    } finally {
      setIsInstantiating(false);
      setConfirmReplaceStaged(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="scene-preset-overlay" onClick={onClose}>
      <div className="scene-preset-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="scene-preset-header">
          <div className="scene-preset-header-left">
            <div className="scene-preset-icon-badge">
              {mode === 'save' ? <FolderPlus size={18} /> : <Sparkles size={18} />}
            </div>
            <div className="scene-preset-title-group">
              <h2>
                {mode === 'save'
                  ? 'Guardar Escena como Preset Reutilizable'
                  : 'Insertar Preset de Escena en Preparación'}
              </h2>
              <div className="scene-preset-subtitle">
                {mode === 'save'
                  ? 'Guarda la composición completa de tu borrador para usarla en cualquier campaña o grupo.'
                  : 'Explora y reutiliza composiciones completas con control de dependencias.'}
              </div>
            </div>
          </div>
          <button className="icon-action-btn" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Staging notice banner */}
        <div className="scene-preset-staging-notice">
          <ShieldCheck size={14} className="text-blue-400 flex-shrink-0" />
          <span>
            <strong>Modo Preparación Segura:</strong> Las operaciones con presets se aplican únicamente a tu borrador. NUNCA emiten a la Mesa de los jugadores ni reproducen sonido.
          </span>
        </div>

        {/* Modal Body */}
        <div className="scene-preset-body">
          {mode === 'save' ? (
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
          ) : (
            /* INSERT MODE */
            <div className="preset-browser-layout">
              {/* Left Column: Preset List & Search */}
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
                      onClick={() => selectPresetForInspection(p)}
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

              {/* Right Column: Detailed Inspector & Dependencies */}
              <div className="preset-detail-column">
                {selectedPreset ? (
                  <>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, color: '#f1f5f9' }}>
                        {selectedPreset.name}
                      </h3>
                      {selectedPreset.description && (
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 8px' }}>
                          {selectedPreset.description}
                        </p>
                      )}
                    </div>

                    {/* Dependency Scan Banner */}
                    {isScanning ? (
                      <div className="dep-report-banner ready" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Analizando dependencias de archivos...</span>
                      </div>
                    ) : dependencyReport ? (
                      <div
                        className={`dep-report-banner ${
                          dependencyReport.isFullySelfContained ? 'ready' : 'warning'
                        }`}
                      >
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {dependencyReport.isFullySelfContained ? (
                            <ShieldCheck size={15} />
                          ) : (
                            <AlertTriangle size={15} />
                          )}
                          <span>
                            {dependencyReport.isFullySelfContained
                              ? 'Pieza 100% Autocontenida (Lista sin Internet)'
                              : `Atención: ${dependencyReport.missing.length} archivo(s) remotos o faltantes`}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>
                          {dependencyReport.includedCount} incrustados • {dependencyReport.alreadyAvailableCount} en almacén local • {dependencyReport.missing.length} faltantes.
                        </div>
                      </div>
                    ) : null}

                    {/* Conflicts & Resolutions */}
                    {dependencyReport && dependencyReport.characterResolutions.some((cr) => cr.matchType !== 'none') && (
                      <div className="conflict-resolution-box">
                        <span style={{ fontWeight: 600, fontSize: 11, color: '#fde68a' }}>
                          Coincidencias de Personajes en Campaña:
                        </span>
                        {dependencyReport.characterResolutions
                          .filter((cr) => cr.matchType !== 'none')
                          .map((cr, idx) => (
                            <div key={idx} className="conflict-item-row">
                              <span>
                                <strong>{cr.name}</strong> (coincide en destino)
                              </span>
                              <select
                                className="preset-form-select"
                                style={{ padding: '2px 6px', fontSize: 11 }}
                                value={charResolutions[cr.name] || 'reuse_existing'}
                                onChange={(e) =>
                                  setCharResolutions((prev) => ({
                                    ...prev,
                                    [cr.name]: e.target.value as 'reuse_existing' | 'create_copy',
                                  }))
                                }
                              >
                                <option value="reuse_existing">Reutilizar existente</option>
                                <option value="create_copy">Crear copia independiente</option>
                              </select>
                            </div>
                          ))}
                      </div>
                    )}

                    {dependencyReport?.conversationResolution &&
                      dependencyReport.conversationResolution.matchType !== 'none' && (
                        <div className="conflict-resolution-box">
                          <span style={{ fontWeight: 600, fontSize: 11, color: '#fde68a' }}>
                            Diálogo Vinculado Coincidente:
                          </span>
                          <div className="conflict-item-row">
                            <span>{dependencyReport.conversationResolution.title || 'Diálogo Vinculado'}</span>
                            <select
                              className="preset-form-select"
                              style={{ padding: '2px 6px', fontSize: 11 }}
                              value={convResolution}
                              onChange={(e) =>
                                setConvResolution(e.target.value as 'reuse_existing' | 'create_copy')
                              }
                            >
                              <option value="reuse_existing">Reutilizar diálogo existente</option>
                              <option value="create_copy">Crear copia independiente</option>
                            </select>
                          </div>
                        </div>
                      )}

                    {/* Action Confirmation for Replace Staged */}
                    {confirmReplaceStaged && (
                      <div
                        style={{
                          background: 'rgba(244,63,94,0.12)',
                          border: '1px solid rgba(244,63,94,0.3)',
                          borderRadius: 6,
                          padding: 10,
                          fontSize: 12,
                          color: '#fecdd3',
                        }}
                      >
                        <p style={{ margin: '0 0 8px' }}>
                          ¿Reemplazar la escena actual del borrador? Se creará un punto de restauración automático previo.
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            className="btn-preset-secondary"
                            onClick={() => setConfirmReplaceStaged(false)}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn-preset-warning"
                            onClick={() => handleInstantiate('replace_staged')}
                            disabled={isInstantiating}
                          >
                            Confirmar y Reemplazar
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="session-library-empty">
                    <span>Selecciona un preset de la lista para ver su composición y dependencias.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="scene-preset-footer">
          <button className="btn-preset-secondary" onClick={onClose}>
            Cancelar
          </button>

          {mode === 'save' ? (
            <button
              className="btn-preset-primary"
              onClick={handleSave}
              disabled={isSaving || !presetName.trim()}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} className="text-emerald-300" />
                  <span>¡Preset Guardado!</span>
                </>
              ) : (
                <>
                  <FolderPlus size={14} />
                  <span>Guardar Preset de Escena</span>
                </>
              )}
            </button>
          ) : (
            selectedPreset && !confirmReplaceStaged && (
              <>
                <button
                  className="btn-preset-secondary"
                  onClick={() => setConfirmReplaceStaged(true)}
                  disabled={isInstantiating}
                  title="Reemplaza la composición actual creando un punto de control previo"
                >
                  <Copy size={14} />
                  <span>Reemplazar Borrador</span>
                </button>
                <button
                  className="btn-preset-primary"
                  onClick={() => handleInstantiate('append_scene')}
                  disabled={isInstantiating}
                >
                  {isInstantiating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Insertando...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Añadir como Escena Nueva (Recomendado)</span>
                    </>
                  )}
                </button>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};
