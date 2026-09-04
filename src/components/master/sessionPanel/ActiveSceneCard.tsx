import React from 'react';
import type {
  Campaign,
  DisplayState,
  Scene,
  SceneVariant,
  CameraTransform,
  SceneLight,
  SceneZoneEmitter,
  SceneInteraction,
  SceneInteractionTransition,
  DuckingPreset,
  LightningConfig,
  SceneSituation,
} from '../../../types';
import {
  Users,
  CloudRain,
  CloudLightning,
  Sun,
  Volume2,
  VolumeX,
  Music,
  Zap,
  Activity,
  Sliders,
  Camera,
  Maximize2,
  Flame,
  Eye,
  EyeOff,
  BookOpen,
  Wand2,
  Mic,
  FileText,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { calculateGroupFraming } from '../../../domain/display/cameraFraming';
import { SceneInteractionsToolbar } from './SceneInteractionsToolbar';

export interface ActiveSceneCardProps {
  liveState: DisplayState;
  activeScene: Scene | null;
  campaign: Campaign | null;
  onToggleBanner: () => void;
  onTriggerLightning: () => void;
  onTriggerShake: () => void;
  onToggleAmbientAudio: () => void;
  onToggleAutoStorm?: () => void;
  lightningConfig?: LightningConfig;
  onToggleDisableFlash?: () => void;
  onToggleDmSpeakingDucked?: () => void;
  onSelectDuckingPreset?: (preset: DuckingPreset) => void;
  onOpenCompositor?: () => void;
  onOpenSoundboard?: () => void;
  onSetCameraTransform?: (transform: CameraTransform) => void;
  onResetCamera?: () => void;
  onUpdateSceneLights?: (lights: SceneLight[]) => void;
  onUpdateZoneEmitters?: (emitters: SceneZoneEmitter[]) => void;
  onSelectSceneVariant?: (variant: SceneVariant) => void;
  onRevealCharacterAppearance?: (characterId: string) => void;
  onRevealCharacterIdentity?: (characterId: string) => void;
  onTriggerInteraction?: (
    interaction: SceneInteraction,
    transition: SceneInteractionTransition
  ) => Promise<void> | void;
  executingInteractionId?: string | null;
  onOpenLightingPresets?: () => void;
  onOpenRevelationJournal?: () => void;
  onOpenCampaignRecap?: () => void;
  onOpenSessionPrepWizard?: () => void;
  onOpenHandoutViewer?: () => void;
  onOpenBiomeSoundtrack?: () => void;
  onOpenChronicleExport?: () => void;
  onSelectSituation?: (situation: SceneSituation) => void;
}

export const ActiveSceneCard: React.FC<ActiveSceneCardProps> = ({
  liveState,
  activeScene,
  campaign,
  onToggleBanner,
  onTriggerLightning,
  onTriggerShake,
  onToggleAmbientAudio,
  onToggleAutoStorm,
  lightningConfig,
  onToggleDisableFlash,
  onToggleDmSpeakingDucked,
  onSelectDuckingPreset,
  onOpenCompositor,
  onOpenSoundboard,
  onSetCameraTransform,
  onResetCamera,
  onUpdateSceneLights,
  onUpdateZoneEmitters,
  onSelectSceneVariant,
  onRevealCharacterAppearance,
  onRevealCharacterIdentity,
  onTriggerInteraction,
  executingInteractionId,
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
    <section className="session-card active-scene-card">
      <div className="card-header-bar">
        <div className="flex-align-gap">
          <span className="live-dot animate-pulse" />
          <h2 className="card-title">ESCENA EN MESA</h2>
        </div>
        {liveState.isBlackout && (
          <span className="card-tag blackout-tag">BLACKOUT ACTIVO</span>
        )}
      </div>

      <div className="scene-display-preview">
        <div
          className="scene-preview-bg"
          style={{
            backgroundImage: liveState.backgroundUrl ? `url(${liveState.backgroundUrl})` : 'none',
          }}
        >
          <div className="scene-preview-overlay">
            <span className="scene-name-overlay">{liveState.sceneName || 'Sin Escenario'}</span>
            {liveState.locationBanner.visible && (
              <span className="scene-banner-sub">
                Banner: "{liveState.locationBanner.text}"
              </span>
            )}
          </div>
        </div>
      </div>

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

      {/* Quick Scene Action Buttons */}
      <div className="scene-quick-actions-row">
        <button
          className={`scene-action-btn ${liveState.locationBanner.visible ? 'active' : ''}`}
          onClick={onToggleBanner}
          title="Mostrar u ocultar título del lugar a los jugadores"
        >
          <ImageIcon size={14} />
          <span>{liveState.locationBanner.visible ? 'Ocultar Cartel' : 'Mostrar Cartel'}</span>
        </button>

        <button
          className="scene-action-btn"
          onClick={onTriggerLightning}
          title="Disparar relámpago inmediato con trueno sincronizado"
        >
          <Zap size={14} className="text-sky-400" />
          <span>Rayo</span>
        </button>

        {onToggleAutoStorm && (
          <button
            className={`scene-action-btn ${
              lightningConfig?.enabled
                ? 'active !bg-sky-950/60 !border-sky-500/70 !text-sky-300'
                : ''
            }`}
            onClick={onToggleAutoStorm}
            title="Activar/Pausar cadencia automática de relámpagos estocásticos según el clima"
          >
            <CloudLightning
              size={14}
              className={lightningConfig?.enabled ? 'text-sky-400 animate-pulse' : 'text-slate-400'}
            />
            <span>{lightningConfig?.enabled ? 'Tormenta Activa' : 'Auto-Tormenta'}</span>
          </button>
        )}

        {lightningConfig?.enabled && onToggleDisableFlash && (
          <button
            className={`scene-action-btn ${
              lightningConfig?.disableFlashes ? 'active !bg-amber-950/50 !text-amber-300' : ''
            }`}
            onClick={onToggleDisableFlash}
            title="Modo fotosensible: suprime destellos brillantes en pantalla manteniendo el sonido del trueno"
          >
            <EyeOff
              size={14}
              className={lightningConfig?.disableFlashes ? 'text-amber-400' : 'text-slate-400'}
            />
            <span>{lightningConfig?.disableFlashes ? 'Sin Destellos' : 'Con Destellos'}</span>
          </button>
        )}

        <button
          className="scene-action-btn"
          onClick={onTriggerShake}
          title="Temblor visual de pantalla"
        >
          <Activity size={14} className="text-amber-400" />
          <span>Temblor</span>
        </button>

        {liveState.ambientAudioUrl && (
          <button
            className={`scene-action-btn ${liveState.ambientPlaying ? 'playing' : ''}`}
            onClick={onToggleAmbientAudio}
            title="Pausar / Reanudar música ambiental de la escena"
          >
            {liveState.ambientPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{liveState.ambientPlaying ? 'Pausar Música' : 'Sonar Música'}</span>
          </button>
        )}

        {onToggleDmSpeakingDucked && (
          <button
            className={`scene-action-btn ${
              liveState.isDmSpeakingDucked
                ? 'active !bg-amber-950/60 !border-amber-500/80 !text-amber-300'
                : ''
            }`}
            onClick={onToggleDmSpeakingDucked}
            title="Atenuación inteligente de fondo ('ducking') para hablar/narrar con claridad sin distorsión"
          >
            <Mic
              size={14}
              className={
                liveState.isDmSpeakingDucked
                  ? 'text-amber-400 animate-pulse'
                  : 'text-slate-400'
              }
            />
            <span>{liveState.isDmSpeakingDucked ? 'Hablando (Ducked)' : 'Hablar'}</span>
          </button>
        )}

        {onSelectDuckingPreset && (
          <select
            value={liveState.duckingProfile?.preset || 'narration'}
            onChange={(e) => onSelectDuckingPreset(e.target.value as DuckingPreset)}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-1 text-[11px] cursor-pointer"
            title="Perfil de atenuación ('ducking') de audio"
          >
            <option value="gentle">Atenuación Suave (-35%)</option>
            <option value="narration">Narración (-65%)</option>
            <option value="intense">Atenuación Intensa (-85%)</option>
          </select>
        )}

        {onOpenCompositor && (
          <button
            className="scene-action-btn compositor-btn"
            onClick={onOpenCompositor}
            title="Abrir Compositor Táctil de Personajes"
          >
            <Sliders size={14} className="text-purple-400" />
            <span>Compositor</span>
          </button>
        )}

        {onOpenSoundboard && (
          <button
            className="scene-action-btn"
            onClick={onOpenSoundboard}
            title="Abrir Soundboard: Matriz rápida de efectos de sonido táctiles"
          >
            <Volume2 size={14} className="text-amber-400" />
            <span>SFX Pad</span>
          </button>
        )}
      </div>

      {/* Camera Framing Quick Actions */}
      {onSetCameraTransform && (
        <div className="camera-framing-row flex items-center gap-1.5 pt-2 pb-1 border-t border-slate-800/80 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0">
            <Camera size={12} className="text-amber-400" />
            <span>Cámara:</span>
          </span>

          <button
            type="button"
            className={`px-2 py-0.5 rounded font-semibold shrink-0 ${
              (liveState.camera?.zoom ?? 1) <= 1.05
                ? 'bg-amber-500 text-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            onClick={() =>
              onResetCamera
                ? onResetCamera()
                : onSetCameraTransform({ focalPoint: { x: 50, y: 50 }, zoom: 1.0 })
            }
            title="Plano General (1.0x)"
          >
            Plano General
          </button>

          {liveState.characters.length > 0 && (
            <button
              type="button"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold shrink-0"
              onClick={() => {
                const speaking =
                  liveState.characters.find((c) => c.isSpeaking) || liveState.characters[0];
                if (speaking) {
                  const targetX = speaking.normalizedX ?? 50;
                  const targetY = Math.max(25, (speaking.normalizedY ?? 50) - 15);
                  onSetCameraTransform({ focalPoint: { x: targetX, y: targetY }, zoom: 1.45 });
                }
              }}
              title="Encuadrar al personaje que habla"
            >
              Encuadrar Hablante
            </button>
          )}

          {liveState.characters.length >= 2 && (
            <button
              type="button"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold shrink-0"
              onClick={() => {
                const framing = calculateGroupFraming(liveState.characters, {
                  hasActiveDialogue: !!liveState.dialogue?.visible,
                  hasActiveInitiative: !!liveState.combatState?.isActive,
                  hasActiveBanner: !!liveState.locationBanner?.visible,
                });
                onSetCameraTransform(framing.camera);
              }}
              title="Encuadrar grupo completo calculando caja envolvente y safe areas de diálogos e iniciativa"
            >
              Encuadrar Grupo
            </button>
          )}

          {(liveState.camera?.zoom ?? 1) > 1.05 && (
            <button
              type="button"
              className="px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-semibold shrink-0 flex items-center gap-0.5"
              onClick={() =>
                onResetCamera
                  ? onResetCamera()
                  : onSetCameraTransform({ focalPoint: { x: 50, y: 50 }, zoom: 1.0 })
              }
              title="Restablecer cámara a posición original"
            >
              <Maximize2 size={10} />
              <span>Restablecer</span>
            </button>
          )}

          {/* Quick Scene Lights Toggle */}
          {liveState.lights && liveState.lights.length > 0 && onUpdateSceneLights && (
            <button
              type="button"
              className={`px-2 py-0.5 rounded font-semibold shrink-0 flex items-center gap-1 ${
                liveState.lights.some((l) => l.visible)
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
              onClick={() => {
                const anyVisible = liveState.lights?.some((l) => l.visible);
                const updated = (liveState.lights || []).map((l) => ({
                  ...l,
                  visible: !anyVisible,
                }));
                onUpdateSceneLights(updated);
              }}
              title="Encender o apagar luces localizadas de la escena"
            >
              <Flame
                size={11}
                className={
                  liveState.lights.some((l) => l.visible) ? 'text-amber-400 animate-pulse' : ''
                }
              />
              <span>Luces ({liveState.lights.filter((l) => l.visible).length})</span>
            </button>
          )}

          {/* Quick Zone Emitters Toggle */}
          {liveState.emitters && liveState.emitters.length > 0 && onUpdateZoneEmitters && (
            <button
              type="button"
              className={`px-2 py-0.5 rounded font-semibold shrink-0 flex items-center gap-1 ${
                liveState.emitters.some((e) => e.enabled)
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
              onClick={() => {
                const anyEnabled = liveState.emitters?.some((e) => e.enabled);
                const updated = (liveState.emitters || []).map((e) => ({
                  ...e,
                  enabled: !anyEnabled,
                }));
                onUpdateZoneEmitters(updated);
              }}
              title="Activar o desactivar emisores atmosféricos de la escena"
            >
              <CloudRain
                size={11}
                className={
                  liveState.emitters.some((e) => e.enabled) ? 'text-sky-400 animate-pulse' : ''
                }
              />
              <span>Ambiente ({liveState.emitters.filter((e) => e.enabled).length})</span>
            </button>
          )}
        </div>
      )}

      {/* Quick Scene Variants Chips */}
      {activeScene?.variants && activeScene.variants.length > 0 && (
        <div className="scene-variants-row">
          <span className="variants-tag">Variantes:</span>
          <div className="variants-chips-scroll">
            {activeScene.variants.map((v) => {
              const isActive =
                liveState.activeVariantId === v.id ||
                (!liveState.activeVariantId && liveState.backgroundUrl === v.backgroundUrl);
              return (
                <button
                  key={v.id}
                  className={`variant-pill ${isActive ? 'active-variant' : ''}`}
                  onClick={() => onSelectSceneVariant?.(v)}
                  title={`Cambiar a variante "${v.name}"`}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Progressive Disclosure / Revelations of Characters */}
      {liveState.characters.some(
        (c) =>
          c.revelation &&
          (!c.revelation.isAppearanceRevealed || !c.revelation.isIdentityRevealed)
      ) && (
        <div className="scene-revelations-row flex items-center gap-2 overflow-x-auto py-1.5 px-2 bg-slate-950/70 border border-purple-900/40 rounded-lg text-xs mt-2">
          <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1 shrink-0">
            <Eye size={12} className="text-purple-400" />
            <span>Revelaciones:</span>
          </span>
          {liveState.characters
            .filter(
              (c) =>
                c.revelation &&
                (!c.revelation.isAppearanceRevealed || !c.revelation.isIdentityRevealed)
            )
            .map((char) => (
              <div
                key={char.id}
                className="flex items-center gap-1.5 bg-slate-900/90 border border-purple-800/30 rounded-lg p-1 shrink-0"
              >
                <span className="text-slate-300 text-[11px] font-semibold max-w-[100px] truncate">
                  {char.revelation?.isIdentityRevealed
                    ? char.name
                    : char.revelation?.publicAlias || 'Desconocido'}
                </span>
                {!char.revelation?.isAppearanceRevealed && onRevealCharacterAppearance && (
                  <button
                    type="button"
                    onClick={() => onRevealCharacterAppearance(char.id)}
                    className="px-1.5 py-0.5 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-700/50 text-purple-200 text-[10px] font-bold flex items-center gap-1"
                    title="Revelar rostro a los jugadores en la Mesa"
                  >
                    <Eye size={10} />
                    <span>Rostro</span>
                  </button>
                )}
                {!char.revelation?.isIdentityRevealed && onRevealCharacterIdentity && (
                  <button
                    type="button"
                    onClick={() => onRevealCharacterIdentity(char.id)}
                    className="px-1.5 py-0.5 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-700/50 text-amber-200 text-[10px] font-bold flex items-center gap-1"
                    title="Revelar nombre e identidad real a los jugadores"
                  >
                    <span>Nombre</span>
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* 3.6 SCENE INTERACTIONS TOOLBAR (1-TOUCH DECLARATIVE ACTIONS) */}
      <SceneInteractionsToolbar
        interactions={liveState.interactions}
        executingInteractionId={executingInteractionId}
        onTriggerInteraction={onTriggerInteraction}
      />
    </section>
  );
};
