import React from 'react';
import type { GameSessionTemplate } from '../../../../types';
import { BookTemplate, GitCompare, Plus } from 'lucide-react';
import { formatRelativeDate } from './types';

export interface SessionLibraryTemplatesSectionProps {
  templates: GameSessionTemplate[];
  hasCurrentSession: boolean;
  selectedCampaignId: string;
  campaignMap: Record<string, string>;
  onSelectGranularUpdate: (template: GameSessionTemplate) => void;
  onUseTemplate: (template: GameSessionTemplate) => void;
}

export const SessionLibraryTemplatesSection: React.FC<SessionLibraryTemplatesSectionProps> = ({
  templates,
  hasCurrentSession,
  selectedCampaignId,
  campaignMap,
  onSelectGranularUpdate,
  onUseTemplate,
}) => {
  if (templates.length === 0) return null;

  return (
    <div className="session-library-templates">
      <h3 className="session-library-section-title">
        <BookTemplate size={14} />
        Plantillas Limpias ({templates.length})
      </h3>
      <div className="session-templates-list">
        {templates.map((tpl) => (
          <div key={tpl.id} className="session-template-card">
            <div className="template-info">
              <div className="flex-align-gap">
                <span className="template-name">{tpl.name}</span>
                {selectedCampaignId === 'all' && campaignMap[tpl.campaignId] && (
                  <span className="session-card-campaign-badge">
                    {campaignMap[tpl.campaignId]}
                  </span>
                )}
              </div>
              {tpl.description && <span className="template-desc">{tpl.description}</span>}
              <span className="template-date">{formatRelativeDate(tpl.createdAt)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {hasCurrentSession && (
                <button
                  className="btn-use-template"
                  onClick={() => onSelectGranularUpdate(tpl)}
                  title="Comparar diferencias e incorporar selectivamente a tu preparación activa"
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    borderColor: 'rgba(139, 92, 246, 0.35)',
                    color: '#c4b5fd',
                  }}
                >
                  <GitCompare size={12} />
                  <span>Actualizar Sesión Activa</span>
                </button>
              )}
              <button
                className="btn-use-template"
                onClick={() => onUseTemplate(tpl)}
                title="Crear nueva sesión basada en esta plantilla para la campaña actual"
              >
                <Plus size={12} />
                <span>Usar Plantilla</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
