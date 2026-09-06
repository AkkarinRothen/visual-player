import type { BackupPreflightReport } from '../../../../services/backupPackageService';

export interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCampaigns?: () => void;
}

export interface BackupHeaderProps {
  onClose: () => void;
}

export interface BackupTabsProps {
  activeTab: 'create' | 'restore';
  onSelectTab: (tab: 'create' | 'restore') => void;
}

export interface BackupCreateTabProps {
  campaignCount: number;
  assetCount: number;
  isGenerating: boolean;
  createdFileName: string | null;
  onExportBackup: () => void;
}

export interface BackupRestoreTabProps {
  selectedFile: File | null;
  isInspecting: boolean;
  preflightReport: BackupPreflightReport | null;
  restoreMode: 'copy' | 'merge' | 'replace';
  setRestoreMode: (mode: 'copy' | 'merge' | 'replace') => void;
  isRestoring: boolean;
  restoreSuccessMsg: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmRestore: () => void;
}
