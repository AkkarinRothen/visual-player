import React, { useState } from 'react';
import { Play, X, Eye } from 'lucide-react';
import type {
  CharacterOnScreen,
  CinematicDialogue,
  DialoguePresentationMode,
  DialogueStyle,
  DialogueThemeId,
} from '../../../types';

interface ComposerDialogueQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChar: CharacterOnScreen;
  onRehearse: (dialogue: CinematicDialogue) => void;
  onPublish: (dialogue: CinematicDialogue) => void;
}

export const ComposerDialogueQuickModal: React.FC<ComposerDialogueQuickModalProps> = ({
  isOpen,
  onClose,
  selectedChar,
  onRehearse,
  onPublish,
}) => {
  const [text, setText] = useState('');
  const [themeId, setThemeId] = useState<DialogueThemeId>('default-gold');
  const [presentationMode, setPresentationMode] = useState<DialoguePresentationMode>('auto');
  const [style, setStyle] = useState<DialogueStyle>('speech');
  const [rehearsalActive, setRehearsalActive] = useState(false);

  if (!isOpen) return null;

  const buildDialoguePayload = (isCompleted = false): CinematicDialogue => ({
    id: `quick-dlg-${Date.now()}`,
    speakerInstanceId: selectedChar.id,
    speakerName: selectedChar.name,
    text: text.trim() || '...',
    avatarUrl: selectedChar.avatarUrl,
    activeExpression: selectedChar.activeExpression,
    style,
    visible: true,
    isCompleted,
    presentationMode,
    themeId,
  });

  const handleRehearse = () => {
    setRehearsalActive(true);
    onRehearse(buildDialoguePayload(false));
  };

  const handlePublish = () => {
    onPublish(buildDialoguePayload(false));
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con figura seleccionada */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={selectedChar.avatarUrl}
              alt=""
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #fbbf24',
              }}
            />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hacer hablar a
              </div>
              <strong style={{ fontSize: '1.05rem', color: '#fbbf24' }}>
                {selectedChar.name}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Campo de texto de la intervención */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
            Texto del diálogo o exclamación:
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí lo que dice el personaje..."
            rows={3}
            autoFocus
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '10px',
              color: '#fff',
              fontSize: '0.92rem',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Selectores de Formato y Tema */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Modo de Presentación */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
              Formato:
            </label>
            <select
              value={presentationMode}
              onChange={(e) => setPresentationMode(e.target.value as DialoguePresentationMode)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '6px 8px',
                color: '#fff',
                fontSize: '0.8rem',
              }}
            >
              <option value="auto">✨ Auto (Globo si cabe)</option>
              <option value="balloon">💬 Globo JRPG</option>
              <option value="visual-novel">📖 Novela Visual</option>
              <option value="subtitle">🎬 Subtítulo</option>
              <option value="narration">📜 Narración</option>
            </select>
          </div>

          {/* Tema Estético */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
              Tema Estético:
            </label>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value as DialogueThemeId)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '6px 8px',
                color: '#fff',
                fontSize: '0.8rem',
              }}
            >
              <option value="default-gold">👑 Dorado (VP)</option>
              <option value="classic-fantasy">⚔️ Fantasía Clásica</option>
              <option value="jrpg-retro">👾 JRPG Retro</option>
              <option value="cyber-modern">⚡ Cyber Neón</option>
              <option value="gothic-dark">🩸 Gótico Oscuro</option>
            </select>
          </div>
        </div>

        {/* Estilo de voz (Habla, Susurro, Grito) */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['speech', 'whisper', 'shout'] as DialogueStyle[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: style === s ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                background: style === s ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: style === s ? '#fbbf24' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s === 'speech' ? 'Habla' : s === 'whisper' ? 'Susurro' : '¡Grito!'}
            </button>
          ))}
        </div>

        {/* Acciones diferenciadas: Ensayar vs Publicar */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={handleRehearse}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Previsualizar solo en el dispositivo del DM sin enviar a la Mesa"
          >
            <Eye size={16} />
            <span>{rehearsalActive ? 'Actualizar Ensayo' : 'Ensayar (Local)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={!text.trim()}
            style={{
              flex: 1.2,
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: text.trim() ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
              color: text.trim() ? '#000' : '#64748b',
              fontSize: '0.85rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
            }}
            title="Lanzar a la pantalla de los jugadores en la Mesa"
          >
            <Play size={16} fill="currentColor" />
            <span>Publicar en Mesa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
