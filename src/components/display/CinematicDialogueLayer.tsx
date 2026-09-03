import React, { useState, useEffect } from 'react';
import { VolumeX, MessageSquare, AlertCircle } from 'lucide-react';
import type { CinematicDialogue } from '../../types';

interface CinematicDialogueLayerProps {
  dialogue?: CinematicDialogue | null;
}

export const CinematicDialogueLayer: React.FC<CinematicDialogueLayerProps> = ({ dialogue }) => {
  if (!dialogue || !dialogue.visible || !dialogue.text) {
    return null;
  }

  const [revealedChars, setRevealedChars] = useState<number>(() =>
    dialogue.isCompleted ? dialogue.text.length : 0
  );

  // Typewriter effect
  useEffect(() => {
    if (dialogue.isCompleted) {
      setRevealedChars(dialogue.text.length);
      return;
    }

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealedChars(dialogue.text.length);
      return;
    }

    setRevealedChars(0);
    const speedMs = dialogue.style === 'whisper' ? 35 : dialogue.style === 'shout' ? 20 : 25;

    const interval = setInterval(() => {
      setRevealedChars((prev) => {
        if (prev >= dialogue.text.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, speedMs);

    return () => clearInterval(interval);
  }, [dialogue.id, dialogue.text, dialogue.isCompleted, dialogue.style]);

  const handleSkipTypewriter = () => {
    setRevealedChars(dialogue.text.length);
  };

  const displayText = dialogue.text.slice(0, revealedChars);
  const isTyping = revealedChars < dialogue.text.length;

  const styleClasses = {
    speech: 'dialogue-style-speech border-amber-500/40 bg-slate-950/85',
    narration: 'dialogue-style-narration border-sky-500/30 bg-slate-950/80 text-center italic',
    whisper: 'dialogue-style-whisper border-indigo-400/30 bg-slate-950/75 italic opacity-90',
    shout: 'dialogue-style-shout border-rose-500/60 bg-slate-950/90 shadow-rose-950/50 shadow-2xl',
  }[dialogue.style || 'speech'];

  return (
    <div
      className="cinematic-dialogue-overlay pointer-events-auto select-none"
      onClick={handleSkipTypewriter}
      role="region"
      aria-label="Capa de Diálogo Cinematográfico"
      style={{
        position: 'fixed',
        bottom: '6%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '860px',
        zIndex: 42,
      }}
    >
      {/* Hidden container for full text screen readers */}
      <div className="sr-only" aria-live="polite">
        {dialogue.speakerName ? `${dialogue.speakerName}: ` : ''}
        {dialogue.text}
      </div>

      <div
        className={`dialogue-box relative flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 backdrop-blur-xl shadow-2xl transition-all duration-300 ${styleClasses}`}
      >
        {/* SPEAKER PORTRAIT (IF PRESENT AND STYLE IS NOT NARRATION) */}
        {dialogue.style !== 'narration' && dialogue.avatarUrl && (
          <div className="speaker-avatar-frame shrink-0 relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 border-amber-400/50 shadow-lg bg-black/60">
            <img
              src={dialogue.avatarUrl}
              alt={dialogue.speakerName || 'Hablante'}
              className="w-full h-full object-cover"
              loading="eager"
            />
            {dialogue.style === 'whisper' && (
              <div className="absolute top-1 right-1 bg-indigo-950/90 text-indigo-300 p-0.5 rounded">
                <VolumeX size={12} />
              </div>
            )}
            {dialogue.style === 'shout' && (
              <div className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded">
                <AlertCircle size={12} />
              </div>
            )}
          </div>
        )}

        {/* DIALOGUE CONTENT */}
        <div className="dialogue-content flex-1 min-w-0 flex flex-col justify-center">
          {/* SPEAKER BADGE / TITLE */}
          {dialogue.speakerName && dialogue.style !== 'narration' && (
            <div className="flex items-center gap-2 mb-1">
              <span className="speaker-name text-xs md:text-sm font-black text-amber-400 tracking-wide uppercase">
                {dialogue.speakerName}
              </span>
              {dialogue.activeExpression && (
                <span className="text-[11px] text-slate-400 italic">
                  ({dialogue.activeExpression})
                </span>
              )}
              {dialogue.style === 'whisper' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  Susurro
                </span>
              )}
              {dialogue.style === 'shout' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40 uppercase font-black tracking-wider">
                  ¡Grito!
                </span>
              )}
            </div>
          )}

          {/* NARRATION HEADER */}
          {dialogue.style === 'narration' && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-sky-400/80 uppercase tracking-widest font-semibold mb-1">
              <MessageSquare size={13} />
              <span>Narración</span>
            </div>
          )}

          {/* TEXT CONTENT WITH SMOOTH TYPEWRITER */}
          <div
            className={`dialogue-text leading-relaxed text-slate-100 ${
              dialogue.style === 'shout' ? 'font-bold uppercase tracking-wide text-rose-100' : ''
            }`}
            style={{
              fontSize:
                dialogue.fontSize === 'large'
                  ? '1.35rem'
                  : dialogue.fontSize === 'small'
                  ? '0.95rem'
                  : '1.15rem',
            }}
          >
            {displayText}
            {isTyping && (
              <span className="typewriter-cursor inline-block w-1.5 h-4 ml-0.5 bg-amber-400 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
