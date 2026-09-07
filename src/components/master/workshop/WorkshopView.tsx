import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  Users,
  FolderOpen,
  Compass,
  FolderArchive,
} from 'lucide-react';
import type { Campaign, Scene, Character } from '../../../types';
import {
  getAllCampaigns,
  getActiveCampaignId,
  setActiveCampaignId,
  createCampaign,
  updateCampaign,
} from '../../../db/campaignDb';
import { DEMO_CAMPAIGN } from '../../../db/demoData';
import { SceneCanvasComposer } from '../composer/SceneCanvasComposer';
import { CharacterEditModal } from '../modals/CharacterEditModal';
import { AssetPickerModal } from '../../common/AssetPickerModal';
import { TransferSceneModal } from './TransferSceneModal';
import { BackupManagerModal } from '../modals/BackupManagerModal';
import { ResourcePacksModal } from '../modals/ResourcePacksModal';
import { WorkshopScenesTab } from './WorkshopScenesTab';
import { WorkshopCharactersTab } from './WorkshopCharactersTab';
import { WorkshopAssetsTab } from './WorkshopAssetsTab';
import { WorkshopNewCampaignModal } from './WorkshopNewCampaignModal';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import { getPlatformBridge } from '../../../platform';

const WORKSHOP_TAB_KEY = 'visual-player-workshop-tab';
type WorkshopTab = 'scenes' | 'characters' | 'assets';

export interface WorkshopViewProps {
  onExitToLobby: () => void;
}

export const WorkshopView: React.FC<WorkshopViewProps> = ({ onExitToLobby }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<WorkshopTab>(() => {
    if (typeof window === 'undefined') return 'scenes';
    const stored = window.localStorage.getItem(WORKSHOP_TAB_KEY);
    return stored === 'characters' || stored === 'assets' ? stored : 'scenes';
  });

  // Composers and Modals
  const [isComposingScene, setIsComposingScene] = useState(false);
  const [sceneToEdit, setSceneToEdit] = useState<Scene | null>(null);
  const [sceneToTransfer, setSceneToTransfer] = useState<Scene | null>(null);
  const [showCharModal, setShowCharModal] = useState(false);
  const [charToEdit, setCharToEdit] = useState<Character | null>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showResourcePacksModal, setShowResourcePacksModal] = useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState('');
  const [isCompactLayout, setIsCompactLayout] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'visual-player-workshop-layout',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    panelIds: ['workshop-navigation', 'workshop-content'],
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void Preferences.get({ key: WORKSHOP_TAB_KEY }).then(({ value }) => {
      if (value === 'scenes' || value === 'characters' || value === 'assets') {
        setActiveTab(value);
      }
    });
  }, []);

  const handleTabChange = (tab: WorkshopTab) => {
    setActiveTab(tab);
    if (Capacitor.isNativePlatform()) {
      void Preferences.set({ key: WORKSHOP_TAB_KEY, value: tab });
    } else {
      window.localStorage.setItem(WORKSHOP_TAB_KEY, tab);
    }
  };

  // Cargar campañas
  const loadCampaigns = async () => {
    try {
      let all = await getAllCampaigns();
      if (all.length === 0) {
        await createCampaign(DEMO_CAMPAIGN);
        all = [DEMO_CAMPAIGN];
      }
      setCampaigns(all);
      const activeId = await getActiveCampaignId();
      const current = all.find((c) => c.id === activeId) || all[0];
      setActiveCampaign(current);
    } catch (err) {
      console.warn('Error cargando campañas en taller:', err);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = () => setIsCompactLayout(mediaQuery.matches);
    handleViewportChange();
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  // Manejo del botón Atrás de Android
  useEffect(() => {
    const unsubscribe = getPlatformBridge().lifecycle.onBackButton(() => {
      if (isComposingScene) {
        setIsComposingScene(false);
        setSceneToEdit(null);
        return true;
      }
      if (showCharModal) {
        setShowCharModal(false);
        setCharToEdit(null);
        return true;
      }
      if (showAssetPicker) {
        setShowAssetPicker(false);
        return true;
      }
      if (showResourcePacksModal) {
        setShowResourcePacksModal(false);
        return true;
      }
      if (showNewCampaignModal) {
        setShowNewCampaignModal(false);
        return true;
      }
      onExitToLobby();
      return true;
    });

    return unsubscribe;
  }, [isComposingScene, showCharModal, showAssetPicker, showResourcePacksModal, showNewCampaignModal, onExitToLobby]);

  // Cambiar campaña activa
  const handleSelectCampaign = async (campaignId: string) => {
    await setActiveCampaignId(campaignId);
    const target = campaigns.find((c) => c.id === campaignId);
    if (target) setActiveCampaign(target);
  };

  // Crear nueva campaña
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignTitle.trim()) return;

    const newCamp: Campaign = {
      id: `campaign-${Date.now()}`,
      title: newCampaignTitle.trim(),
      description: 'Campaña creada desde el Taller',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: [],
      characters: [],
    };

    await createCampaign(newCamp);
    setNewCampaignTitle('');
    setShowNewCampaignModal(false);
    await loadCampaigns();
  };

  // Guardar o actualizar escena desde el compositor táctil
  const handleSaveSceneFromComposer = async (savedScene: Scene) => {
    if (!activeCampaign) return;

    const exists = activeCampaign.scenes.some((s) => s.id === savedScene.id);
    const updatedScenes = exists
      ? activeCampaign.scenes.map((s) => (s.id === savedScene.id ? savedScene : s))
      : [...activeCampaign.scenes, savedScene];

    const updatedCampaign: Campaign = {
      ...activeCampaign,
      scenes: updatedScenes,
      updatedAt: Date.now(),
    };

    await updateCampaign(updatedCampaign);
    setActiveCampaign(updatedCampaign);
    setIsComposingScene(false);
    setSceneToEdit(null);
    await loadCampaigns();
  };

  // Guardar personaje
  const handleSaveCharacter = async (charData: Partial<Character>) => {
    if (!activeCampaign) return;

    let updatedCharacters: Character[];
    if (charToEdit) {
      updatedCharacters = activeCampaign.characters.map((c) =>
        c.id === charToEdit.id ? ({ ...c, ...charData } as Character) : c
      );
    } else {
      const newChar: Character = {
        id: `char-${Date.now()}`,
        name: charData.name || 'Nuevo Personaje',
        roleOrTitle: charData.roleOrTitle || 'NPC',
        defaultAvatarUrl: charData.defaultAvatarUrl || '',
        bio: charData.bio || '',
        maxHp: charData.maxHp || 30,
      };
      updatedCharacters = [...activeCampaign.characters, newChar];
    }

    const updatedCamp: Campaign = {
      ...activeCampaign,
      characters: updatedCharacters,
      updatedAt: Date.now(),
    };

    await updateCampaign(updatedCamp);
    setActiveCampaign(updatedCamp);
    setShowCharModal(false);
    setCharToEdit(null);
    await loadCampaigns();
  };

  // Eliminar escena
  const handleDeleteScene = async (sceneId: string, sceneName: string) => {
    if (!activeCampaign) return;
    if (activeCampaign.scenes.length <= 1) {
      alert('Debe quedar al menos una escena en la campaña.');
      return;
    }
    if (window.confirm(`¿Eliminar la escena "${sceneName}"?`)) {
      const updatedScenes = activeCampaign.scenes.filter((s) => s.id !== sceneId);
      const updatedCamp = { ...activeCampaign, scenes: updatedScenes, updatedAt: Date.now() };
      await updateCampaign(updatedCamp);
      setActiveCampaign(updatedCamp);
      await loadCampaigns();
    }
  };

  const handleReorderScenes = async (updatedScenes: Scene[]) => {
    if (!activeCampaign || updatedScenes.length !== activeCampaign.scenes.length) return;
    const updatedCampaign = { ...activeCampaign, scenes: updatedScenes, updatedAt: Date.now() };
    setActiveCampaign(updatedCampaign);
    setCampaigns((previous) => previous.map((item) => (item.id === updatedCampaign.id ? updatedCampaign : item)));
    await updateCampaign(updatedCampaign);
  };

  // Eliminar personaje
  const handleDeleteCharacter = async (charId: string, charName: string) => {
    if (!activeCampaign) return;
    if (window.confirm(`¿Eliminar al personaje "${charName}"?`)) {
      const updatedChars = activeCampaign.characters.filter((c) => c.id !== charId);
      const updatedCamp = { ...activeCampaign, characters: updatedChars, updatedAt: Date.now() };
      await updateCampaign(updatedCamp);
      setActiveCampaign(updatedCamp);
      await loadCampaigns();
    }
  };

  return (
    <div
      className="workshop-view-root"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#070b13',
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Cabecera del Taller */}
      <header
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onExitToLobby}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Volver al Inicio"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={18} className="text-amber-400" />
              <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Taller de Preparación
              </h1>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Modo sin Mesa • Creación y biblioteca local
            </span>
          </div>
        </div>

        {/* Selector de Campaña */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={activeCampaign?.id || ''}
            onChange={(e) => handleSelectCampaign(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#fbbf24',
              padding: '6px 10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              maxWidth: '160px',
            }}
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id} style={{ background: '#0f172a', color: '#fff' }}>
                {c.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewCampaignModal(true)}
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              color: '#fbbf24',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Nueva Campaña"
          >
            <Plus size={16} />
          </button>

          <button
            type="button"
            onClick={() => setShowBackupModal(true)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#cbd5e1',
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem',
            }}
            title="Respaldos y Restauración (.vpbackup)"
          >
            <FolderArchive size={15} className="text-amber-400" />
            <span>Respaldos</span>
          </button>
        </div>
      </header>

      <Group
        className="workshop-content-layout"
        orientation={isCompactLayout ? 'vertical' : 'horizontal'}
        defaultLayout={isCompactLayout ? undefined : defaultLayout}
        onLayoutChanged={isCompactLayout ? undefined : onLayoutChanged}
      >
        <Panel
          id="workshop-navigation"
          className="workshop-navigation-panel"
          defaultSize={isCompactLayout ? '116px' : '24%'}
          minSize={isCompactLayout ? '116px' : '18%'}
          maxSize={isCompactLayout ? '116px' : '36%'}
        >
          {/* 2. Pestañas Principales del Taller */}
          <div className="workshop-tab-navigation">
        <button
          type="button"
          onClick={() => handleTabChange('scenes')}
          style={{
            flex: 1,
            padding: '12px 8px',
            border: 'none',
            background: activeTab === 'scenes' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
            color: activeTab === 'scenes' ? '#fbbf24' : '#94a3b8',
            borderBottom: activeTab === 'scenes' ? '2px solid #fbbf24' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <ImageIcon size={16} />
          <span>Escenas ({activeCampaign?.scenes.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('characters')}
          style={{
            flex: 1,
            padding: '12px 8px',
            border: 'none',
            background: activeTab === 'characters' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
            color: activeTab === 'characters' ? '#fbbf24' : '#94a3b8',
            borderBottom: activeTab === 'characters' ? '2px solid #fbbf24' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Users size={16} />
          <span>Personajes ({activeCampaign?.characters.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('assets')}
          style={{
            flex: 1,
            padding: '12px 8px',
            border: 'none',
            background: activeTab === 'assets' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
            color: activeTab === 'assets' ? '#fbbf24' : '#94a3b8',
            borderBottom: activeTab === 'assets' ? '2px solid #fbbf24' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <FolderOpen size={16} />
          <span>Banco de Imágenes</span>
        </button>
          </div>
        </Panel>

        <Separator className="workshop-panel-separator" />

        <Panel id="workshop-content" className="workshop-main-panel" defaultSize="76%" minSize="64%">
          {/* 3. Contenido de la Pestaña Activa */}
          <main className="workshop-main-content">
            {activeTab === 'scenes' && (
              <WorkshopScenesTab
                scenes={activeCampaign?.scenes || []}
                onComposeScene={(sc) => {
                  setSceneToEdit(sc);
                  setIsComposingScene(true);
                }}
            onTransferScene={(sc) => setSceneToTransfer(sc)}
            onDeleteScene={handleDeleteScene}
            onOpenBackupModal={() => setShowBackupModal(true)}
            onReorderScenes={handleReorderScenes}
          />
            )}

            {activeTab === 'characters' && (
              <WorkshopCharactersTab
                characters={activeCampaign?.characters || []}
                onAddCharacter={() => {
                  setCharToEdit(null);
                  setShowCharModal(true);
                }}
                onEditCharacter={(ch) => {
                  setCharToEdit(ch);
                  setShowCharModal(true);
                }}
                onDeleteCharacter={handleDeleteCharacter}
              />
            )}

            {activeTab === 'assets' && (
              <WorkshopAssetsTab
                onOpenResourcePacksModal={() => setShowResourcePacksModal(true)}
                onOpenAssetPicker={() => setShowAssetPicker(true)}
                onOpenBackupModal={() => setShowBackupModal(true)}
              />
            )}
          </main>
        </Panel>
      </Group>

      {/* COMPOSITOR TÁCTIL A PANTALLA COMPLETA */}
      {isComposingScene && activeCampaign && (
        <SceneCanvasComposer
          campaign={activeCampaign}
          initialScene={sceneToEdit}
          onSaveScene={handleSaveSceneFromComposer}
          onClose={() => {
            setIsComposingScene(false);
            setSceneToEdit(null);
          }}
        />
      )}

      {/* MODAL DE PERSONAJE */}
      <CharacterEditModal
        isOpen={showCharModal}
        charToEdit={charToEdit}
        onSave={handleSaveCharacter}
        onClose={() => {
          setShowCharModal(false);
          setCharToEdit(null);
        }}
      />

      {/* ASSET PICKER MODAL */}
      <AssetPickerModal
        isOpen={showAssetPicker}
        mode="all"
        onSelectAsset={() => {
          setShowAssetPicker(false);
        }}
        onClose={() => setShowAssetPicker(false)}
      />

      {/* RESOURCE PACKS MODAL */}
      <ResourcePacksModal
        isOpen={showResourcePacksModal}
        onClose={() => setShowResourcePacksModal(false)}
      />

      {/* MODAL NUEVA CAMPAÑA */}
      <WorkshopNewCampaignModal
        isOpen={showNewCampaignModal}
        title={newCampaignTitle}
        onTitleChange={setNewCampaignTitle}
        onCreateCampaign={handleCreateCampaign}
        onClose={() => setShowNewCampaignModal(false)}
      />

      {/* Modal de Traslado a Sesión Preparada */}
      {sceneToTransfer && (
        <TransferSceneModal
          scene={sceneToTransfer}
          currentCampaignId={activeCampaign?.id}
          onClose={() => setSceneToTransfer(null)}
          onTransferred={() => {
            setSceneToTransfer(null);
          }}
        />
      )}

      {/* Modal de Respaldos Autónomos (.vpbackup) */}
      <BackupManagerModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onRefreshCampaigns={loadCampaigns}
      />
    </div>
  );
};
