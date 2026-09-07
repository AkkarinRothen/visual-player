import React, { useState } from 'react';
import {
  BookOpen,
  Clock3,
  Expand,
  Gauge,
  Library,
  MonitorPlay,
  Radio,
  Settings2,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Command } from 'cmdk';
import { useHotkey } from '@tanstack/react-hotkeys';

type MasterTab = 'live' | 'moments' | 'combat' | 'notes' | 'library';

interface MasterCommandPaletteProps {
  activeTab: MasterTab;
  setActiveTab: (tab: MasterTab) => void;
  onOpenQuickMoments: () => void;
  onOpenHistory: () => void;
  onOpenCheckpoints: () => void;
  onOpenDiagnostics: () => void;
  onOpenFullScreenPreview: () => void;
  onOpenSessionPrepWizard: () => void;
  onOpenReadiness: () => void;
}

const tabCommands: Array<{ value: MasterTab; label: string; hint: string; icon: React.ReactNode }> = [
  { value: 'live', label: 'En vivo', hint: 'Volver al escenario y controles principales', icon: <MonitorPlay size={17} /> },
  { value: 'moments', label: 'Momentos', hint: 'Abrir macros y momentos preparados', icon: <Sparkles size={17} /> },
  { value: 'combat', label: 'Combate', hint: 'Abrir seguimiento de iniciativa', icon: <Gauge size={17} /> },
  { value: 'notes', label: 'Notas', hint: 'Consultar notas de la sesión', icon: <BookOpen size={17} /> },
  { value: 'library', label: 'Biblioteca', hint: 'Explorar recursos y campañas', icon: <Library size={17} /> },
];

export const MasterCommandPalette: React.FC<MasterCommandPaletteProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickMoments,
  onOpenHistory,
  onOpenCheckpoints,
  onOpenDiagnostics,
  onOpenFullScreenPreview,
  onOpenSessionPrepWizard,
  onOpenReadiness,
}) => {
  const [open, setOpen] = useState(false);

  useHotkey('Mod+K', () => setOpen((current) => !current), { preventDefault: true });

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Paleta de comandos del Director"
      className="master-command-dialog"
    >
      <div className="master-command-heading">
        <div>
          <span className="master-command-kicker">ACCESO RÁPIDO</span>
          <strong>¿Qué querés abrir?</strong>
        </div>
        <kbd>ESC</kbd>
      </div>
      <Command.Input placeholder="Buscar una vista o herramienta..." autoFocus />
      <Command.List>
        <Command.Empty>No encontramos esa herramienta.</Command.Empty>
        <Command.Group heading="Vistas">
          {tabCommands.map((tab) => (
            <Command.Item
              key={tab.value}
              value={`${tab.label} ${tab.hint}`}
              onSelect={() => run(() => setActiveTab(tab.value))}
            >
              <span className="master-command-icon">{tab.icon}</span>
              <span className="master-command-copy">
                <strong>{tab.label}</strong>
                <small>{tab.hint}</small>
              </span>
              {activeTab === tab.value && <span className="master-command-current">ACTIVA</span>}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Herramientas">
          <Command.Item value="momentos rápidos macros" onSelect={() => run(onOpenQuickMoments)}>
            <span className="master-command-icon"><Sparkles size={17} /></span>
            <span className="master-command-copy"><strong>Momentos rápidos</strong><small>Disparar una escena preparada</small></span>
          </Command.Item>
          <Command.Item value="historial cambios" onSelect={() => run(onOpenHistory)}>
            <span className="master-command-icon"><Clock3 size={17} /></span>
            <span className="master-command-copy"><strong>Historial</strong><small>Revisar cambios de la sesión</small></span>
          </Command.Item>
          <Command.Item value="puntos de control checkpoints" onSelect={() => run(onOpenCheckpoints)}>
            <span className="master-command-icon"><Radio size={17} /></span>
            <span className="master-command-copy"><strong>Puntos de control</strong><small>Guardar o restaurar un estado</small></span>
          </Command.Item>
          <Command.Item value="diagnósticos conexión" onSelect={() => run(onOpenDiagnostics)}>
            <span className="master-command-icon"><Wrench size={17} /></span>
            <span className="master-command-copy"><strong>Diagnósticos</strong><small>Revisar conexión y telemetría</small></span>
          </Command.Item>
          <Command.Item value="preparar sesión wizard" onSelect={() => run(onOpenSessionPrepWizard)}>
            <span className="master-command-icon"><Settings2 size={17} /></span>
            <span className="master-command-copy"><strong>Preparar sesión</strong><small>Recorrer la configuración inicial</small></span>
          </Command.Item>
          <Command.Item value="evaluar preparación readiness" onSelect={() => run(onOpenReadiness)}>
            <span className="master-command-icon"><Gauge size={17} /></span>
            <span className="master-command-copy"><strong>Evaluar preparación</strong><small>Comprobar si la mesa está lista</small></span>
          </Command.Item>
          <Command.Item value="vista pantalla completa preview" onSelect={() => run(onOpenFullScreenPreview)}>
            <span className="master-command-icon"><Expand size={17} /></span>
            <span className="master-command-copy"><strong>Vista previa completa</strong><small>Ver la salida como la Mesa</small></span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};
