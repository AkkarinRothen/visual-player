import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Lock,
  Play,
  RotateCcw,
  RotateCw,
  Check,
  Eye,
  AlertTriangle,
  Sparkles,
  Camera,
} from 'lucide-react';
import type {
  Campaign,
  SavedConversation,
  DialogueLine,
  DialogueStyle,
  DialogueCameraAction,
} from '../../../types';
import { CinematicDialogueLayer } from '../../display/CinematicDialogueLayer';

interface ConversationEditorModalProps {
  isOpen: boolean;
  campaign: Campaign;
  conversation?: SavedConversation | null;
  onSave: (conversation: SavedConversation) => Promise<void>;
  onClose: () => void;
}

export const ConversationEditorModal: React.FC<ConversationEditorModalProps> = ({
  isOpen,
  campaign,
  conversation,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  // Title and Description
  const [title, setTitle] = useState<string>(() => conversation?.title || 'Nueva Conversación');
  const [description, setDescription] = useState<string>(() => conversation?.description || '');
  
  // Lines state
  const [lines, setLines] = useState<DialogueLine[]>(() => {
    if (conversation?.lines && conversation.lines.length > 0) {
      return JSON.parse(JSON.stringify(conversation.lines));
    }
    return [
      {
        id: `line-${Date.now()}-1`,
        speakerName: 'Narrador',
        text: 'La niebla se disipa revelando una silueta en el umbral...',
        style: 'narration',
      },
    ];
  });

  // Selected line index for editing
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0);

  // Undo / Redo history
  const [history, setHistory] = useState<DialogueLine[][]>([]);
  const [future, setFuture] = useState<DialogueLine[][]>([]);

  // Local Rehearsal / Ensayo mode
  const [isRehearsalMode, setIsRehearsalMode] = useState<boolean>(false);
  const [rehearsalIndex, setRehearsalIndex] = useState<number>(0);

  // Push to history before modifying lines
  const pushHistory = (newLines: DialogueLine[]) => {
    setHistory((prev) => [...prev.slice(-20), lines]);
    setFuture([]);
    setLines(newLines);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture((f) => [lines, ...f]);
    setHistory((h) => h.slice(0, -1));
    setLines(prev);
    if (selectedLineIndex >= prev.length) {
      setSelectedLineIndex(Math.max(0, prev.length - 1));
    }
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, lines]);
    setFuture((f) => f.slice(1));
    setLines(next);
  };

  // Add line
  const handleAddLine = () => {
    const newLine: DialogueLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      speakerName: campaign.characters[0]?.name || 'Narrador',
      speakerCharacterId: campaign.characters[0]?.id,
      avatarUrl: campaign.characters[0]?.defaultAvatarUrl,
      text: '',
      style: 'speech',
      autoFocusSpeaker: true,
    };
    const next = [...lines, newLine];
    pushHistory(next);
    setSelectedLineIndex(next.length - 1);
  };

  // Duplicate line
  const handleDuplicateLine = (index: number) => {
    const target = lines[index];
    if (!target) return;
    const duplicated: DialogueLine = {
      ...JSON.parse(JSON.stringify(target)),
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const next = [...lines.slice(0, index + 1), duplicated, ...lines.slice(index + 1)];
    pushHistory(next);
    setSelectedLineIndex(index + 1);
  };

  // Delete line
  const handleDeleteLine = (index: number) => {
    if (lines.length <= 1) return;
    const next = lines.filter((_, i) => i !== index);
    pushHistory(next);
    setSelectedLineIndex((prev) => Math.min(prev, next.length - 1));
  };

  // Move line Up / Down
  const handleMoveLine = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= lines.length) return;
    const next = [...lines];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    pushHistory(next);
    setSelectedLineIndex(targetIdx);
  };

  // Update field of selected line
  const updateSelectedLine = (updates: Partial<DialogueLine>) => {
    const next = lines.map((line, i) => (i === selectedLineIndex ? { ...line, ...updates } : line));
    pushHistory(next);
  };

  const currentSelectedLine = lines[selectedLineIndex] || lines[0];

  // Matching character for selected line
  const selectedCharTemplate = campaign.characters.find(
    (c) => c.id === currentSelectedLine?.speakerCharacterId
  );

  // Save handler
  const handleSave = async () => {
    if (!title.trim()) return;
    const saved: SavedConversation = {
      id: conversation?.id || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      sceneId: conversation?.sceneId,
      lines,
      createdAt: conversation?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await onSave(saved);
    onClose();
  };

  // Rehearsal mode dialogue projection object
  const rehearsalLine = lines[rehearsalIndex];
  const rehearsalDialogue = rehearsalLine
    ? {
        id: `reh-${rehearsalLine.id}`,
        speakerInstanceId: rehearsalLine.speakerCharacterId,
        speakerName: rehearsalLine.speakerName,
        text: rehearsalLine.text,
        avatarUrl: rehearsalLine.avatarUrl,
        activeExpression: rehearsalLine.activeExpression,
        style: rehearsalLine.style || 'speech',
        visible: true,
        autoFocusSpeaker: false,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <MessageSquare size={18} className="text-amber-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                {conversation ? 'Editar Conversación' : 'Nueva Conversación'}
              </h2>
              <span className="text-[11px] text-slate-400">
                Guión de intervenciones y diálogos cinematográficos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
              title="Deshacer"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
              title="Rehacer"
            >
              <RotateCw size={14} />
            </button>

            <button
              onClick={() => setIsRehearsalMode(!isRehearsalMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isRehearsalMode
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30'
              }`}
            >
              <Eye size={14} />
              <span>{isRehearsalMode ? 'Salir del Ensayo' : 'Modo Ensayo'}</span>
            </button>

            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md"
            >
              <Check size={14} />
              <span>Guardar</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT PANEL: CONVERSATION INFO & LINE LIST */}
          <div className="w-full md:w-5/12 border-r border-slate-800 flex flex-col bg-slate-950/40 shrink-0">
            {/* CONVERSATION TITLE & DESCRIPTION */}
            <div className="p-3 border-b border-slate-800 flex flex-col gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la conversación..."
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción o contexto para el DM (opcional)..."
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-slate-600"
              />
            </div>

            {/* LINES LIST HEADER */}
            <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Intervenciones ({lines.length})
              </span>
              <button
                onClick={handleAddLine}
                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold flex items-center gap-1"
              >
                <Plus size={12} />
                <span>Añadir</span>
              </button>
            </div>

            {/* LINES SCROLLABLE LIST */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
              {lines.map((line, idx) => {
                const isSelected = idx === selectedLineIndex;
                const isLong = line.text.length > 180;
                return (
                  <div
                    key={line.id}
                    onClick={() => setSelectedLineIndex(idx)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-md'
                        : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* AVATAR / ICON */}
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-black flex items-center justify-center">
                      {line.avatarUrl ? (
                        <img src={line.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <MessageSquare size={14} className="text-sky-400" />
                      )}
                    </div>

                    {/* LINE INFO */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {line.speakerName || 'Narrador'}
                        </span>
                        {line.style && line.style !== 'speech' && (
                          <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">
                            {line.style}
                          </span>
                        )}
                        {isLong && (
                          <span title="Texto extenso (>180 car.)">
                            <AlertTriangle size={11} className="text-amber-400" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 truncate italic">
                        {line.text ? `"${line.text}"` : <span className="text-slate-500">Vacío...</span>}
                      </p>
                    </div>

                    {/* REORDER & ACTION BUTTONS */}
                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleMoveLine(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-20 text-slate-400"
                        title="Subir"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        onClick={() => handleMoveLine(idx, 'down')}
                        disabled={idx === lines.length - 1}
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-20 text-slate-400"
                        title="Bajar"
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        onClick={() => handleDuplicateLine(idx)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Duplicar frase"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteLine(idx)}
                        disabled={lines.length <= 1}
                        className="p-1 rounded hover:bg-rose-900/50 disabled:opacity-20 text-slate-400 hover:text-rose-300"
                        title="Eliminar frase"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: SELECTED LINE DETAIL & LIVE REHEARSAL */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 overflow-y-auto p-3.5 sm:p-5">
            {isRehearsalMode ? (
              /* REHEARSAL / ENSAYO VIEW */
              <div className="flex-1 flex flex-col items-center justify-between gap-4 p-4 rounded-xl border border-purple-500/30 bg-slate-950/80">
                <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                    <Play size={14} />
                    <span>Modo Ensayo Local (Sin conexión a la Mesa)</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Frase {rehearsalIndex + 1} de {lines.length}
                  </span>
                </div>

                {/* SIMULATED PLAYER SCREEN WITH CINEMATIC DIALOGUE LAYER */}
                <div className="w-full h-64 sm:h-80 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex flex-col justify-end p-4">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                  <div className="absolute top-3 left-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Previsualización del Jugador
                  </div>
                  <CinematicDialogueLayer dialogue={rehearsalDialogue} />
                </div>

                {/* REHEARSAL STEP NAVIGATION */}
                <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setRehearsalIndex((prev) => Math.max(0, prev - 1))}
                    disabled={rehearsalIndex === 0}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold"
                  >
                    Anterior
                  </button>

                  <button
                    onClick={() => setRehearsalIndex(0)}
                    className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    Reiniciar
                  </button>

                  <button
                    onClick={() => setRehearsalIndex((prev) => Math.min(lines.length - 1, prev + 1))}
                    disabled={rehearsalIndex >= lines.length - 1}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-xs font-semibold"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : (
              /* LINE EDIT FORM */
              currentSelectedLine && (
                <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span>Intervención #{selectedLineIndex + 1}</span>
                    </h3>
                  </div>

                  {/* 1. SPEAKER PICKER & PUBLIC ALIAS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Hablante
                      </label>
                      <select
                        value={currentSelectedLine.speakerCharacterId || 'narrator'}
                        onChange={(e) => {
                          const charId = e.target.value;
                          if (charId === 'narrator') {
                            updateSelectedLine({
                              speakerCharacterId: undefined,
                              speakerName: 'Narrador',
                              avatarUrl: undefined,
                              style: 'narration',
                              activeExpression: undefined,
                            });
                          } else {
                            const char = campaign.characters.find((c) => c.id === charId);
                            updateSelectedLine({
                              speakerCharacterId: charId,
                              speakerName: char?.name || currentSelectedLine.speakerName,
                              avatarUrl: char?.defaultAvatarUrl,
                              style: 'speech',
                            });
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="narrator">Narrador (Sin personaje)</option>
                        {campaign.characters.map((char) => (
                          <option key={char.id} value={char.id}>
                            {char.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Alias Público (Visible en pantalla)
                      </label>
                      <input
                        type="text"
                        value={currentSelectedLine.speakerName || ''}
                        onChange={(e) => updateSelectedLine({ speakerName: e.target.value })}
                        placeholder="Ej. Grom, Figura Encapuchada..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* 2. STYLE SELECTOR & AUTO-FOCUS */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Estilo Visual
                      </label>
                      <div className="flex items-center gap-1.5">
                        {(['speech', 'narration', 'whisper', 'shout'] as DialogueStyle[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateSelectedLine({ style: st })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                              (currentSelectedLine.style || 'speech') === st
                                ? 'bg-amber-500 text-black font-bold'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {st === 'speech'
                              ? 'Normal'
                              : st === 'narration'
                              ? 'Narración'
                              : st === 'whisper'
                              ? 'Susurro'
                              : '¡Grito!'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-3">
                      <input
                        type="checkbox"
                        checked={currentSelectedLine.autoFocusSpeaker !== false}
                        onChange={(e) => updateSelectedLine({ autoFocusSpeaker: e.target.checked })}
                        className="rounded accent-amber-500"
                      />
                      <span>Foco visual automático del personaje</span>
                    </label>
                  </div>

                  {/* 3. EXPRESSION PICKER (IF CHARACTER HAS EXPRESSIONS) */}
                  {selectedCharTemplate?.expressions &&
                    Object.keys(selectedCharTemplate.expressions).length > 0 && (
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Expresión del retrato
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => updateSelectedLine({ activeExpression: undefined })}
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              !currentSelectedLine.activeExpression
                                ? 'bg-amber-500 text-black font-bold'
                                : 'bg-slate-950 border border-slate-800 text-slate-400'
                            }`}
                          >
                            Neutral
                          </button>
                          {Object.keys(selectedCharTemplate.expressions).map((expr) => (
                            <button
                              key={expr}
                              type="button"
                              onClick={() => updateSelectedLine({ activeExpression: expr })}
                              className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                                currentSelectedLine.activeExpression === expr
                                  ? 'bg-amber-500 text-black font-bold'
                                  : 'bg-slate-950 border border-slate-800 text-slate-400'
                              }`}
                            >
                              {expr}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 4. DIALOGUE TEXT AREA & LENGTH WARNING */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        Texto de la frase
                      </label>
                      <span
                        className={`text-[10px] font-mono ${
                          currentSelectedLine.text.length > 180 ? 'text-amber-400 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {currentSelectedLine.text.length} caracteres
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={currentSelectedLine.text}
                      onChange={(e) => updateSelectedLine({ text: e.target.value })}
                      placeholder="Escribe el diálogo que aparecerá en la Mesa..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                    {currentSelectedLine.text.length > 180 && (
                      <div className="flex items-center gap-1.5 text-amber-400/90 text-[11px] mt-1 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>
                          Texto extenso ({currentSelectedLine.text.length} car.). Recomendamos dividirlo en
                          dos frases para una óptima legibilidad en tablets y pantallas compartidas.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 5. LINKED SCENE ACTIONS (CAMERA, EXPRESSION, MOMENT) */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold">
                        <Sparkles size={12} className="text-amber-400" />
                        <span>Acciones de Puesta en Escena (Al enviar esta frase)</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Idempotente: se disparan una sola vez</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Camera Framing Preset */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                          <Camera size={11} />
                          <span>Encuadre de Cámara</span>
                        </label>
                        <select
                          value={currentSelectedLine.actions?.cameraPreset || 'none'}
                          onChange={(e) => {
                            const val = e.target.value as DialogueCameraAction;
                            updateSelectedLine({
                              actions: {
                                ...currentSelectedLine.actions,
                                cameraPreset: val === 'none' ? undefined : val,
                              },
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="none">Sin cambio de cámara</option>
                          <option value="general">Plano General (1.0x)</option>
                          <option value="speaker">Encuadrar Hablante</option>
                          <option value="group">Encuadrar Grupo</option>
                        </select>
                      </div>

                      {/* Linked Moment / Macro */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                          <Sparkles size={11} />
                          <span>Disparar Momento</span>
                        </label>
                        <select
                          value={currentSelectedLine.actions?.momentId || 'none'}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateSelectedLine({
                              actions: {
                                ...currentSelectedLine.actions,
                                momentId: val === 'none' ? undefined : val,
                              },
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="none">Ninguno</option>
                          {(campaign.macros || []).map((macro) => (
                            <option key={macro.id} value={macro.id}>
                              {macro.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 6. PRIVATE DM NOTES (STRICTLY EXCLUDED FROM MESA) */}
                  <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-300 text-[11px] font-bold">
                      <Lock size={12} />
                      <span>Notas Privadas del DM (Confidencial, NUNCA se proyectan en la Mesa)</span>
                    </div>
                    <textarea
                      rows={2}
                      value={currentSelectedLine.dmNotes || ''}
                      onChange={(e) => updateSelectedLine({ dmNotes: e.target.value })}
                      placeholder="Instrucciones para ti: tono de voz, tirada de engaño DC 14, consecuencias..."
                      className="w-full bg-slate-950 border border-indigo-950/60 rounded-lg p-2 text-xs text-indigo-100 placeholder:text-indigo-400/50 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
