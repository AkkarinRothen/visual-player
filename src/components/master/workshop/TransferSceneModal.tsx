import React from 'react';
import type { TransferSceneModalProps } from './transferScene/transferSceneTypes';
import { useTransferScene } from './transferScene/useTransferScene';
import { TransferSceneHeader } from './transferScene/TransferSceneHeader';
import { TransferSceneSuccessView } from './transferScene/TransferSceneSuccessView';
import { TransferSceneSummaryCard } from './transferScene/TransferSceneSummaryCard';
import { TransferTargetSessionPicker } from './transferScene/TransferTargetSessionPicker';
import { TransferModeOptions } from './transferScene/TransferModeOptions';

export type { TransferSceneModalProps };

export const TransferSceneModal: React.FC<TransferSceneModalProps> = ({
  isOpen = true,
  scene,
  campaign: propCampaign,
  currentCampaignId,
  onClose,
  onSuccess,
  onTransferred,
  onOpenSession,
}) => {
  const {
    resolvedCampaign,
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    transferMode,
    setTransferMode,
    isLoading,
    isTransferring,
    showNewSessionInput,
    setShowNewSessionInput,
    newSessionTitle,
    setNewSessionTitle,
    transferredSession,
    handleCreateNewSession,
    handleConfirmTransfer,
  } = useTransferScene({
    scene,
    propCampaign,
    currentCampaignId,
    isOpen,
    onSuccess,
    onTransferred,
  });

  if (!isOpen || !scene || !resolvedCampaign) return null;

  const charactersCount = scene.activeCharacters?.length || 0;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
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
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cabecera */}
        <TransferSceneHeader
          campaignTitle={resolvedCampaign.title}
          onClose={onClose}
        />

        {/* Pantalla de éxito tras confirmar */}
        {transferredSession ? (
          <TransferSceneSuccessView
            sceneName={scene.name}
            transferredSession={transferredSession}
            onClose={onClose}
            onOpenSession={onOpenSession}
          />
        ) : (
          /* Contenido del formulario de traslado */
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 1. Tarjeta resumen de la escena */}
            <TransferSceneSummaryCard
              scene={scene}
              charactersCount={charactersCount}
            />

            {/* 2. Selector de Sesión de Destino */}
            <TransferTargetSessionPicker
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              setSelectedSessionId={setSelectedSessionId}
              isLoading={isLoading}
              showNewSessionInput={showNewSessionInput}
              setShowNewSessionInput={setShowNewSessionInput}
              newSessionTitle={newSessionTitle}
              setNewSessionTitle={setNewSessionTitle}
              onCreateNewSession={handleCreateNewSession}
            />

            {/* 3. Opciones de Incorporación y botones */}
            <TransferModeOptions
              transferMode={transferMode}
              setTransferMode={setTransferMode}
              isTransferring={isTransferring}
              selectedSessionId={selectedSessionId}
              onClose={onClose}
              onConfirmTransfer={handleConfirmTransfer}
            />
          </div>
        )}
      </div>
    </div>
  );
};
