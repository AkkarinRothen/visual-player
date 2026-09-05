import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import type { Scene, WeatherType, LightingFilter } from '../../../types';
import { AssetPickerModal } from '../../common/AssetPickerModal';

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
  const [showAssetPicker, setShowAssetPicker] = useState(false);
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

          <label>Imagen de Fondo de la Escena</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '100px',
                height: '56px',
                borderRadius: '8px',
                background: '#090d16',
                border: '1px solid rgba(255,255,255,0.15)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {form.backgroundUrl ? (
                <img src={form.backgroundUrl} alt="Fondo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ImageIcon size={20} className="text-amber-400" />
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
              <span>{form.backgroundUrl ? 'Cambiar Imagen' : 'Elegir Imagen (Fotos / Biblioteca)'}</span>
            </button>
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

        <AssetPickerModal
          isOpen={showAssetPicker}
          mode="background"
          currentUrl={form.backgroundUrl}
          onSelectAsset={(asset) => {
            setForm((prev) => ({
              ...prev,
              backgroundUrl: asset.url,
              name: prev.name || asset.name,
              locationBanner: prev.locationBanner || asset.name,
            }));
            setShowAssetPicker(false);
          }}
          onClose={() => setShowAssetPicker(false)}
        />
      </div>
    </div>
  );
};
