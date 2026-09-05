import React from 'react';
import {
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
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { AndroidSheet } from '../../ui/AndroidSheet';
import { ActionTile } from '../../ui/ActionTile';

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
}) => (
  <AndroidSheet
    open
    title="Herramientas de mesa"
    eyebrow="Consola del DM"
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <Tabs.Root className="vp-tabs-root" defaultValue="publish">
      <Tabs.List className="vp-tabs-list" aria-label="Categorías de herramientas de mesa">
        <Tabs.Trigger className="vp-tab-trigger" value="publish">Publicar</Tabs.Trigger>
        <Tabs.Trigger className="vp-tab-trigger" value="scene">Escena</Tabs.Trigger>
        <Tabs.Trigger className="vp-tab-trigger" value="game">Partida</Tabs.Trigger>
        <Tabs.Trigger className="vp-tab-trigger" value="system">Sistema</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="publish">
        <section className="mobile-tools-section">
          <div className="mobile-tools-section-title"><Layers size={16} /> Publicación</div>
          <div className="mobile-tools-mode-toggle">
            <button type="button" className={operationMode === 'live' ? 'active live' : ''} onClick={() => onToggleOperationMode('live')}>En vivo</button>
            <button type="button" className={operationMode === 'staging' ? 'active staging' : ''} onClick={() => onToggleOperationMode('staging')}>Preparación</button>
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
          <ActionTile icon={<CheckCheck size={18} />} label="Revisar cambios" hint="Publicación selectiva" onClick={onSelectivePublish} tone="accent" />
        </section>
      </Tabs.Content>

      <Tabs.Content value="scene">
        <section className="mobile-tools-section">
          <div className="mobile-tools-section-title"><ImagePlus size={16} /> Escena</div>
          <div className="mobile-tools-grid">
            <ActionTile icon={<ImagePlus size={18} />} label="Mover personajes" hint="Fondo y composición" onClick={onOpenCompositor} />
            <ActionTile icon={<Camera size={18} />} label="Vista completa" hint="Previsualizar Mesa" onClick={onOpenFullScreenPreview} />
            <ActionTile icon={<Lightbulb size={18} />} label="Iluminación" onClick={onOpenLighting} />
            <ActionTile icon={<Music size={18} />} label="Música ambiental" onClick={onOpenSoundtrack} />
            <ActionTile icon={<Volume2 size={18} />} label="Panel de sonidos" onClick={onOpenSoundboard} />
            <ActionTile icon={<BookOpen size={18} />} label="Mostrar recurso" onClick={onOpenHandout} />
            <ActionTile icon={<RotateCcw size={18} />} label="Insertar preset" onClick={onOpenInsertPreset} />
            <ActionTile icon={<Sparkles size={18} />} label="Guardar preset" onClick={onOpenSavePreset} />
          </div>
        </section>
      </Tabs.Content>

      <Tabs.Content value="game">
        <section className="mobile-tools-section">
          <div className="mobile-tools-section-title"><Gamepad2 size={16} /> Partida</div>
          <div className="mobile-tools-grid">
            <ActionTile icon={<Gamepad2 size={18} />} label="Combate" hint="Iniciativa y turnos" onClick={() => { onClose(); onSelectTab('combat'); }} />
            <ActionTile icon={<Sparkles size={18} />} label="Momentos" hint="Macros y efectos" onClick={() => { onClose(); onSelectTab('moments'); }} />
            <ActionTile icon={<MessageSquare size={18} />} label="Diálogos" onClick={onOpenDialogue} />
            <ActionTile icon={<Flame size={18} />} label="Preparar sesión" onClick={onOpenPrep} />
            <ActionTile icon={<FileOutput size={18} />} label="Recap de campaña" onClick={onOpenRecap} />
            <ActionTile icon={<Clock3 size={18} />} label="Historial" onClick={onOpenHistory} />
            <ActionTile icon={<DatabaseBackup size={18} />} label="Puntos de control" onClick={onOpenCheckpoints} />
          </div>
        </section>
      </Tabs.Content>

      <Tabs.Content value="system">
        <section className="mobile-tools-section">
          <div className="mobile-tools-section-title"><Settings2 size={16} /> Sistema y campaña</div>
          <div className="mobile-tools-grid">
            <ActionTile icon={<Gamepad2 size={18} />} label="Modo Partida" hint="Pantalla activa y controles" onClick={onOpenPartyMode} />
            <ActionTile icon={<BarChart3 size={18} />} label="Diagnóstico" onClick={onOpenDiagnostics} />
            <ActionTile icon={<Library size={18} />} label="Biblioteca de sesiones" onClick={onOpenSessionLibrary} />
            {onOpenResourcePacks && (
              <ActionTile icon={<Package size={18} />} label="Packs de recursos" hint="Instalar tokens y mapas" onClick={onOpenResourcePacks} />
            )}
            <ActionTile icon={<Library size={18} />} label="Campaña" onClick={onOpenCampaign} />
          </div>
        </section>
      </Tabs.Content>
    </Tabs.Root>
  </AndroidSheet>
);
