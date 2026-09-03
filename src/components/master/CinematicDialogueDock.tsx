import React, { useState } from 'react';
import {
  MessageSquare,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Send,
  BookOpen,
  Plus,
  Edit3,
  Sparkles,
  Camera,
  AlertTriangle,
  RotateCw,
  GitBranch,
} from 'lucide-react';
import type {
  CharacterOnScreen,
  CinematicDialogue,
  DialogueStyle,
  SavedConversation,
  DialogueLineActions,
  DialogueBranchChoice,
  CinematicMacro,
} from '../../types';

interface CinematicDialogueDockProps {
  characters: CharacterOnScreen[];
  activeDialogue?: CinematicDialogue | null;
  savedConversations?: SavedConversation[];
  macros?: CinematicMacro[];
  onPublishDialogue: (
    dialogue: CinematicDialogue,
    actions?: DialogueLineActions,
    lineId?: string
  ) => Promise<void>;
  onDismissDialogue: () => Promise<void>;
  onCompleteDialogueText: () => Promise<void>;
  onOpenNewConversation?: () => void;
  onOpenEditConversation?: (conversation: SavedConversation) => void;
  onRepeatActions?: (actions: DialogueLineActions, lineId: string) => Promise<void>;
  executedActionLineIds?: Record<string, string>;
  onSelectBranchChoice?: (choice: DialogueBranchChoice) => void;
  selectedChoiceIds?: Record<string, string>;
}

export const CinematicDialogueDock: React.FC<CinematicDialogueDockProps> = ({
  characters,
  activeDialogue,
  savedConversations = [],
  macros = [],
  onPublishDialogue,
  onDismissDialogue,
  onCompleteDialogueText,
  onOpenNewConversation,
  onOpenEditConversation,
  onRepeatActions,
  executedActionLineIds = {},
  onSelectBranchChoice,
  selectedChoiceIds = {},
}) => {
  // Mode: 'quick' or 'playlist'
  const [mode, setMode] = useState<'quick' | 'playlist'>(() =>
    savedConversations.length > 0 ? 'playlist' : 'quick'
  );

  // Quick spontaneous dialogue state
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('narrator');
  const [quickText, setQuickText] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<DialogueStyle>('speech');
  const [autoFocusSpeaker, setAutoFocusSpeaker] = useState<boolean>(true);

  // Playlist session state
  const [activeConversationId, setActiveConversationId] = useState<string>(() =>
    savedConversations.length > 0 ? savedConversations[0].id : ''
  );
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const activeConversation = savedConversations.find((c) => c.id === activeConversationId);
  const currentLine = activeConversation?.lines[currentLineIndex];
  const nextLine = activeConversation?.lines[currentLineIndex + 1];

  // Selected speaker info for quick mode
  const selectedSpeaker = characters.find((c) => c.id === selectedSpeakerId);

  const handlePublishQuick = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickText.trim()) return;

    setIsPublishing(true);
    try {
      const isNarrator = selectedSpeakerId === 'narrator';
      const dialogue: CinematicDialogue = {
        id: `dlg-${Date.now()}`,
        speakerInstanceId: isNarrator ? undefined : selectedSpeakerId,
        speakerName: isNarrator ? undefined : selectedSpeaker?.name,
        avatarUrl: isNarrator ? undefined : selectedSpeaker?.avatarUrl,
        activeExpression: isNarrator ? undefined : selectedSpeaker?.activeExpression,
        text: quickText.trim(),
        style: isNarrator ? 'narration' : selectedStyle,
        visible: true,
        autoFocusSpeaker: isNarrator ? false : autoFocusSpeaker,
      };

      await onPublishDialogue(dialogue);
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishLine = async (lineIndex: number) => {
    if (!activeConversation || !activeConversation.lines[lineIndex]) return;

    const line = activeConversation.lines[lineIndex];
    setIsPublishing(true);
    try {
      // Resolve speaker from characters in scene if available
      const matchingSpeaker = characters.find(
        (c) => c.characterId === line.speakerCharacterId || c.name === line.speakerName
      );

      const dialogue: CinematicDialogue = {
        id: `dlg-${Date.now()}-${line.id}`,
        speakerInstanceId: matchingSpeaker?.id,
        speakerName: line.speakerName || matchingSpeaker?.name,
        avatarUrl: line.avatarUrl || matchingSpeaker?.avatarUrl,
        activeExpression: line.activeExpression || matchingSpeaker?.activeExpression,
        text: line.text,
        style: line.style || 'speech',
        visible: true,
        autoFocusSpeaker: line.autoFocusSpeaker ?? true,
      };

      await onPublishDialogue(dialogue, line.actions, line.id);
      setCurrentLineIndex(lineIndex);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleNextLine = () => {
    if (activeConversation && currentLineIndex + 1 < activeConversation.lines.length) {
      handlePublishLine(currentLineIndex + 1);
    }
  };

  const handlePrevLine = () => {
    if (currentLineIndex > 0) {
      handlePublishLine(currentLineIndex - 1);
    }
  };

  const isDialogueActive = !!activeDialogue?.visible;

  return (
    <div className="cinematic-dialogue-dock bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md">
      {/* HEADER WITH MODE TOGGLE AND ACTIVE STATUS */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Diálogos & Narración
          </h3>
          {isDialogueActive && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              En Mesa
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {savedConversations.length > 0 && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg text-[10px]">
              <button
                className={`px-2 py-0.5 rounded font-semibold ${
                  mode === 'playlist' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setMode('playlist')}
              >
                Guión
              </button>
              <button
                className={`px-2 py-0.5 rounded font-semibold ${
                  mode === 'quick' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setMode('quick')}
              >
                Rápido
              </button>
            </div>
          )}

          {isDialogueActive && (
            <button
              className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded text-[11px] font-semibold flex items-center gap-1"
              onClick={onDismissDialogue}
              title="Ocultar diálogo en la Mesa"
            >
              <EyeOff size={12} />
              <span>Ocultar</span>
            </button>
          )}
        </div>
      </div>

      {/* MODE 1: PLAYLIST / SAVED CONVERSATIONS */}
      {mode === 'playlist' && activeConversation && (
        <div className="flex flex-col gap-2.5">
          {/* CONVERSATION SELECTOR & ACTIONS */}
          <div className="flex items-center gap-1.5">
            {savedConversations.length > 0 && (
              <>
                <BookOpen size={13} className="text-slate-400 shrink-0" />
                <select
                  value={activeConversationId}
                  onChange={(e) => {
                    setActiveConversationId(e.target.value);
                    setCurrentLineIndex(0);
                  }}
                  className="bg-slate-950 border border-slate-800 text-xs rounded p-1 text-slate-200 flex-1 truncate"
                >
                  {savedConversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.lines.length} líneas)
                    </option>
                  ))}
                </select>
                {onOpenEditConversation && activeConversation && (
                  <button
                    type="button"
                    onClick={() => onOpenEditConversation(activeConversation)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Editar guión de esta conversación"
                  >
                    <Edit3 size={13} />
                  </button>
                )}
              </>
            )}
            {onOpenNewConversation && (
              <button
                type="button"
                onClick={onOpenNewConversation}
                className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 shrink-0"
                title="Crear nueva conversación"
              >
                <Plus size={12} />
                <span>Nuevo</span>
              </button>
            )}
          </div>

          {/* CURRENT INTERVENTION CARD */}
          {currentLine && (
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <span>{currentLine.speakerName || 'Narrador'}</span>
                  {currentLine.style && currentLine.style !== 'speech' && (
                    <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">
                      {currentLine.style}
                    </span>
                  )}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  {currentLineIndex + 1} / {activeConversation.lines.length}
                </span>
              </div>
              <p className="text-xs text-slate-200 italic leading-snug">"{currentLine.text}"</p>

              {/* ACTION CHIPS & REPEAT BUTTON */}
              {currentLine.actions && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1.5 mt-1.5 border-t border-slate-800/80">
                  {currentLine.actions.cameraPreset && currentLine.actions.cameraPreset !== 'none' && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-300 text-[10px] flex items-center gap-1 font-semibold">
                      <Camera size={10} />
                      <span className="capitalize">{currentLine.actions.cameraPreset}</span>
                    </span>
                  )}
                  {currentLine.actions.expression && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 text-[10px] font-semibold">
                      Expr: {currentLine.actions.expression}
                    </span>
                  )}
                  {currentLine.actions.momentId && (() => {
                    const macro = macros.find((m) => m.id === currentLine.actions?.momentId);
                    return macro ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 text-[10px] flex items-center gap-1 font-semibold">
                        <Sparkles size={10} />
                        <span>{macro.name}</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 text-[10px] flex items-center gap-1 font-semibold">
                        <AlertTriangle size={10} />
                        <span>Momento no encontrado</span>
                      </span>
                    );
                  })()}

                  {/* Repeat Actions Button */}
                  {executedActionLineIds[currentLine.id] && onRepeatActions && (
                    <button
                      type="button"
                      onClick={() => onRepeatActions(currentLine.actions!, currentLine.id)}
                      className="ml-auto text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/40 px-1.5 py-0.5 rounded font-semibold"
                      title="Volver a disparar los efectos y movimientos de esta frase"
                    >
                      <RotateCw size={9} />
                      <span>Repetir acciones</span>
                    </button>
                  )}
                </div>
              )}

              {/* BRANCHING CHOICES (PRIVATE DM DECISION) */}
              {currentLine.choices && currentLine.choices.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 mt-2 border-t border-purple-900/40 bg-purple-950/20 p-2 rounded-lg">
                  <div className="flex items-center gap-1.5 text-purple-300 text-[10px] font-bold">
                    <GitBranch size={11} className="text-purple-400" />
                    <span>Ramificación de la Conversación (Privado del DM)</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {currentLine.choices.map((choice) => {
                      const isSelected = selectedChoiceIds[currentLine.id] === choice.id;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => {
                            if (onSelectBranchChoice) {
                              onSelectBranchChoice(choice);
                            } else {
                              const targetIdx = activeConversation.lines.findIndex(
                                (l) => l.id === choice.targetLineId
                              );
                              if (targetIdx !== -1) {
                                handlePublishLine(targetIdx);
                              }
                            }
                          }}
                          className={`text-left text-[11px] p-1.5 rounded flex items-center justify-between border transition-colors ${
                            isSelected
                              ? 'bg-purple-600/30 border-purple-500 text-purple-100 font-bold'
                              : 'bg-slate-900/80 hover:bg-purple-950/40 border-purple-900/30 text-purple-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span>{choice.label}</span>
                          </div>
                          {choice.conditionNote && (
                            <span className="text-[9px] bg-slate-950/80 px-1.5 py-0.5 rounded text-amber-300 font-normal">
                              {choice.conditionNote}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NEXT INTERVENTION PRIVATE PREVIEW (LOCAL ONLY) */}
          {nextLine && (
            <div className="p-2 rounded-lg bg-slate-900/40 border border-dashed border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                  Siguiente (Privado): {nextLine.speakerName || 'Narrador'}
                </span>
                <p className="truncate italic">"{nextLine.text}"</p>
              </div>
              {nextLine.actions && (
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] font-semibold flex items-center gap-1">
                  <Sparkles size={9} />
                  <span>Acciones</span>
                </span>
              )}
            </div>
          )}

          {/* STEP CONTROLS: PREV, REVEAL/COMPLETE, NEXT */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <button
              className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs flex items-center gap-1"
              onClick={handlePrevLine}
              disabled={currentLineIndex === 0 || isPublishing}
            >
              <ChevronLeft size={14} />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                className="px-2.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1"
                onClick={onCompleteDialogueText}
                title="Mostrar el texto completo en la Mesa de inmediato"
              >
                <CheckCircle2 size={13} />
                <span>Completar</span>
              </button>

              <button
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1 shadow-md disabled:opacity-50"
                onClick={() => handlePublishLine(currentLineIndex)}
                disabled={isPublishing}
              >
                <Eye size={13} />
                <span>{isDialogueActive ? 'Actualizar' : 'Mostrar'}</span>
              </button>
            </div>

            <button
              className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs flex items-center gap-1"
              onClick={handleNextLine}
              disabled={currentLineIndex + 1 >= activeConversation.lines.length || isPublishing}
            >
              <span>Siguiente</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: QUICK SPONTANEOUS DIALOGUE */}
      {(mode === 'quick' || !activeConversation) && (
        <form onSubmit={handlePublishQuick} className="flex flex-col gap-2">
          {/* SPEAKER SELECTOR CHIPS */}
          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-1">Hablante</label>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                className={`px-2 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  selectedSpeakerId === 'narrator'
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => setSelectedSpeakerId('narrator')}
              >
                Narrador
              </button>

              {characters.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                    selectedSpeakerId === char.id
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  onClick={() => setSelectedSpeakerId(char.id)}
                >
                  <img src={char.avatarUrl} alt={char.name} className="w-4 h-4 rounded-full object-cover" />
                  <span className="truncate max-w-[90px]">{char.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STYLE CHIPS (ONLY FOR NON-NARRATOR) */}
          {selectedSpeakerId !== 'narrator' && (
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    selectedStyle === 'speech' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'
                  }`}
                  onClick={() => setSelectedStyle('speech')}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    selectedStyle === 'whisper' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                  onClick={() => setSelectedStyle('whisper')}
                >
                  Susurro
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    selectedStyle === 'shout' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                  onClick={() => setSelectedStyle('shout')}
                >
                  ¡Grito!
                </button>
              </div>

              <label className="flex items-center gap-1 text-slate-400 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFocusSpeaker}
                  onChange={(e) => setAutoFocusSpeaker(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>Foco visual</span>
              </label>
            </div>
          )}

          {/* TEXT INPUT + PUBLISH */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <input
              type="text"
              placeholder={
                selectedSpeakerId === 'narrator'
                  ? 'Escribe narración cinematográfica...'
                  : `Frase para ${selectedSpeaker?.name || 'personaje'}...`
              }
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!quickText.trim() || isPublishing}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs rounded-lg flex items-center gap-1 shadow-md shrink-0"
            >
              <Send size={13} />
              <span>Lanzar</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
