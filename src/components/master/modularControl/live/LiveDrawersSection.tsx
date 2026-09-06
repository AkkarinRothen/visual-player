import React from 'react';
import type { Campaign, DisplayState, DMFavoriteItem, Character, Scene } from '../../../../types';
import type { StoredAsset } from '../../../../db';
import { MobileEdgePullTabs } from '../drawers/MobileEdgePullTabs';
import { MobileFxEdgeDrawer } from '../drawers/MobileFxEdgeDrawer';
import { MobileResourcesEdgeDrawer } from '../drawers/MobileResourcesEdgeDrawer';

interface LiveDrawersSectionProps {
  liveState: DisplayState;
  campaign: Campaign | null;
  isLeftDrawerOpen: boolean;
  setIsLeftDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRightDrawerOpen: boolean;
  setIsRightDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onTriggerLightning: () => void;
  onTriggerShake: () => void;
  onToggleBlackout: () => void;
  onToggleBanner: () => void;
  onTriggerSfx?: (preset: string) => void;
  favorites: DMFavoriteItem[];
  onExecuteFavorite?: (item: DMFavoriteItem) => Promise<boolean> | boolean;
  onSelectScene?: (scene: Scene) => void;
  onInvokeCharacter: (char: Character) => void;
  onUseResourceAsset: (asset: StoredAsset) => void;
  onOpenNotes?: () => void;
  onOpenRevelationJournal?: () => void;
  onOpenManageFavorites?: () => void;
}

export const LiveDrawersSection: React.FC<LiveDrawersSectionProps> = ({
  liveState,
  campaign,
  isLeftDrawerOpen,
  setIsLeftDrawerOpen,
  isRightDrawerOpen,
  setIsRightDrawerOpen,
  onTriggerLightning,
  onTriggerShake,
  onToggleBlackout,
  onToggleBanner,
  onTriggerSfx,
  favorites,
  onExecuteFavorite,
  onSelectScene,
  onInvokeCharacter,
  onUseResourceAsset,
  onOpenNotes,
  onOpenRevelationJournal,
  onOpenManageFavorites,
}) => {
  return (
    <>
      <MobileEdgePullTabs
        isLeftOpen={isLeftDrawerOpen}
        isRightOpen={isRightDrawerOpen}
        onToggleLeft={() => {
          setIsRightDrawerOpen(false);
          setIsLeftDrawerOpen((prev) => !prev);
        }}
        onToggleRight={() => {
          setIsLeftDrawerOpen(false);
          setIsRightDrawerOpen((prev) => !prev);
        }}
        hasActiveFxAlert={Boolean(liveState.isBlackout || liveState.lightningTrigger > 0)}
      />

      <MobileFxEdgeDrawer
        isOpen={isLeftDrawerOpen}
        onClose={() => setIsLeftDrawerOpen(false)}
        onTriggerLightning={onTriggerLightning}
        onTriggerShake={onTriggerShake}
        onToggleBlackout={onToggleBlackout}
        isBlackout={liveState.isBlackout}
        onToggleBanner={onToggleBanner}
        isBannerVisible={Boolean(liveState.locationBanner?.visible)}
        onTriggerSfx={onTriggerSfx}
      />

      <MobileResourcesEdgeDrawer
        isOpen={isRightDrawerOpen}
        onClose={() => setIsRightDrawerOpen(false)}
        campaign={campaign}
        favorites={favorites}
        onExecuteFavorite={onExecuteFavorite}
        onSelectScene={onSelectScene}
        onInvokeCharacter={onInvokeCharacter}
        onUseResourceAsset={onUseResourceAsset}
        onOpenNotes={onOpenNotes}
        onOpenRevelationJournal={onOpenRevelationJournal}
        onOpenManageFavorites={onOpenManageFavorites}
        activeSceneId={liveState.currentSceneId || undefined}
      />
    </>
  );
};
