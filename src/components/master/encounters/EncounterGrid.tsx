import React from 'react';
import { Plus, Swords } from 'lucide-react';
import type { EncounterGridProps } from './savedEncountersTypes';
import { EncounterCard } from './EncounterCard';

export const EncounterGrid: React.FC<EncounterGridProps> = ({
  encounters,
  onOpenCreate,
  onLaunchLive,
  onLaunchStaging,
  onEdit,
  onDelete,
}) => {
  return (
    <>
      <div className="encounters-top-bar">
        <span className="section-count">{encounters.length} encuentros guardados</span>
        <button className="btn-primary-sm" onClick={onOpenCreate}>
          <Plus size={14} />
          <span>+ Nuevo Encuentro</span>
        </button>
      </div>

      <div className="encounters-grid">
        {encounters.length === 0 ? (
          <div className="empty-history-box">
            <Swords size={36} className="text-slate-600 mb-2" />
            <p>No hay encuentros preparados en esta campaña.</p>
          </div>
        ) : (
          encounters.map((enc) => (
            <EncounterCard
              key={enc.id}
              encounter={enc}
              onLaunchLive={onLaunchLive}
              onLaunchStaging={onLaunchStaging}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </>
  );
};
