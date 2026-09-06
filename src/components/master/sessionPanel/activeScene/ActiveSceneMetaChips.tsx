import React from 'react';
import {
  Users,
  CloudRain,
  Sun,
  Volume2,
  BookOpen,
  Film,
  Wand2,
  FileText,
  Music,
} from 'lucide-react';
import type { Campaign, DisplayState, SceneSituation } from '../../../../types';

interface ActiveSceneMetaChipsProps {
  liveState: DisplayState;
  campaign: Campaign | null;
  onOpenLightingPresets?: () => void;
  onOpenRevelationJournal?: () => void;
  onOpenCampaignRecap?: () => void;
  onOpenSessionPrepWizard?: () => void;
  onOpenHandoutViewer?: () => void;
  onOpenBiomeSoundtrack?: () => void;
  onOpenChronicleExport?: () => void;
  onSelectSituation?: (situation: SceneSituation) => void;
}

export const ActiveSceneMetaChips: React.FC<ActiveSceneMetaChipsProps> = ({
  liveState,
  campaign,
  onOpenLightingPresets,
  onOpenRevelationJournal,
  onOpenCampaignRecap,
  onOpenSessionPrepWizard,
  onOpenHandoutViewer,
  onOpenBiomeSoundtrack,
  onOpenChronicleExport,
  onSelectSituation,
}) => {
  return (
    <>
      {/* Quick Scene Info Chips */}
      <div className="scene-meta-chips-row">
        <span className="scene-chip">
          <Users size={12} />
          <span>{liveState.characters.length} NPCs</span>
        </span>
        <span className="scene-chip">
          <CloudRain size={12} />
          <span>
            {liveState.weather !== 'none'
              ? `${liveState.weather} (${Math.round(liveState.weatherIntensity * 100)}%)`
              : 'Despejado'}
          </span>
        </span>
        <span className="scene-chip">
          <Sun size={12} />
          <span>{liveState.lighting}</span>
        </span>
        {onOpenLightingPresets && (
          <button
            type="button"
            onClick={onOpenLightingPresets}
            className="scene-chip text-amber-300 hover:text-amber-200 cursor-pointer bg-amber-950/40 border border-amber-800/40"
            title="Abrir Presets de Iluminación y Luces de Escena"
          >
            <Sun size={12} className="text-amber-400" />
            <span>Presets Luz ({liveState.lights?.length || 0})</span>
          </button>
        )}
        {liveState.ambientAudioUrl && (
          <span className={`scene-chip ${liveState.ambientPlaying ? 'audio-playing' : ''}`}>
            <Volume2 size={12} />
            <span>{liveState.ambientPlaying ? 'Sonando' : 'Pausado'}</span>
          </span>
        )}
        {onOpenRevelationJournal && (
          <button
            type="button"
            onClick={onOpenRevelationJournal}
            className="scene-chip text-amber-300 hover:text-amber-200 cursor-pointer bg-amber-950/40 border border-amber-800/40"
            title="Abrir Diario de Revelaciones y Estado de Campaña"
          >
            <BookOpen size={12} className="text-amber-400" />
            <span>
              Diario ({campaign?.knowledgeEntries?.filter((k) => !k.isCorrected).length || 0})
            </span>
          </button>
        )}
        {onOpenCampaignRecap && (
          <button
            type="button"
            onClick={onOpenCampaignRecap}
            className={`scene-chip cursor-pointer ${
              liveState.activeRecap
                ? 'text-purple-300 hover:text-purple-200 bg-purple-950/60 border border-purple-700/60 font-bold'
                : 'text-purple-400 hover:text-purple-300 bg-purple-950/30 border border-purple-800/40'
            }`}
            title="Abrir Crónica Cinematográfica de Apertura ('Anteriormente...')"
          >
            <Film size={12} className="text-purple-400" />
            <span>{liveState.activeRecap ? 'Crónica (En Mesa)' : 'Crónica'}</span>
          </button>
        )}
        {onOpenSessionPrepWizard && (
          <button
            type="button"
            onClick={onOpenSessionPrepWizard}
            className="scene-chip text-purple-300 hover:text-purple-200 cursor-pointer bg-purple-950/40 border border-purple-800/40"
            title="Abrir Asistente de Preparación de la Próxima Sesión"
          >
            <Wand2 size={12} className="text-purple-400" />
            <span>Preparar Sesión</span>
          </button>
        )}
        {onOpenHandoutViewer && (
          <button
            type="button"
            onClick={onOpenHandoutViewer}
            className={`scene-chip cursor-pointer ${
              liveState.activeHandout
                ? 'text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 border border-emerald-700/60 font-bold'
                : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 border border-emerald-800/40'
            }`}
            title="Abrir Visor de Handouts, Mapas y Documentos con Revelación Táctil"
          >
            <FileText size={12} className="text-emerald-400" />
            <span>
              {liveState.activeHandout ? 'Handout en Mesa' : 'Documentos'}
            </span>
          </button>
        )}
        {onOpenBiomeSoundtrack && (
          <button
            type="button"
            onClick={onOpenBiomeSoundtrack}
            className="scene-chip text-sky-300 hover:text-sky-200 cursor-pointer bg-sky-950/40 border border-sky-800/40"
            title="Gestor de Banda Sonora por Bioma y Situación"
          >
            <Music size={12} className="text-sky-400" />
            <span>Banda Sonora</span>
          </button>
        )}
        {onOpenChronicleExport && (
          <button
            type="button"
            onClick={onOpenChronicleExport}
            className="scene-chip text-emerald-300 hover:text-emerald-200 cursor-pointer bg-emerald-950/40 border border-emerald-800/40"
            title="Exportar Crónica y Diario de Sesión para Jugadores"
          >
            <FileText size={12} className="text-emerald-400" />
            <span>Exportar Crónica</span>
          </button>
        )}
      </div>

      {/* Tone / Situation Selector Row */}
      {onSelectSituation && (
        <div className="flex items-center gap-1.5 pt-1.5 pb-0.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
            <span>Tono:</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            {(
              [
                { id: 'exploration', label: '🧭 Exploración' },
                { id: 'tension', label: '⚡ Tensión' },
                { id: 'combat', label: '⚔️ Combate' },
                { id: 'rest', label: '🏕️ Descanso' },
              ] as { id: SceneSituation; label: string }[]
            ).map((sit) => {
              const isCurrent = (liveState.currentSituation || 'exploration') === sit.id;
              return (
                <button
                  key={sit.id}
                  type="button"
                  onClick={() => onSelectSituation(sit.id)}
                  className={`px-2 py-0.5 rounded font-medium transition-all ${
                    isCurrent
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sit.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
