import React from 'react';
import type { GameSession } from '../../../../types';
import type { LibraryTab } from './types';
import { TAB_LABELS } from './types';
import { RefreshCw, Library } from 'lucide-react';
import { SessionCard } from './SessionCard';

export interface SessionLibraryListProps {
  isLoading: boolean;
  activeTab: LibraryTab;
  sessions: GameSession[];
  selectedCampaignId: string;
  campaignMap: Record<string, string>;
  activeMenuId: string | null;
  onToggleMenu: (sessionId: string) => void;
  getBackupStatus: (session: GameSession) => any;
  onLoadLive: (session: GameSession) => void;
  onLoadDraft: (session: GameSession) => void;
  onDuplicate: (session: GameSession) => void;
  onSaveTemplate: (session: GameSession) => void;
  onOpenCheckpoints: (session: GameSession) => void;
  onArchive: (sessionId: string) => void;
  onTrash: (sessionId: string) => void;
  onRestoreTrash: (sessionId: string) => void;
  onExport: (session: GameSession) => void;
  onDelete: (sessionId: string) => void;
  onPrepareNextSession: (session: GameSession) => void;
  onCreateForNewGroup: (session: GameSession) => void;
  onEvaluateReadiness: (session: GameSession) => void;
}

export const SessionLibraryList: React.FC<SessionLibraryListProps> = ({
  isLoading,
  activeTab,
  sessions,
  selectedCampaignId,
  campaignMap,
  activeMenuId,
  onToggleMenu,
  getBackupStatus,
  onLoadLive,
  onLoadDraft,
  onDuplicate,
  onSaveTemplate,
  onOpenCheckpoints,
  onArchive,
  onTrash,
  onRestoreTrash,
  onExport,
  onDelete,
  onPrepareNextSession,
  onCreateForNewGroup,
  onEvaluateReadiness,
}) => {
  return (
    <div
      className="session-library-list"
      role="region"
      aria-live="polite"
      aria-label={TAB_LABELS[activeTab]}
    >
      {isLoading ? (
        <div className="session-library-loading">
          <RefreshCw size={20} className="animate-spin" />
          <span>Cargando sesiones…</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="session-library-empty">
          <Library size={32} />
          <p>No hay sesiones en {TAB_LABELS[activeTab].toLowerCase()}</p>
          {activeTab === 'preparing' && (
            <p className="session-library-empty-hint">
              Crea una nueva preparación con el campo de arriba
            </p>
          )}
        </div>
      ) : (
        sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            activeTab={activeTab}
            backupStatus={getBackupStatus(session)}
            campaignTitle={selectedCampaignId === 'all' ? campaignMap[session.campaignId] : undefined}
            isMenuOpen={activeMenuId === session.id}
            onToggleMenu={() => onToggleMenu(session.id)}
            onLoadLive={() => onLoadLive(session)}
            onLoadDraft={() => onLoadDraft(session)}
            onDuplicate={() => onDuplicate(session)}
            onSaveTemplate={() => onSaveTemplate(session)}
            onOpenCheckpoints={() => onOpenCheckpoints(session)}
            onArchive={() => onArchive(session.id)}
            onTrash={() => onTrash(session.id)}
            onRestoreTrash={() => onRestoreTrash(session.id)}
            onExport={() => onExport(session)}
            onDelete={() => onDelete(session.id)}
            onPrepareNextSession={
              activeTab === 'active' || activeTab === 'completed'
                ? () => onPrepareNextSession(session)
                : undefined
            }
            onCreateForNewGroup={
              activeTab === 'active' || activeTab === 'completed'
                ? () => onCreateForNewGroup(session)
                : undefined
            }
            onEvaluateReadiness={() => onEvaluateReadiness(session)}
          />
        ))
      )}
    </div>
  );
};
