import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import type { Scene, WeatherType, LightingFilter } from '../../../types';

interface SceneEditModalProps {
  isOpen: boolean;
  sceneToEdit: Scene | null;
  onSave: (sceneData: Partial<Scene>) => void;
  onClose: () => void;
}

export const SceneEditModal: React.FC<SceneEditModalProps> = ({
  isOpen,
  sceneToEdit,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState({
    name: '',
    backgroundUrl: '',
    locationBanner: '',
    subtitle: '',
    weather: 'none' as WeatherType,
    lighting: 'normal' as LightingFilter,
    ambientAudioUrl: '',
    ambientAudioName: '',
    dmNotes: '',
  });

  useEffect(() => {
    if (sceneToEdit) {
      setForm({
        name: sceneToEdit.name,
        backgroundUrl: sceneToEdit.backgroundUrl,
        locationBanner: sceneToEdit.locationBanner || sceneToEdit.name,
        subtitle: sceneToEdit.subtitle || '',
        weather: sceneToEdit.weather || 'none',
        lighting: sceneToEdit.lighting || 'normal',
        ambientAudioUrl: sceneToEdit.ambientAudioUrl || '',
        ambientAudioName: sceneToEdit.ambientAudioName || '',
        dmNotes: sceneToEdit.dmNotes || '',
      });
    } else {
      setForm({
        name: '',
        backgroundUrl: '',
        locationBanner: '',
        subtitle: '',
        weather: 'none',
        lighting: 'normal',
        ambientAudioUrl: '',
        ambientAudioName: '',
        dmNotes: '',
      });
    }
  }, [sceneToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({ ...prev, backgroundUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.backgroundUrl) return;
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{sceneToEdit ? 'Editar Escena' : 'Nueva Escena'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="master-form">
          <label>Nombre de la Escena</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ej: Bosque Sombrío, Posada del Dragón"
            className="master-input"
          />

          <label>Imagen de Fondo (URL o Subir Archivo)</label>
          <div className="flex-gap">
            <input
              type="url"
              required
              value={form.backgroundUrl}
              onChange={(e) => setForm({ ...form, backgroundUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="master-input flex-1"
            />
            <label className="btn-file-upload">
              <Upload size={16} />
              <span>Subir</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="form-grid-2">
            <div>
              <label>Banner Principal (Opcional)</label>
              <input
                type="text"
                value={form.locationBanner}
                onChange={(e) => setForm({ ...form, locationBanner: e.target.value })}
                placeholder="Título en Pantalla"
                className="master-input"
              />
            </div>
            <div>
              <label>Subtítulo de Escena</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="ej: Región Norte, Año 432"
                className="master-input"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label>Clima Inicial</label>
              <select
                value={form.weather}
                onChange={(e) => setForm({ ...form, weather: e.target.value as WeatherType })}
                className="master-input"
              >
                <option value="none">Despejado</option>
                <option value="rain">Lluvia</option>
                <option value="storm">Tormenta</option>
                <option value="snow">Nieve</option>
                <option value="fog">Niebla</option>
                <option value="embers">Brasas</option>
                <option value="dust">Polvo Mágico</option>
              </select>
            </div>
            <div>
              <label>Iluminación</label>
              <select
                value={form.lighting}
                onChange={(e) => setForm({ ...form, lighting: e.target.value as LightingFilter })}
                className="master-input"
              >
                <option value="normal">Normal</option>
                <option value="dim">Tenue</option>
                <option value="dark">Oscuro</option>
                <option value="torch">Antorchas</option>
                <option value="sunset">Atardecer</option>
                <option value="night">Noche</option>
                <option value="mystic">Místico</option>
              </select>
            </div>
          </div>

          <label>Audio Ambiental URL (Opcional)</label>
          <input
            type="url"
            value={form.ambientAudioUrl}
            onChange={(e) => setForm({ ...form, ambientAudioUrl: e.target.value })}
            placeholder="https://example.com/ambient.mp3"
            className="master-input"
          />

          <label>Notas Secretas del DM</label>
          <textarea
            rows={3}
            value={form.dmNotes}
            onChange={(e) => setForm({ ...form, dmNotes: e.target.value })}
            placeholder="Pistas, trampas, criaturas ocultas..."
            className="master-input textarea"
          />

          <button type="submit" className="btn-primary full">
            {sceneToEdit ? 'Guardar Cambios' : 'Crear Escena'}
          </button>
        </form>
      </div>
    </div>
  );
};
