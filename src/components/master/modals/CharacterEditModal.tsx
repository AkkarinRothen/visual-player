import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Character } from '../../../types';
import { AssetPickerModal } from '../../common/AssetPickerModal';
import { TokenCreatorModal } from '../../common/TokenCreatorModal';
import { ModalErrorBoundary } from '../../common/ModalErrorBoundary';

interface CharacterEditModalProps {
  isOpen: boolean;
  charToEdit: Character | null;
  onSave: (charData: Partial<Character>) => void;
  onClose: () => void;
}

const characterSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  roleOrTitle: z.string().trim().max(80, 'El rol no puede superar los 80 caracteres.'),
  defaultAvatarUrl: z.string().trim().min(1, 'Elegí un retrato para el personaje.'),
  bio: z.string().trim().max(1000, 'La biografía no puede superar los 1000 caracteres.'),
  maxHp: z.coerce.number().int('Los HP deben ser un número entero.').min(1, 'Los HP deben ser mayores que 0.'),
});

type CharacterFormValues = z.infer<typeof characterSchema>;

const emptyCharacterForm: CharacterFormValues = {
  name: '',
  roleOrTitle: '',
  defaultAvatarUrl: '',
  bio: '',
  maxHp: 30,
};

export const CharacterEditModal: React.FC<CharacterEditModalProps> = ({
  isOpen,
  charToEdit,
  onSave,
  onClose,
}) => {
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showTokenCreator, setShowTokenCreator] = useState(false);
  const {
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<CharacterFormValues>({
    resolver: zodResolver(characterSchema),
    defaultValues: emptyCharacterForm,
  });

  const avatarUrl = watch('defaultAvatarUrl');

  useEffect(() => {
    if (charToEdit) {
      reset({
        name: charToEdit.name,
        roleOrTitle: charToEdit.roleOrTitle,
        defaultAvatarUrl: charToEdit.defaultAvatarUrl,
        bio: charToEdit.bio || '',
        maxHp: charToEdit.maxHp || 30,
      });
    } else {
      reset(emptyCharacterForm);
    }
  }, [charToEdit, isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: CharacterFormValues) => {
    onSave(data);
    onClose();
  };

  const modalContent = (
    <ModalErrorBoundary modalTitle={charToEdit ? 'Editar Personaje / NPC' : 'Nuevo Personaje / NPC'} onClose={onClose}>
      <div className="modal-overlay character-edit-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
        <div className="modal-content character-edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{charToEdit ? 'Editar Personaje / NPC' : 'Nuevo Personaje / NPC'}</h2>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="master-form" noValidate>
            <label>Nombre del Personaje</label>
            <input
              type="text"
              {...register('name')}
              placeholder="ej: Lyra Sombraverde, Lord Valerius"
              className="master-input"
            />
            {errors.name && <span className="form-field-error">{errors.name.message}</span>}

            <div className="form-grid-2">
              <div>
                <label>Rol o Título</label>
                <input
                  type="text"
                  {...register('roleOrTitle')}
                  placeholder="ej: Pícara Élfica, Comerciante"
                  className="master-input"
                />
                {errors.roleOrTitle && <span className="form-field-error">{errors.roleOrTitle.message}</span>}
              </div>
              <div>
                <label>Puntos de Golpe Máximos (HP)</label>
                <input
                  type="number"
                  min={1}
                  {...register('maxHp', { valueAsNumber: true })}
                  className="master-input"
                />
                {errors.maxHp && <span className="form-field-error">{errors.maxHp.message}</span>}
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
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                <span>{avatarUrl ? 'Cambiar Retrato' : 'Elegir Retrato (Fotos / Biblioteca)'}</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setShowTokenCreator(true)}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    border: '1px solid #38bdf8',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                  title="Ajustar y recortar como ficha o token circular"
                >
                  <Sparkles size={16} />
                  <span>Crear Token</span>
                </button>
              )}
            </div>

            <label>Biografía o Notas</label>
            <textarea
              rows={3}
              {...register('bio')}
              placeholder="Historia, secretos, motivaciones..."
              className="master-input textarea"
            />
            {errors.bio && <span className="form-field-error">{errors.bio.message}</span>}

            <input type="hidden" {...register('defaultAvatarUrl')} />
            {errors.defaultAvatarUrl && <span className="form-field-error">{errors.defaultAvatarUrl.message}</span>}

            <button type="submit" className="btn-primary full">
              {charToEdit ? 'Guardar Cambios' : 'Crear Ficha de NPC'}
            </button>
          </form>
        </div>

        {/* Submodales desacoplados de modal-content */}
        <AssetPickerModal
          isOpen={showAssetPicker}
          mode="character"
          currentUrl={avatarUrl}
          onSelectAsset={(asset) => {
            setValue('defaultAvatarUrl', asset.url, { shouldValidate: true });
            if (!watch('name')) setValue('name', asset.name, { shouldValidate: true });
            setShowAssetPicker(false);
          }}
          onClose={() => setShowAssetPicker(false)}
        />

        <TokenCreatorModal
          isOpen={showTokenCreator}
          initialImageUrl={avatarUrl}
          onSaveToken={(tokenUrl) => {
            setValue('defaultAvatarUrl', tokenUrl, { shouldValidate: true });
            setShowTokenCreator(false);
          }}
          onClose={() => setShowTokenCreator(false)}
        />
      </div>
    </ModalErrorBoundary>
  );

  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(modalContent, document.body);
  }
  return modalContent;
};
