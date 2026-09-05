import React from 'react';
import { ArrowLeft, Save, Check, MoreVertical, Send, Image as ImageIcon } from 'lucide-react';

export interface ComposerHeaderProps {
  sceneName: string;
  setSceneName: (name: string) => void;
  draftStatus: 'saved' | 'saving';
  isSaving: boolean;
  showSecondaryMenu: boolean;
  setShowSecondaryMenu: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  onSave: () => void;
  onOpenTransfer: () => void;
  onOpenBackgroundPicker: () => void;
}

export const ComposerHeader: React.FC<ComposerHeaderProps> = ({
  sceneName,
  setSceneName,
  draftStatus,
  isSaving,
  showSecondaryMenu,
  setShowSecondaryMenu,
  onClose,
  onSave,
  onOpenTransfer,
  onOpenBackgroundPicker,
}) => {
  return (
    <header
      style={{
        height: '56px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '8px',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Volver"
        >
          <ArrowLeft size={18} />
        </button>

        <input
          type="text"
          value={sceneName}
          onChange={(e) => setSceneName(e.target.value)}
          placeholder="Nombre de la Escena"
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 700,
            padding: '4px 6px',
            flex: 1,
            minWidth: '100px',
            maxWidth: '220px',
            outline: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: draftStatus === 'saving' ? '#fbbf24' : '#10b981',
            background: 'rgba(255,255,255,0.04)',
            padding: '4px 8px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <Check size={12} />
          <span>{draftStatus === 'saving' ? 'Guardando...' : 'Borrador guardado'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          style={{
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.82rem',
            padding: '7px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: isSaving ? 'wait' : 'pointer',
            boxShadow: '0 2px 10px rgba(217, 119, 6, 0.4)',
            whiteSpace: 'nowrap',
          }}
          title="Guardar escena permanentemente en campaña"
        >
          <Save size={15} />
          <span>{isSaving ? '...' : 'Guardar'}</span>
        </button>

        {/* Menú secundario (...) */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowSecondaryMenu((v) => !v)}
            style={{
              background: showSecondaryMenu ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1',
              padding: '7px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Más acciones de la escena"
          >
            <MoreVertical size={16} />
          </button>

          {showSecondaryMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '210px',
                background: 'rgba(15, 23, 42, 0.98)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 999,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowSecondaryMenu(false);
                  onOpenTransfer();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fbbf24',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Send size={14} />
                <span>Añadir a preparación</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSecondaryMenu(false);
                  onOpenBackgroundPicker();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ImageIcon size={14} />
                <span>Cambiar fondo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
