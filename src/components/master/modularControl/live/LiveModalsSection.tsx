import React from 'react';
import type { Character } from '../../../../types';
import { CharacterEditModal } from '../../modals/CharacterEditModal';
import { AssetPickerModal, type SelectedAssetResult } from '../../../common/AssetPickerModal';

interface LiveModalsSectionProps {
  isCreatingCharacter: boolean;
  charToEditInModal: Character | null;
  onSaveCharacter: (charData: Partial<Character>) => void;
  onCloseCharacterModal: () => void;
  isBgPickerOpen: boolean;
  currentBackgroundUrl?: string;
  onSelectBackground: (asset: SelectedAssetResult) => void;
  onCloseBgPicker: () => void;
}

export const LiveModalsSection: React.FC<LiveModalsSectionProps> = ({
  isCreatingCharacter,
  charToEditInModal,
  onSaveCharacter,
  onCloseCharacterModal,
  isBgPickerOpen,
  currentBackgroundUrl,
  onSelectBackground,
  onCloseBgPicker,
}) => {
  return (
    <>
      {(isCreatingCharacter || !!charToEditInModal) && (
        <CharacterEditModal
          isOpen={isCreatingCharacter || !!charToEditInModal}
          charToEdit={charToEditInModal}
          onSave={onSaveCharacter}
          onClose={onCloseCharacterModal}
        />
      )}

      {isBgPickerOpen && (
        <AssetPickerModal
          isOpen={isBgPickerOpen}
          mode="background"
          currentUrl={currentBackgroundUrl}
          title="Subir o cambiar fondo de escenario"
          onSelectAsset={onSelectBackground}
          onClose={onCloseBgPicker}
        />
      )}
    </>
  );
};
