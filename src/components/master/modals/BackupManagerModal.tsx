import React from 'react';
import type { BackupManagerModalProps } from './backup/backupManagerTypes';
import { useBackupManager } from './backup/useBackupManager';
import { BackupHeader } from './backup/BackupHeader';
import { BackupTabs } from './backup/BackupTabs';
import { BackupCreateTab } from './backup/BackupCreateTab';
import { BackupRestoreTab } from './backup/BackupRestoreTab';

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  isOpen,
  onClose,
  onRefreshCampaigns,
}) => {
  const {
    activeTab,
    setActiveTab,
    campaignCount,
    assetCount,
    isGenerating,
    createdFileName,
    selectedFile,
    isInspecting,
    preflightReport,
    restoreMode,
    setRestoreMode,
    isRestoring,
    restoreSuccessMsg,
    handleExportBackup,
    handleFileChange,
    handleConfirmRestore,
  } = useBackupManager({ isOpen, onRefreshCampaigns });

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.85)',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        <BackupHeader onClose={onClose} />

        <BackupTabs activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Cuerpo del Modal */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'create' ? (
            <BackupCreateTab
              campaignCount={campaignCount}
              assetCount={assetCount}
              isGenerating={isGenerating}
              createdFileName={createdFileName}
              onExportBackup={handleExportBackup}
            />
          ) : (
            <BackupRestoreTab
              selectedFile={selectedFile}
              isInspecting={isInspecting}
              preflightReport={preflightReport}
              restoreMode={restoreMode}
              setRestoreMode={setRestoreMode}
              isRestoring={isRestoring}
              restoreSuccessMsg={restoreSuccessMsg}
              onFileChange={handleFileChange}
              onConfirmRestore={handleConfirmRestore}
            />
          )}
        </div>
      </div>
    </div>
  );
};
