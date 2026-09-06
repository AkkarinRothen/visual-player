import React from 'react';
import {
  Plus,
  FolderArchive,
  Image as ImageIcon,
  Users,
  Edit,
  Send,
  Trash2,
} from 'lucide-react';
import type { Scene } from '../../../types';

export interface WorkshopScenesTabProps {
  scenes: Scene[];
  onComposeScene: (scene: Scene | null) => void;
  onTransferScene: (scene: Scene) => void;
  onDeleteScene: (sceneId: string, sceneName: string) => void;
  onOpenBackupModal: () => void;
}

export const WorkshopScenesTab: React.FC<WorkshopScenesTabProps> = ({
  scenes,
  onComposeScene,
  onTransferScene,
  onDeleteScene,
  onOpenBackupModal,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Escenas Preparadas</h2>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Toca una escena para editarla a pantalla completa
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onOpenBackupModal}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Copias de Seguridad (.vpbackup)"
          >
            <FolderArchive size={16} className="text-amber-400" />
            <span>Respaldos</span>
          </button>

          <button
            type="button"
            onClick={() => onComposeScene(null)}
            style={{
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
            }}
          >
            <Plus size={16} />
            <span>Nueva Escena</span>
          </button>
        </div>
      </div>

      {scenes.length === 0 ? (
        <div
          style={{
            border: '2px dashed rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#9ca3af',
          }}
        >
          <ImageIcon size={40} className="text-amber-400" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
          <h3 style={{ color: '#f3f4f6', margin: '0 0 6px' }}>No hay escenas en esta campaña</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
            Empieza creando tu primer escenario con un fondo y personajes.
          </p>
          <button
            type="button"
            onClick={() => onComposeScene(null)}
            style={{
              background: '#d97706',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Crear Primera Escena
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {scenes.map((sc) => (
            <div
              key={sc.id}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              {/* Miniatura 16:9 */}
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '16/9',
                  width: '100%',
                  background: '#020408',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => onComposeScene(sc)}
              >
                <img
                  src={sc.backgroundUrl}
                  alt={sc.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    color: '#fbbf24',
                    fontWeight: 700,
                  }}
                >
                  {sc.locationBanner || sc.name}
                </div>

                {sc.activeCharacters && sc.activeCharacters.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.75)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Users size={12} />
                    <span>{sc.activeCharacters.length} en escena</span>
                  </div>
                )}
              </div>

              {/* Metadata y Acciones */}
              <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>
                    {sc.name}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {sc.subtitle || 'Sin subtítulo'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onComposeScene(sc)}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      color: '#fbbf24',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit size={14} />
                    <span>Componer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTransferScene(sc)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      padding: '8px 10px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                    title="Llevar a sesión preparada"
                  >
                    <Send size={14} />
                    <span>Llevar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteScene(sc.id, sc.name)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '6px',
                      color: '#f87171',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    title="Eliminar escena"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
