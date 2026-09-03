import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Eye,
  Globe,
  ClipboardList,
  Copy,
  Check,
  Plus,
  AlertCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import type {
  Campaign,
  CampaignKnowledgeEntry,
  KnowledgeType,
} from '../../../types';

interface CampaignRevelationJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onUpdateCampaign: (updated: Campaign) => Promise<void>;
}

export const CampaignRevelationJournalModal: React.FC<CampaignRevelationJournalModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onUpdateCampaign,
}) => {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'world' | 'prep'>('knowledge');
  const [copiedPlayerSummary, setCopiedPlayerSummary] = useState(false);
  const [showAddClue, setShowAddClue] = useState(false);
  const [newClueTitle, setNewClueTitle] = useState('');
  const [newClueDesc, setNewClueDesc] = useState('');
  const [newClueType, setNewClueType] = useState<KnowledgeType>('clue');
  const [newClueDmNotes, setNewClueDmNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(campaign?.nextSessionNotes || '');
  const [savedNotesStatus, setSavedNotesStatus] = useState(false);

  if (!isOpen || !campaign) return null;

  const knowledgeEntries = campaign.knowledgeEntries || [];
  const worldStateEntries = campaign.worldStateEntries || [];

  // Generate clean player-safe markdown summary
  const handleCopyPlayerSummary = async () => {
    const uncorrected = knowledgeEntries.filter((k) => !k.isCorrected);
    if (uncorrected.length === 0) {
      await navigator.clipboard.writeText('No hay revelaciones registradas para los jugadores.');
    } else {
      const summaryLines = [
        `# Resumen de Conocimientos Revelados — ${campaign.title}`,
        '',
        ...uncorrected.map(
          (k) =>
            `- **${k.title}**: ${k.description} *(Descubierto: ${new Date(k.revealedAt).toLocaleDateString()})*`
        ),
      ];
      await navigator.clipboard.writeText(summaryLines.join('\n'));
    }
    setCopiedPlayerSummary(true);
    setTimeout(() => setCopiedPlayerSummary(false), 2000);
  };

  const handleAddManualClue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClueTitle.trim()) return;

    const newEntry: CampaignKnowledgeEntry = {
      id: `know-manual-${Date.now()}`,
      type: newClueType,
      title: newClueTitle.trim(),
      description: newClueDesc.trim() || 'Pista añadida manualmente por el DM.',
      revealedAt: Date.now(),
      source: 'manual_dm',
      dmPrivateNotes: newClueDmNotes.trim() || undefined,
    };

    const updated: Campaign = {
      ...campaign,
      knowledgeEntries: [newEntry, ...knowledgeEntries],
      updatedAt: Date.now(),
    };

    await onUpdateCampaign(updated);
    setNewClueTitle('');
    setNewClueDesc('');
    setNewClueDmNotes('');
    setShowAddClue(false);
  };

  const handleToggleCorrection = async (entry: CampaignKnowledgeEntry) => {
    const reason = window.prompt(
      'Motivo de la corrección o desmarcado:',
      entry.isCorrected ? '' : 'Improvisación anulada o confusión de jugadores'
    );
    if (reason === null) return;

    const updatedList = knowledgeEntries.map((k) =>
      k.id === entry.id
        ? {
            ...k,
            isCorrected: !k.isCorrected,
            correctionReason: !k.isCorrected ? reason : undefined,
          }
        : k
    );

    const updated: Campaign = {
      ...campaign,
      knowledgeEntries: updatedList,
      updatedAt: Date.now(),
    };

    await onUpdateCampaign(updated);
  };

  const handleSavePrepNotes = async () => {
    const updated: Campaign = {
      ...campaign,
      nextSessionNotes: editingNotes,
      updatedAt: Date.now(),
    };
    await onUpdateCampaign(updated);
    setSavedNotesStatus(true);
    setTimeout(() => setSavedNotesStatus(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content campaign-revelations-modal max-w-2xl bg-slate-950 border border-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-amber-400" size={20} />
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Diario de Revelaciones y Estado de Campaña
              </h2>
              <p className="text-[11px] text-slate-400">{campaign.title}</p>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 text-xs font-semibold px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'knowledge'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye size={13} />
            <span>Lo que saben ({knowledgeEntries.filter((k) => !k.isCorrected).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('world')}
            className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'world'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe size={13} />
            <span>Cómo quedó el mundo ({worldStateEntries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prep')}
            className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'prep'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList size={13} />
            <span>Pendiente próxima sesión</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
          {/* TAB 1: KNOWLEDGE */}
          {activeTab === 'knowledge' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyPlayerSummary}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5"
                  title="Copia el resumen filtrado sin secretos ni notas del DM"
                >
                  {copiedPlayerSummary ? <Check size={13} /> : <Copy size={13} />}
                  <span>
                    {copiedPlayerSummary ? '¡Copiado al portapapeles!' : 'Copiar Resumen para Jugadores'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddClue(!showAddClue)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Añadir Pista / Secreto</span>
                </button>
              </div>

              {/* Add Clue Form */}
              {showAddClue && (
                <form
                  onSubmit={handleAddManualClue}
                  className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2"
                >
                  <div className="font-bold text-amber-400 flex items-center gap-1">
                    <Plus size={12} />
                    <span>Nueva Pista Descubierta</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Título (ej. El colgante del culto)"
                      value={newClueTitle}
                      onChange={(e) => setNewClueTitle(e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 col-span-2"
                      required
                    />
                    <select
                      value={newClueType}
                      onChange={(e) => setNewClueType(e.target.value as KnowledgeType)}
                      className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200"
                    >
                      <option value="clue">Pista de la trama</option>
                      <option value="npc_identity">Identidad de NPC</option>
                      <option value="npc_appearance">Rostro de NPC</option>
                      <option value="secret">Secreto revelado</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Descripción pública de lo que descubrieron..."
                    value={newClueDesc}
                    onChange={(e) => setNewClueDesc(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 h-14"
                  />
                  <input
                    type="text"
                    placeholder="Notas privadas del DM (estrictamente confidenciales)..."
                    value={newClueDmNotes}
                    onChange={(e) => setNewClueDmNotes(e.target.value)}
                    className="w-full px-2 py-1 bg-purple-950/30 border border-purple-800/40 rounded text-purple-200"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddClue(false)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
                    >
                      Guardar Pista
                    </button>
                  </div>
                </form>
              )}

              {/* Entries List */}
              {knowledgeEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic bg-slate-900/30 rounded-lg border border-dashed border-slate-800">
                  Aún no se han registrado revelaciones ni pistas en esta campaña.
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledgeEntries.map((k) => (
                    <div
                      key={k.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        k.isCorrected
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-200">{k.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                              {k.type}
                            </span>
                            {k.source === 'auto_interaction' ? (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">
                                Automático
                              </span>
                            ) : (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                                DM
                              </span>
                            )}
                            {k.isCorrected && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 flex items-center gap-0.5">
                                <AlertCircle size={9} />
                                <span>Rectificado</span>
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 mt-1 leading-relaxed">{k.description}</p>
                          {k.dmPrivateNotes && (
                            <div className="mt-1.5 p-1.5 bg-purple-950/30 border border-purple-900/40 rounded text-purple-300 flex items-center gap-1">
                              <ShieldAlert size={11} className="shrink-0 text-purple-400" />
                              <span className="italic">Privado DM: {k.dmPrivateNotes}</span>
                            </div>
                          )}
                          {k.correctionReason && (
                            <p className="text-[10px] text-rose-400/80 mt-1 italic">
                              Motivo corrección: {k.correctionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock size={10} />
                            <span>{new Date(k.revealedAt).toLocaleDateString()}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleCorrection(k)}
                            className="text-[10px] text-slate-400 hover:text-slate-200 underline mt-1"
                          >
                            {k.isCorrected ? 'Restaurar' : 'Rectificar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WORLD STATE */}
          {activeTab === 'world' && (
            <div className="space-y-3">
              <p className="text-slate-400 text-[11px]">
                Estado actual y persistente de props interactivos (puertas, antorchas, cofres) guardado entre sesiones.
              </p>
              {worldStateEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic bg-slate-900/30 rounded-lg border border-dashed border-slate-800">
                  No hay cambios de estado del mundo guardados todavía.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
                  {worldStateEntries.map((w) => (
                    <div key={w.id} className="p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-200 block">{w.targetName}</span>
                        <span className="text-[10px] text-slate-400">
                          Modificado: {new Date(w.lastModifiedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
                          {w.state}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                          {w.scope}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PREP FOR NEXT SESSION */}
          {activeTab === 'prep' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ClipboardList size={13} className="text-purple-400" />
                  <span>Cuaderno de Preparación para la Próxima Partida</span>
                </span>
                <button
                  type="button"
                  onClick={handleSavePrepNotes}
                  className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-slate-100 font-bold flex items-center gap-1"
                >
                  {savedNotesStatus ? <Check size={12} /> : null}
                  <span>{savedNotesStatus ? '¡Guardado!' : 'Guardar Notas'}</span>
                </button>
              </div>
              <p className="text-slate-400 text-[11px]">
                Anota aquí hilos pendientes, decisiones que los jugadores deben tomar, encuentros a desplegar y precarga de escenas.
              </p>
              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Ej. Los jugadores acordaron descansar antes de abrir el sarcófago de la cripta. Preparar la escena del templo subterráneo y precargar la puerta en estado abierto..."
                className="w-full h-48 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
