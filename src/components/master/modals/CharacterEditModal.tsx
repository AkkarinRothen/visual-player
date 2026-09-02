import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import type { Character } from '../../../types';

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({ ...prev, defaultAvatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

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

          <label>Avatar / Retrato (URL o Archivo)</label>
          <div className="flex-gap">
            <input
              type="url"
              required
              value={form.defaultAvatarUrl}
              onChange={(e) => setForm({ ...form, defaultAvatarUrl: e.target.value })}
              placeholder="https://..."
              className="master-input flex-1"
            />
            <label className="btn-file-upload">
              <Upload size={16} />
              <span>Subir</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
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
      </div>
    </div>
  );
};
