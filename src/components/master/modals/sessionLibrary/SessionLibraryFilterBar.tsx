import React from 'react';
import type { Campaign } from '../../../../types';
import type { LibraryTab } from './types';
import { TAB_LABELS } from './types';
import {
  Plus,
  Search,
  X,
  FileText,
  PlayCircle,
  CheckCircle2,
  Archive,
  Trash2,
  FolderSync,
  Tag,
} from 'lucide-react';

const TAB_STATUS_ICONS: Record<LibraryTab, React.ReactNode> = {
  preparing: <FileText size={14} />,
  active: <PlayCircle size={14} />,
  completed: <CheckCircle2 size={14} />,
  archived: <Archive size={14} />,
  trash: <Trash2 size={14} />,
};

export interface SessionLibraryFilterBarProps {
  activeTab: LibraryTab;
  onSelectTab: (tab: LibraryTab) => void;
  tabCounts: Record<LibraryTab, number>;
  newSessionName: string;
  onChangeNewSessionName: (val: string) => void;
  onCreateNew: () => void;
  isCreatingNew: boolean;
  selectedCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
  currentCampaignId: string;
  campaignsList: Campaign[];
  searchQuery: string;
  onChangeSearchQuery: (val: string) => void;
  onClearSearchQuery: () => void;
  availableTags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  trashedCount: number;
  onEmptyTrashClick: () => void;
}

export const SessionLibraryFilterBar: React.FC<SessionLibraryFilterBarProps> = ({
  activeTab,
  onSelectTab,
  tabCounts,
  newSessionName,
  onChangeNewSessionName,
  onCreateNew,
  isCreatingNew,
  selectedCampaignId,
  onSelectCampaign,
  currentCampaignId,
  campaignsList,
  searchQuery,
  onChangeSearchQuery,
  onClearSearchQuery,
  availableTags,
  selectedTag,
  onSelectTag,
  trashedCount,
  onEmptyTrashClick,
}) => {
  return (
    <>
      {/* New Session Bar (only on preparing tab) */}
      {activeTab === 'preparing' && (
        <div className="session-library-new-bar">
          <input
            type="text"
            className="session-new-input"
            placeholder="Nombre de la nueva preparación…"
            value={newSessionName}
            onChange={(e) => onChangeNewSessionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCreateNew()}
            maxLength={60}
            aria-label="Nombre de la nueva sesión"
          />
          <button
            className="btn-create-session"
            onClick={onCreateNew}
            disabled={!newSessionName.trim() || isCreatingNew}
          >
            <Plus size={15} />
            <span>Nueva Preparación</span>
          </button>
        </div>
      )}

      {/* Filter & Search Bar with Campaign Selector */}
      <div className="session-library-filter-row">
        <div className="session-library-campaign-selector" title="Filtrar preparaciones por campaña">
          <FolderSync size={13} className="text-purple-400" />
          <select
            className="session-library-campaign-select"
            value={selectedCampaignId}
            onChange={(e) => onSelectCampaign(e.target.value)}
            aria-label="Filtrar por campaña"
          >
            <option value="all">Todas las campañas ({campaignsList.length})</option>
            {campaignsList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.id === currentCampaignId ? '(Actual)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="session-library-search-bar" style={{ flex: 1 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="session-search-input"
            placeholder="Buscar por nombre, notas, escenas o personajes…"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            aria-label="Buscar sesión"
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={onClearSearchQuery} aria-label="Limpiar búsqueda">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tag chips row if tags exist */}
      {availableTags.length > 0 && (
        <div className="session-library-tags-row">
          <Tag size={12} className="text-zinc-400" />
          <button
            className={`tag-chip ${!selectedTag ? 'active' : ''}`}
            onClick={() => onSelectTag(null)}
          >
            Todas las etiquetas
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Status Tabs Navigation */}
      <nav className="session-library-tabs" aria-label="Filtrar por estado">
        {(Object.keys(TAB_LABELS) as LibraryTab[]).map((tabKey) => {
          const count = tabCounts[tabKey];
          return (
            <button
              key={tabKey}
              className={`session-tab-btn ${activeTab === tabKey ? 'active' : ''} ${tabKey === 'trash' ? 'tab-trash' : ''}`}
              onClick={() => onSelectTab(tabKey)}
            >
              {TAB_STATUS_ICONS[tabKey]}
              <span>{TAB_LABELS[tabKey]}</span>
              {count > 0 && <span className="tab-count-badge">{count}</span>}
            </button>
          );
        })}
      </nav>

      {/* Trash header action */}
      {activeTab === 'trash' && trashedCount > 0 && (
        <div className="session-trash-banner">
          <span>Sesiones eliminadas (conservadas para evitar pérdidas accidentales).</span>
          <button className="btn-empty-trash" onClick={onEmptyTrashClick}>
            <Trash2 size={13} />
            <span>Vaciar papelera</span>
          </button>
        </div>
      )}
    </>
  );
};
