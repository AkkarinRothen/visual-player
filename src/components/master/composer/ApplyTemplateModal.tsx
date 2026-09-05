import React, { useState } from 'react';
import { Layout, Check, X, Shield } from 'lucide-react';
import {
  type SceneLayoutTemplate,
  TEMPLATE_RECOMMENDATIONS,
} from '../../../domain/display/sceneLayoutTemplates';

interface ApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: SceneLayoutTemplate;
  onConfirm: (options: { applyComposition: boolean; applyPresentation: boolean }) => void;
}

export const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  onConfirm,
}) => {
  const [applyComposition, setApplyComposition] = useState(true);
  const [applyPresentation, setApplyPresentation] = useState(true);

  if (!isOpen) return null;

  const rec = TEMPLATE_RECOMMENDATIONS[template];

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
          maxWidth: '440px',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <Layout size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Plantilla Rápida
              </div>
              <strong style={{ fontSize: '1.05rem', color: '#fbbf24' }}>
                {rec.title}
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

        {/* Descripción de la plantilla */}
        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.45, margin: 0 }}>
          {rec.description}
        </p>

        {/* Casillas de capas desacopladas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '10px 12px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={applyComposition}
              onChange={(e) => setApplyComposition(e.target.checked)}
              style={{ marginTop: '3px', accentColor: '#fbbf24' }}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.84rem', color: '#fff' }}>
                Aplicar Composición Física
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Acomoda las figuras en el escenario (posiciones X/Y, escalas y reflejos de bando).
              </span>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '10px 12px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={applyPresentation}
              onChange={(e) => setApplyPresentation(e.target.checked)}
              style={{ marginTop: '3px', accentColor: '#fbbf24' }}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.84rem', color: '#fff' }}>
                Aplicar Recomendaciones de Presentación
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Configura sombras de suelo y formato de diálogo sugerido ({rec.suggestedPresentationMode}).
              </span>
            </div>
          </label>
        </div>

        {/* Aviso de seguridad */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '8px 10px',
            borderRadius: '8px',
          }}
        >
          <Shield size={14} style={{ flexShrink: 0 }} />
          <span>Se aplicará en borrador sin alterar combate, HP ni diálogos existentes.</span>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm({ applyComposition, applyPresentation });
              onClose();
            }}
            disabled={!applyComposition && !applyPresentation}
            style={{
              flex: 1.4,
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: (applyComposition || applyPresentation) ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
              color: (applyComposition || applyPresentation) ? '#000' : '#64748b',
              fontSize: '0.85rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: (applyComposition || applyPresentation) ? 'pointer' : 'not-allowed',
            }}
          >
            <Check size={16} />
            <span>Aplicar Plantilla</span>
          </button>
        </div>
      </div>
    </div>
  );
};
