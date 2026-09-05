import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import type { Character } from '../../../types';
import { AssetPickerModal } from '../../common/AssetPickerModal';

interface CharacterEditModalProps {
  isOpen: boolean;
  charToEdit: Character | null;
  onSave: (charData: Partial<Character>) => void;
  onClose: () => void;
}

export const CharacterEditModal: React.FC<CharacterEditModalProps> = ({
  isOpen,
  charToEdit,
  onSave,
  onClose,
}) => {
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [form, setForm] = useState({
    name: '',
    roleOrTitle: '',
    defaultAvatarUrl: '',
    bio: '',
    maxHp: 30,
  });

  useEffect(() => {
    if (charToEdit) {
      setForm({
        name: charToEdit.name,
        roleOrTitle: charToEdit.roleOrTitle,
        defaultAvatarUrl: charToEdit.defaultAvatarUrl,
        bio: charToEdit.bio || '',
        maxHp: charToEdit.maxHp || 30,
      });
    } else {
      setForm({
        name: '',
        roleOrTitle: '',
        defaultAvatarUrl: '',
        bio: '',
        maxHp: 30,
      });
    }
  }, [charToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.defaultAvatarUrl) return;
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{charToEdit ? 'Editar Personaje / NPC' : 'Nuevo Personaje / NPC'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="master-form">
          <label>Nombre del Personaje</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ej: Lyra Sombraverde, Lord Valerius"
            className="master-input"
          />

          <div className="form-grid-2">
            <div>
              <label>Rol o Título</label>
              <input
                type="text"
                value={form.roleOrTitle}
                onChange={(e) => setForm({ ...form, roleOrTitle: e.target.value })}
                placeholder="ej: Pícara Élfica, Comerciante"
                className="master-input"
              />
            </div>
            <div>
              <label>Puntos de Golpe Máximos (HP)</label>
              <input
                type="number"
                min={1}
                max={999}
                value={form.maxHp}
                onChange={(e) => setForm({ ...form, maxHp: parseInt(e.target.value) || 30 })}
                className="master-input"
              />
            </div>
          </div>

          <label>Avatar / Retrato del Personaje</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#090d16',
                border: '2px solid rgba(245, 158, 11, 0.4)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {form.defaultAvatarUrl ? (
                <img src={form.defaultAvatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ImageIcon size={22} className="text-amber-400" />
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAssetPicker(true)}
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
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <ImageIcon size={16} />
              <span>{form.defaultAvatarUrl ? 'Cambiar Retrato' : 'Elegir Retrato (Fotos / Biblioteca)'}</span>
            </button>
          </div>

          <label>Biografía o Notas</label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Historia, secretos, motivaciones..."
            className="master-input textarea"
          />

          <button type="submit" className="btn-primary full">
            {charToEdit ? 'Guardar Cambios' : 'Crear Ficha de NPC'}
          </button>
        </form>

        <AssetPickerModal
          isOpen={showAssetPicker}
          mode="character"
          currentUrl={form.defaultAvatarUrl}
          onSelectAsset={(asset) => {
            setForm((prev) => ({
              ...prev,
              defaultAvatarUrl: asset.url,
              name: prev.name || asset.name,
            }));
            setShowAssetPicker(false);
          }}
          onClose={() => setShowAssetPicker(false)}
        />
      </div>
    </div>
  );
};
