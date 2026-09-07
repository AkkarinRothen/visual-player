import type { StoredAsset } from '../../../db';
import type { OptimizedImageResult } from '../../../utils/imageOptimizer';
import type { VideoValidationResult } from '../../../utils/videoOptimizer';

export interface SelectedAssetResult {
  url: string;
  name: string;
  type?: 'image' | 'video';
  videoAssetId?: string;
  posterUrl?: string;
  durationSeconds?: number;
}

export type AssetPickerMode = 'background' | 'character' | 'prop' | 'all';

export interface AssetPickerDeviceTabProps {
  mode: AssetPickerMode;
  previewUrl: string;
  setPreviewUrl: (url: string) => void;
  assetName: string;
  setAssetName: (name: string) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  optimizedResult: OptimizedImageResult | null;
  setOptimizedResult: (res: OptimizedImageResult | null) => void;
  keepOriginal: boolean;
  setKeepOriginal: (val: boolean) => void;
  isVideoSelected: boolean;
  setIsVideoSelected: (val: boolean) => void;
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;
  videoValidation: VideoValidationResult | null;
  setVideoValidation: (val: VideoValidationResult | null) => void;
  videoPosterDataUrl: string | null;
  setVideoPosterDataUrl: (url: string | null) => void;
  videoObjectUrl: string | null;
  setVideoObjectUrl: (url: string | null) => void;
  onConfirmUpload: () => void;
}

export interface AssetPickerLibraryTabProps {
  mode: AssetPickerMode;
  storedAssets: StoredAsset[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: 'all' | 'image' | 'video';
  setFilterType: (ft: 'all' | 'image' | 'video') => void;
  selectedPackFilter: string;
  setSelectedPackFilter: (p: string) => void;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  onSelectFromLibrary: (asset: StoredAsset) => void;
  onOpenResourcePacksModal: () => void;
}

export interface AssetPickerUrlTabProps {
  customUrlInput: string;
  setCustomUrlInput: (url: string) => void;
  assetName: string;
  setAssetName: (name: string) => void;
  isProcessing: boolean;
  onConfirmUrl: () => void;
  onPreviewUrl: () => void;
}
