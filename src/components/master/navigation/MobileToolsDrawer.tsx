import React from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Camera,
  CheckCheck,
  Clock3,
  DatabaseBackup,
  FileOutput,
  Flame,
  Gamepad2,
  ImagePlus,
  Layers,
  Library,
  Lightbulb,
  MessageSquare,
  Music,
  Package,
  RotateCcw,
  Settings2,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

interface MobileToolsDrawerProps {
  operationMode: 'live' | 'staging';
  pendingChangesCount: number;
  onClose: () => void;
  onToggleOperationMode: (mode: 'live' | 'staging') => void;
  onPublish: () => void;
  onDiscard: () => void;
  onSelectivePublish: () => void;
  onOpenCompositor: () => void;
  onOpenFullScreenPreview: () => void;
  onOpenLighting: () => void;
  onOpenSoundboard: () => void;
  onOpenSoundtrack: () => void;
  onOpenHandout: () => void;
  onOpenDialogue: () => void;
  onOpenPrep: () => void;
  onOpenRecap: () => void;
  onOpenHistory: () => void;
  onOpenCheckpoints: () => void;
  onOpenDiagnostics: () => void;
  onOpenSessionLibrary: () => void;
  onOpenSavePreset: () => void;
  onOpenInsertPreset: () => void;
  onOpenPartyMode: () => void;
  onOpenCampaign: () => void;
  onOpenResourcePacks?: () => void;
  onSelectTab: (tab: 'moments' | 'combat' | 'notes' | 'library') => void;
}

const ToolButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, hint, onClick, danger }) => (
  <button type="button" className={`mobile-tools-action ${danger ? 'danger' : ''}`} onClick={onClick}>
    <span className="mobile-tools-action-icon">{icon}</span>
    <span className="mobile-tools-action-copy">
      <strong>{label}</strong>
      {hint && <small>{hint}</small>}
    </span>
    <ArrowRight size={15} aria-hidden="true" />
  </button>
);

export const MobileToolsDrawer: React.FC<MobileToolsDrawerProps> = ({
  operationMode,
  pendingChangesCount,
  onClose,
  onToggleOperationMode,
  onPublish,
  onDiscard,
  onSelectivePublish,
  onOpenCompositor,
  onOpenFullScreenPreview,
  onOpenLighting,
  onOpenSoundboard,
  onOpenSoundtrack,
  onOpenHandout,
  onOpenDialogue,
  onOpenPrep,
  onOpenRecap,
  onOpenHistory,
  onOpenCheckpoints,
  onOpenDiagnostics,
  onOpenSessionLibrary,
  onOpenSavePreset,
  onOpenInsertPreset,
  onOpenPartyMode,
  onOpenCampaign,
  onOpenResourcePacks,
  onSelectTab,
}) => createPortal(
  <div className="mobile-tools-overlay" role="presentation" onClick={onClose}>
    <section
      className="mobile-tools-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-tools-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mobile-tools-handle" aria-hidden="true" />
      <header className="mobile-tools-header">
        <div>
          <span className="mobile-tools-eyebrow">Consola del DM</span>
          <h2 id="mobile-tools-title">Herramientas de mesa</h2>
        </div>
        <button type="button" className="mobile-tools-close" onClick={onClose} aria-label="Cerrar herramientas de mesa">
          <X size={21} />
        </button>
      </header>

      <div className="mobile-tools-scroll">
        <section className="mobile-tools-section">
          <div className="mobile-tools-section-title"><Layers size={16} /> Publicación</div>
          <div className="mobile-tools-mode-toggle">
            <button type="button" className={operationMode === 'live' ? 'active live' : ''} onClick={() => onToggleOperationMode('live')}>⚡ En vivo</button>
            <button type="button" className={operationMode === 'staging' ? 'active staging' : ''} onClick={() => onToggleOperationMode('staging')}>🛠 Preparación</button>
          </div>
          {pendingChangesCount > 0 && (
            <div className="mobile-tools-pending-row">
              <span>{pendingChangesCount} cambio(s) pendiente(s)</span>
              <div>
                <button type="button" onClick={onPublish}>Publicar</button>
                <button type="button" onClick={onDiscard}>Descartar</button>
              </div>
            </div>
          )}
          <ToolButton icon={<CheckCheck size={18} />} label="Revisar cambios" hint="Publicación selectiva" onClick={onSelectivePublish} />
        </section>

        <section className="mobile-tools-section">
          <div className="mobile-tools-section-title"><ImagePlus size={16} /> Escena</div>
          <div className="mobile-tools-grid">
            <ToolButton icon={<ImagePlus size={18} />} label="Mover personajes" hint="Fondo y composición" onClick={onOpenCompositor} />
            <ToolButton icon={<Camera size={18} />} label="Vista completa" hint="Previsualizar Mesa" onClick={onOpenFullScreenPreview} />
            <ToolButton icon={<Lightbulb size={18} />} label="Iluminación" onClick={onOpenLighting} />
            <ToolButton icon={<Music size={18} />} label="Música ambiental" onClick={onOpenSoundtrack} />
            <ToolButton icon={<Volume2 size={18} />} label="Panel de sonidos" onClick={onOpenSoundboard} />
            <ToolButton icon={<BookOpen size={18} />} label="Mostrar recurso" onClick={onOpenHandout} />
            <ToolButton icon={<RotateCcw size={18} />} label="Insertar preset" onClick={onOpenInsertPreset} />
            <ToolButton icon={<Sparkles size={18} />} label="Guardar preset" onClick={onOpenSavePreset} />
          </div>
        </section>

        <section className="mobile-tools-section">
          <div className="mobile-tools-section-title"><Gamepad2 size={16} /> Partida</div>
          <div className="mobile-tools-grid">
            <ToolButton icon={<Gamepad2 size={18} />} label="Combate" hint="Iniciativa y turnos" onClick={() => { onClose(); onSelectTab('combat'); }} />
            <ToolButton icon={<Sparkles size={18} />} label="Momentos" hint="Macros y efectos" onClick={() => { onClose(); onSelectTab('moments'); }} />
            <ToolButton icon={<MessageSquare size={18} />} label="Diálogos" onClick={onOpenDialogue} />
            <ToolButton icon={<Flame size={18} />} label="Preparar sesión" onClick={onOpenPrep} />
            <ToolButton icon={<FileOutput size={18} />} label="Recap de campaña" onClick={onOpenRecap} />
            <ToolButton icon={<Clock3 size={18} />} label="Historial" onClick={onOpenHistory} />
            <ToolButton icon={<DatabaseBackup size={18} />} label="Puntos de control" onClick={onOpenCheckpoints} />
          </div>
        </section>

        <section className="mobile-tools-section">
          <div className="mobile-tools-section-title"><Settings2 size={16} /> Sistema y campaña</div>
          <div className="mobile-tools-grid">
            <ToolButton icon={<Gamepad2 size={18} />} label="Modo Partida" hint="Pantalla activa y controles" onClick={onOpenPartyMode} />
            <ToolButton icon={<BarChart3 size={18} />} label="Diagnóstico" onClick={onOpenDiagnostics} />
            <ToolButton icon={<Library size={18} />} label="Biblioteca de sesiones" onClick={onOpenSessionLibrary} />
            {onOpenResourcePacks && (
              <ToolButton icon={<Package size={18} />} label="Packs de recursos" hint="Instalar tokens y mapas" onClick={onOpenResourcePacks} />
            )}
            <ToolButton icon={<Library size={18} />} label="Campaña" onClick={onOpenCampaign} />
          </div>
        </section>
      </div>
    </section>
  </div>,
  document.body
);
