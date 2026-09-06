import React from 'react';
import { FolderOpen, Package, FolderArchive } from 'lucide-react';

export interface WorkshopAssetsTabProps {
  onOpenResourcePacksModal: () => void;
  onOpenAssetPicker: () => void;
  onOpenBackupModal: () => void;
}

export const WorkshopAssetsTab: React.FC<WorkshopAssetsTabProps> = ({
  onOpenResourcePacksModal,
  onOpenAssetPicker,
  onOpenBackupModal,
}) => {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <FolderOpen size={48} className="text-amber-400" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
      <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
        Banco de Recursos Multimedia
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '420px', margin: '0 auto 20px' }}>
        Importa fotos locales desde tu dispositivo o inspecciona las imágenes guardadas en la base de datos local para reutilizarlas en tus escenas.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onOpenResourcePacksModal}
          style={{
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            border: 'none',
            color: '#fff',
            borderRadius: '10px',
            padding: '12px 24px',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(217, 119, 6, 0.3)',
          }}
        >
          <Package size={18} />
          <span>Instalar Packs de Recursos (.vppack)</span>
        </button>

        <button
          type="button"
          onClick={onOpenAssetPicker}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#f1f5f9',
            borderRadius: '10px',
            padding: '12px 24px',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FolderOpen size={18} className="text-amber-400" />
          <span>Explorar Galería de Medios</span>
        </button>
      </div>

      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          type="button"
          onClick={onOpenBackupModal}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#cbd5e1',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FolderArchive size={18} className="text-amber-400" />
          <span>Gestionar Respaldos y Restauración (.vpbackup)</span>
        </button>
      </div>
    </div>
  );
};
