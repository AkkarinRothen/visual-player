import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Users,
  FolderOpen,
  Compass,
  Send,
  FolderArchive,
  Package,
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
import { App as CapApp } from '@capacitor/app';

export interface WorkshopViewProps {
  onExitToLobby: () => void;
}

export const WorkshopView: React.FC<WorkshopViewProps> = ({ onExitToLobby }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters' | 'assets'>('scenes');

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

  // Manejo del botón Atrás de Android
  useEffect(() => {
    const backListener = CapApp.addListener('backButton', () => {
      if (isComposingScene) {
        setIsComposingScene(false);
        setSceneToEdit(null);
        return;
      }
      if (showCharModal) {
        setShowCharModal(false);
        setCharToEdit(null);
        return;
      }
      if (showAssetPicker) {
        setShowAssetPicker(false);
        return;
      }
      if (showResourcePacksModal) {
        setShowResourcePacksModal(false);
        return;
      }
      if (showNewCampaignModal) {
        setShowNewCampaignModal(false);
        return;
      }
      onExitToLobby();
    });

    return () => {
      backListener.then((sub) => sub.remove()).catch(() => {});
    };
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

      {/* 2. Pestañas Principales del Taller */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.25)',
          padding: '0 12px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('scenes')}
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
          onClick={() => setActiveTab('characters')}
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
          onClick={() => setActiveTab('assets')}
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

      {/* 3. Contenido de la Pestaña Activa */}
      <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {/* PESTAÑA 1: ESCENAS */}
        {activeTab === 'scenes' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Escenas Preparadas</h2>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  Toca una escena para editarla a pantalla completa
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowBackupModal(true)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Copias de Seguridad (.vpbackup)"
                >
                  <FolderArchive size={16} className="text-amber-400" />
                  <span>Respaldos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSceneToEdit(null);
                    setIsComposingScene(true);
                  }}
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
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                  }}
                >
                  <Plus size={16} />
                  <span>Nueva Escena</span>
                </button>
              </div>
            </div>

            {activeCampaign?.scenes.length === 0 ? (
              <div
                style={{
                  border: '2px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#9ca3af',
                }}
              >
                <ImageIcon size={40} className="text-amber-400" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                <h3 style={{ color: '#f3f4f6', margin: '0 0 6px' }}>No hay escenas en esta campaña</h3>
                <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                  Empieza creando tu primer escenario con un fondo y personajes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSceneToEdit(null);
                    setIsComposingScene(true);
                  }}
                  style={{
                    background: '#d97706',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Crear Primera Escena
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {activeCampaign?.scenes.map((sc) => (
                  <div
                    key={sc.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* Miniatura 16:9 */}
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '16/9',
                        width: '100%',
                        background: '#020408',
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSceneToEdit(sc);
                        setIsComposingScene(true);
                      }}
                    >
                      <img
                        src={sc.backgroundUrl}
                        alt={sc.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(6px)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          color: '#fbbf24',
                          fontWeight: 700,
                        }}
                      >
                        {sc.locationBanner || sc.name}
                      </div>

                      {sc.activeCharacters && sc.activeCharacters.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.75)',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Users size={12} />
                          <span>{sc.activeCharacters.length} en escena</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata y Acciones */}
                    <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>
                          {sc.name}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {sc.subtitle || 'Sin subtítulo'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSceneToEdit(sc);
                            setIsComposingScene(true);
                          }}
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '6px',
                            color: '#fbbf24',
                            padding: '8px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit size={14} />
                          <span>Componer</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSceneToTransfer(sc)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '6px',
                            color: '#60a5fa',
                            padding: '8px 10px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                          title="Llevar a sesión preparada"
                        >
                          <Send size={14} />
                          <span>Llevar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteScene(sc.id, sc.name)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            color: '#f87171',
                            padding: '8px',
                            cursor: 'pointer',
                          }}
                          title="Eliminar escena"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: PERSONAJES */}
        {activeTab === 'characters' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Personajes & NPCs</h2>
                <span style={{ fontSize: '0.8rem', color: '#94a3af' }}>
                  Fichas listas para invocar en cualquier escena
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCharToEdit(null);
                  setShowCharModal(true);
                }}
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
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Nuevo Personaje</span>
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {activeCampaign?.characters.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <img
                    src={ch.defaultAvatarUrl}
                    alt={ch.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(245, 158, 11, 0.4)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ch.name}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{ch.roleOrTitle}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCharToEdit(ch);
                        setShowCharModal(true);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: 'none',
                        color: '#cbd5e1',
                        borderRadius: '6px',
                        padding: '6px',
                        cursor: 'pointer',
                      }}
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCharacter(ch.id, ch.name)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        color: '#f87171',
                        borderRadius: '6px',
                        padding: '6px',
                        cursor: 'pointer',
                      }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: BANCO DE IMÁGENES */}
        {activeTab === 'assets' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FolderOpen size={48} className="text-amber-400" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
            <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
              Banco de Recursos Multimedia
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '420px', margin: '0 auto 20px' }}>
              Importa fotos locales desde tu dispositivo o inspecciona las imágenes guardadas en la base de datos local para reutilizarlas en tus escenas.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowResourcePacksModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(217, 119, 6, 0.3)',
                }}
              >
                <Package size={18} />
                <span>Instalar Packs de Recursos (.vppack)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAssetPicker(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FolderOpen size={18} className="text-amber-400" />
                <span>Explorar Galería de Medios</span>
              </button>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setShowBackupModal(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#cbd5e1',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FolderArchive size={18} className="text-amber-400" />
                <span>Gestionar Respaldos y Restauración (.vpbackup)</span>
              </button>
            </div>
          </div>
        )}
      </main>

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
      {showNewCampaignModal && (
        <div className="modal-overlay" onClick={() => setShowNewCampaignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Crear Nueva Campaña</h3>
            <form onSubmit={handleCreateCampaign}>
              <input
                type="text"
                required
                placeholder="Nombre de la Campaña"
                value={newCampaignTitle}
                onChange={(e) => setNewCampaignTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#9ca3af',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    background: '#d97706',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
