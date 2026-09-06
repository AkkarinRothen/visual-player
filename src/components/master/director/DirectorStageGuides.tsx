import React from 'react';
import type { StageWaypoint } from '../../../types';
import type { SnapGuideLine } from './directorTypes';
import { MapPin } from 'lucide-react';

export interface DirectorStageGuidesProps {
  showWaypoints: boolean;
  showGuides: boolean;
  waypoints: StageWaypoint[];
  groundLineY?: number;
  snapGuideLines?: SnapGuideLine[];
  onWaypointClick: (waypoint: StageWaypoint) => void;
}

export const DirectorStageGuides: React.FC<DirectorStageGuidesProps> = ({
  showWaypoints,
  showGuides,
  waypoints,
  groundLineY = 0,
  snapGuideLines,
  onWaypointClick,
}) => {
  return (
    <>
      {/* ── VISIBLE NARRATIVE WAYPOINTS ── */}
      {(showWaypoints || showGuides) &&
        waypoints.map((wp) => (
          <div
            key={wp.id}
            data-testid={`director-waypoint-${wp.id}`}
            className="director-ui-element absolute -translate-x-1/2 translate-y-1/2 pointer-events-auto cursor-pointer z-30 group"
            style={{
              left: `${wp.normalizedX}%`,
              bottom: `${wp.normalizedY + (groundLineY || 0)}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onWaypointClick(wp);
            }}
            title={`Punto narrativo: ${wp.name}. Toca para mover la figura seleccionada aquí.`}
          >
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/90 border border-cyan-400/80 text-cyan-200 text-[10px] font-semibold shadow-xl group-hover:scale-110 group-hover:border-amber-400 group-hover:text-amber-300 transition-all">
              <MapPin size={11} className="text-amber-400" />
              <span>{wp.name}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 border border-slate-950 mx-auto mt-0.5 group-hover:bg-amber-400 shadow-sm" />
          </div>
        ))}

      {/* ── VISUAL GUIDES & SAFE MARGINS (Optional Overlay) ── */}
      {showGuides && (
        <>
          <div
            className="pointer-events-none absolute left-0 right-0 h-0.5 bg-amber-400/80 border-b border-amber-300 z-10 flex items-center justify-center transition-all"
            style={{ bottom: `${groundLineY || 0}%` }}
          >
            <span className="bg-slate-950/90 text-amber-300 text-[9px] px-2 py-0.5 rounded-t border border-b-0 border-amber-400/60 font-mono">
              Línea de suelo (Y = {groundLineY || 0}%)
            </span>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[64px] border-t border-dashed border-cyan-400/40 bg-cyan-950/15 z-0 flex items-start justify-end pr-2 pt-0.5">
            <span className="text-[9px] text-cyan-400/80 font-mono">
              Margen seguro: Diálogos y Nombres
            </span>
          </div>
          <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-0.5 border-r border-dashed border-amber-500/30 z-0" />
        </>
      )}

      {/* ── DYNAMIC MAGNETIC SNAP GUIDE LINES ── */}
      {snapGuideLines &&
        snapGuideLines.map((line, idx) =>
          line.axis === 'x' ? (
            <div
              key={`snap-x-${line.position}-${idx}`}
              data-testid={`snap-guide-x-${line.position}`}
              className="pointer-events-none absolute top-0 bottom-0 z-40 border-l-2 border-dashed border-rose-400/90 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
              style={{ left: `${line.position}%` }}
            >
              <div className="absolute top-12 -translate-x-1/2 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-400 text-rose-200 text-[9px] font-mono font-semibold shadow-lg whitespace-nowrap">
                {line.label}
              </div>
            </div>
          ) : (
            <div
              key={`snap-y-${line.position}-${idx}`}
              data-testid={`snap-guide-y-${line.position}`}
              className="pointer-events-none absolute left-0 right-0 z-40 border-b-2 border-dashed border-rose-400/90 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
              style={{ bottom: `${line.position + (groundLineY || 0)}%` }}
            >
              <div className="absolute right-4 -translate-y-1/2 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-400 text-rose-200 text-[9px] font-mono font-semibold shadow-lg whitespace-nowrap">
                {line.label}
              </div>
            </div>
          )
        )}
    </>
  );
};
