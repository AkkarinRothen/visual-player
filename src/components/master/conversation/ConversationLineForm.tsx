import React from 'react';
import {
  Sparkles,
  Camera,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import type {
  Campaign,
  DialogueLine,
  DialogueStyle,
  DialogueCameraAction,
  Character,
} from '../../../types';

interface ConversationLineFormProps {
  selectedLineIndex: number;
  currentSelectedLine: DialogueLine;
  campaign: Campaign;
  selectedCharTemplate?: Character;
  updateSelectedLine: (updates: Partial<DialogueLine>) => void;
}

export const ConversationLineForm: React.FC<ConversationLineFormProps> = ({
  selectedLineIndex,
  currentSelectedLine,
  campaign,
  selectedCharTemplate,
  updateSelectedLine,
}) => {
  return (
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
              Texto extenso ({currentSelectedLine.text.length} car.). Recomendamos dividirlo en dos
              frases para una óptima legibilidad en tablets y pantallas compartidas.
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
  );
};
