import React from 'react';
import { Users, X, Image as ImageIcon, Plus, Sparkles } from 'lucide-react';
import type { Campaign, Scene } from '../../../types';
import type { SceneDraftState } from '../../../services/draftStorageService';
import { AssetPickerModal, type SelectedAssetResult } from '../../common/AssetPickerModal';
import { TransferSceneModal } from '../workshop/TransferSceneModal';

export interface ComposerModalsProps {
  // Asset picker
  showAssetPicker: boolean;
  assetPickerMode: 'background' | 'character';
  backgroundUrl: string;
  quickCharAvatar: string;
  onSelectAsset: (asset: SelectedAssetResult) => void;
  onCloseAssetPicker: () => void;

  // Quick Char Modal
  showQuickCharModal: boolean;
  onCloseQuickCharModal: () => void;
  quickCharName: string;
  setQuickCharName: (name: string) => void;
  isCreatingChar: boolean;
  campaignTitle: string;
  onOpenAssetPickerForChar: () => void;
  onCreateAndAddCharacter: (e: React.FormEvent) => void;

  // Transfer Scene Modal
  showTransferModal: boolean;
  onCloseTransferModal: () => void;
  sceneToTransfer: Scene;
  campaign: Campaign;
  onOpenSession?: (sessionId: string) => void;

  // Draft Recovery Modal
  showDraftModal: boolean;
  recoveredDraft: SceneDraftState | null;
  onAcceptDraft: () => void;
  onDiscardDraft: () => void;
  onSaveDraftAsCopy?: () => void;
}

export const ComposerModals: React.FC<ComposerModalsProps> = ({
  showAssetPicker,
  assetPickerMode,
  backgroundUrl,
  quickCharAvatar,
  onSelectAsset,
  onCloseAssetPicker,
  showQuickCharModal,
  onCloseQuickCharModal,
  quickCharName,
  setQuickCharName,
  isCreatingChar,
  campaignTitle,
  onOpenAssetPickerForChar,
  onCreateAndAddCharacter,
  showTransferModal,
  onCloseTransferModal,
  sceneToTransfer,
  campaign,
  onOpenSession,
  showDraftModal,
  recoveredDraft,
  onAcceptDraft,
  onDiscardDraft,
  onSaveDraftAsCopy,
}) => {
  return (
    <>
      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={showAssetPicker}
        mode={assetPickerMode}
        currentUrl={assetPickerMode === 'background' ? backgroundUrl : quickCharAvatar}
        onSelectAsset={onSelectAsset}
        onClose={onCloseAssetPicker}
      />

      {/* Modal Rápido de Creación de Personaje sin salir del Compositor */}
      {showQuickCharModal && (
        <div
          className="modal-overlay"
          onClick={onCloseQuickCharModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 15, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '6px', borderRadius: '8px' }}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 600 }}>
                    Nuevo Personaje
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Se guardará en <strong>{campaignTitle}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseQuickCharModal}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={onCreateAndAddCharacter} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Nombre del Personaje:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Tabernero Gundren, Guardia Real..."
                  value={quickCharName}
                  onChange={(e) => setQuickCharName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#090d16',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '10px 12px',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Retrato / Token:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
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
                    {quickCharAvatar ? (
                      <img src={quickCharAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={24} className="text-gray-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAssetPickerForChar}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fbbf24',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <ImageIcon size={16} />
                    <span>{quickCharAvatar ? 'Cambiar Foto / Token' : 'Elegir Foto / Token'}</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onCloseQuickCharModal}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChar || !quickCharName.trim() || !quickCharAvatar}
                  style={{
                    background: isCreatingChar || !quickCharName.trim() || !quickCharAvatar ? '#4b5563' : 'linear-gradient(135deg, #d97706, #b45309)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: isCreatingChar || !quickCharName.trim() || !quickCharAvatar ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  <span>{isCreatingChar ? 'Creando...' : 'Crear y añadir a esta escena'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Traslado a Preparación */}
      <TransferSceneModal
        isOpen={showTransferModal}
        scene={sceneToTransfer}
        campaign={campaign}
        onClose={onCloseTransferModal}
        onSuccess={() => {}}
        onOpenSession={onOpenSession}
      />

      {/* Modal de Recuperación de Borrador (Continuidad ante interrupciones de Android) */}
      {showDraftModal && recoveredDraft && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Borrador Recuperado</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Guardado {new Date(recoveredDraft.updatedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '20px' }}>
              Se detectó un borrador sin consolidar para esta escena con <strong>{recoveredDraft.characters.length} figuras</strong>. ¿Cómo deseas continuar?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={onAcceptDraft}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
                }}
              >
                Continuar con el borrador (Recomendado)
              </button>

              <button
                type="button"
                onClick={onDiscardDraft}
                style={{
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Volver a la versión guardada
              </button>

              {onSaveDraftAsCopy && (
                <button
                  type="button"
                  onClick={onSaveDraftAsCopy}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Guardar borrador como copia independiente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
