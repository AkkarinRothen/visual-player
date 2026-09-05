import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Users,
  Layers,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  FlipHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Move,
  Hand,
  Maximize2,
  Send,
  Plus,
  Minus,
  MoreVertical,
  X,
} from 'lucide-react';
import type {
  Campaign,
  Scene,
  Character,
  CharacterOnScreen,
  WeatherType,
  LightingFilter,
  CameraTransform,
} from '../../../types';
import { AssetPickerModal } from '../../common/AssetPickerModal';
import { TransferSceneModal } from '../workshop/TransferSceneModal';
import { db } from '../../../db';
import {
  saveSceneDraft,
  getSceneDraft,
  clearSceneDraft,
  createSceneCopyFromDraft,
  type SceneDraftState,
} from '../../../services/draftStorageService';

export interface SceneCanvasComposerProps {
  campaign: Campaign;
  initialScene?: Scene | null;
  onSaveScene: (scene: Scene) => Promise<void> | void;
  onClose: () => void;
  onUpdateCampaign?: (campaign: Campaign) => Promise<void> | void;
  onOpenSession?: (sessionId: string) => void;
}

export const SceneCanvasComposer: React.FC<SceneCanvasComposerProps> = ({
  campaign,
  initialScene,
  onSaveScene,
  onClose,
  onUpdateCampaign,
  onOpenSession,
}) => {
  // Scene metadata
  const [sceneName, setSceneName] = useState(initialScene?.name || 'Nueva Escena');
  const [backgroundUrl, setBackgroundUrl] = useState(initialScene?.backgroundUrl || '');
  const [locationBanner, setLocationBanner] = useState(initialScene?.locationBanner || '');
  const [subtitle, setSubtitle] = useState(initialScene?.subtitle || '');
  const [weather, setWeather] = useState<WeatherType>(initialScene?.weather || 'none');
  const [lighting, setLighting] = useState<LightingFilter>(initialScene?.lighting || 'normal');
  const [ambientAudioUrl, setAmbientAudioUrl] = useState(initialScene?.ambientAudioUrl || '');
  const [ambientAudioName, setAmbientAudioName] = useState(initialScene?.ambientAudioName || '');
  const [dmNotes, setDmNotes] = useState(initialScene?.dmNotes || '');

  // Characters on scene
  const [characters, setCharacters] = useState<CharacterOnScreen[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  // Editor zoom vs Mesa camera
  const [editorZoom, setEditorZoom] = useState<number>(1);
  const [cameraTransform] = useState<CameraTransform>(
    initialScene?.defaultCamera || { focalPoint: { x: 50, y: 50 }, zoom: 1 }
  );

  // Bottom tray active tab
  const [activeBottomTab, setActiveBottomTab] = useState<'background' | 'characters' | 'layers' | 'fx'>('characters');

  // Modals
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [assetPickerMode, setAssetPickerMode] = useState<'background' | 'character'>('background');

  // Modos táctiles inequívocos
  const [touchMode, setTouchMode] = useState<'characters' | 'viewport' | 'background'>('characters');
  const [editorPan, setEditorPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bgOffset, setBgOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // D-pad steps en unidades del escenario 1920x1080 (Fino 1px, Normal 5px, Amplio 20px)
  const [dpadPreset, setDpadPreset] = useState<'fine' | 'normal' | 'coarse'>('normal');

  // Menú secundario (...)
  const [showSecondaryMenu, setShowSecondaryMenu] = useState(false);

  // Creación contextual rápida de personajes
  const [showQuickCharModal, setShowQuickCharModal] = useState(false);
  const [quickCharName, setQuickCharName] = useState('');
  const [quickCharAvatar, setQuickCharAvatar] = useState('');
  const [isCreatingChar, setIsCreatingChar] = useState(false);

  // Modal de traslado a preparación
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Autosave status
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving'>('saved');
  const [isSaving, setIsSaving] = useState(false);

  // Resiliencia de borrador ante cierres o interrupciones de Android
  const [recoveredDraft, setRecoveredDraft] = useState<SceneDraftState | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragCharIdRef = useRef<string | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; initX: number; initY: number } | null>(null);
  const touchStartRef = useRef<{
    clientX: number;
    clientY: number;
    initNormX: number;
    initNormY: number;
    charId: string;
    isDragStarted: boolean;
  } | null>(null);

  // Inicializar personajes de la escena y comprobar si existe borrador más reciente
  useEffect(() => {
    if (initialScene) {
      setSceneName(initialScene.name);
      setBackgroundUrl(initialScene.backgroundUrl);
      setLocationBanner(initialScene.locationBanner || initialScene.name);
      setSubtitle(initialScene.subtitle || '');
      setWeather(initialScene.weather || 'none');
      setLighting(initialScene.lighting || 'normal');
      setAmbientAudioUrl(initialScene.ambientAudioUrl || '');
      setAmbientAudioName(initialScene.ambientAudioName || '');
      setDmNotes(initialScene.dmNotes || '');

      // Si la escena tiene personajes asignados
      if (initialScene.activeCharacters && initialScene.activeCharacters.length > 0) {
        setCharacters(initialScene.activeCharacters);
      }
    } else {
      // Escena nueva con fondo por defecto si no hay
      if (!backgroundUrl && campaign.scenes.length > 0) {
        setBackgroundUrl(campaign.scenes[0].backgroundUrl);
      }
    }

    // Comprobar si existe un borrador no consolidado
    const sceneId = initialScene?.id || 'new_scene';
    const draft = getSceneDraft(campaign.id, sceneId);
    if (draft && draft.characters && draft.characters.length > 0) {
      const savedTime = (initialScene as any)?.updatedAt || 0;
      if (draft.updatedAt > savedTime) {
        setRecoveredDraft(draft);
        setShowDraftModal(true);
      }
    }
  }, [initialScene, campaign.id]);

  // Persistencia atómica e inmediata del borrador
  const persistDraftNow = (nextChars: CharacterOnScreen[], nextBg = bgOffset, nextZoom = editorZoom) => {
    setDraftStatus('saving');
    saveSceneDraft({
      campaignId: campaign.id,
      sceneId: initialScene?.id || 'new_scene',
      sceneName,
      characters: nextChars,
      bgOffset: nextBg,
      editorZoom: nextZoom,
      selectedCharId,
      activeTab: 'figures',
      updatedAt: Date.now(),
      revision: Date.now(),
      savedSceneTimestamp: (initialScene as any)?.updatedAt,
    });
    setTimeout(() => {
      setDraftStatus('saved');
    }, 200);
  };

  // Autoguardado debounced para cambios continuos (texto, filtros, zoom)
  useEffect(() => {
    const timer = setTimeout(() => {
      persistDraftNow(characters, bgOffset, editorZoom);
    }, 600);
    return () => clearTimeout(timer);
  }, [sceneName, backgroundUrl, characters, weather, lighting, bgOffset, editorZoom]);

  // Manejar añadir un personaje existente al lienzo
  const handleAddCharacterToCanvas = (char: Character) => {
    const existingCount = characters.length;
    const spacing = 18;
    const posX = Math.min(85, Math.max(15, 20 + (existingCount % 4) * spacing));
    const posY = 75; // Apoyo en suelo

    const newChar: CharacterOnScreen = {
      id: `char-inst-${char.id}-${Date.now()}`,
      characterId: char.id,
      name: char.name,
      avatarUrl: char.defaultAvatarUrl,
      position: 'center-left',
      normalizedX: posX / 100,
      normalizedY: posY / 100,
      scale: 1,
      isSpeaking: false,
      visualAnchorOffsetY: 0,
    };

    setCharacters((prev) => [...prev, newChar]);
    setSelectedCharId(newChar.id);
    setTouchMode('characters');
    persistDraftNow([...characters, newChar]);
  };

  // Creación y colocación contextual de un personaje nuevo sin salir
  const handleCreateAndAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCharName.trim() || !quickCharAvatar) {
      alert('Por favor indica un nombre y selecciona una imagen para el personaje.');
      return;
    }

    setIsCreatingChar(true);
    try {
      const newCharId = `char-${Date.now()}`;
      const newChar: Character = {
        id: newCharId,
        name: quickCharName.trim(),
        roleOrTitle: 'NPC',
        defaultAvatarUrl: quickCharAvatar,
        bio: '',
        maxHp: 30,
      };

      // 1. Guardar en campaña
      const updatedCampaign: Campaign = {
        ...campaign,
        characters: [...campaign.characters, newChar],
        updatedAt: Date.now(),
      };

      await db.campaigns.put(updatedCampaign);
      if (onUpdateCampaign) {
        await onUpdateCampaign(updatedCampaign);
      }

      // 2. Colocar inmediatamente en el lienzo en posición visible y despejada
      const existingCount = characters.length;
      const posX = Math.min(85, Math.max(15, 25 + (existingCount % 4) * 16));
      const posY = 75;

      const newCharInstance: CharacterOnScreen = {
        id: `char-inst-${newChar.id}-${Date.now()}`,
        characterId: newChar.id,
        name: newChar.name,
        avatarUrl: newChar.defaultAvatarUrl,
        position: 'center-left',
        normalizedX: posX / 100,
        normalizedY: posY / 100,
        scale: 1,
        isSpeaking: false,
        visualAnchorOffsetY: 0,
      };

      const nextChars = [...characters, newCharInstance];
      setCharacters(nextChars);
      setSelectedCharId(newCharInstance.id);
      setTouchMode('characters');
      persistDraftNow(nextChars);

      // 3. Limpiar y cerrar formulario rápido
      setQuickCharName('');
      setQuickCharAvatar('');
      setShowQuickCharModal(false);
    } catch (err) {
      console.error('Error al crear y colocar personaje:', err);
      alert('Hubo un error al crear la ficha del personaje.');
    } finally {
      setIsCreatingChar(false);
    }
  };

  // Quitar personaje del lienzo
  const handleRemoveCharacter = (id: string) => {
    const nextChars = characters.filter((c) => c.id !== id);
    setCharacters(nextChars);
    if (selectedCharId === id) setSelectedCharId(null);
    persistDraftNow(nextChars);
  };

  // Pasos fijos en unidades del escenario lógico 1920x1080 (independientes del zoom)
  const getDpadDeltas = (preset: 'fine' | 'normal' | 'coarse') => {
    switch (preset) {
      case 'fine':
        // 1 unidad del escenario
        return { dx: 1 / 1920, dy: 1 / 1080 };
      case 'normal':
        // 5 unidades del escenario
        return { dx: 5 / 1920, dy: 5 / 1080 };
      case 'coarse':
        // 20 unidades del escenario
        return { dx: 20 / 1920, dy: 20 / 1080 };
    }
  };

  const clampStageX = (x: number) => Math.max(0.01, Math.min(0.99, x));
  const clampStageY = (y: number) => Math.max(0.02, Math.min(0.98, y));

  // Micro-ajuste fino con D-pad (←, ↑, ↓, →) sin tapar la figura con el dedo
  const handleNudge = (id: string, deltaX: number, deltaY: number) => {
    setCharacters((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        const nextX = clampStageX((c.normalizedX ?? 0.5) + deltaX);
        const nextY = clampStageY((c.normalizedY ?? 0.7) + deltaY);
        return {
          ...c,
          normalizedX: nextX,
          normalizedY: nextY,
        };
      });
      persistDraftNow(next);
      return next;
    });
  };

  // Cambiar escala de figura seleccionada
  const handleScaleChange = (id: string, delta: number) => {
    setCharacters((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        const currentScale = c.scale ?? 1;
        const nextScale = Math.max(0.4, Math.min(2.5, currentScale + delta));
        return { ...c, scale: nextScale };
      });
      persistDraftNow(next);
      return next;
    });
  };

  // Voltear figura (espejo)
  const handleToggleMirror = (id: string) => {
    setCharacters((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        return { ...c, isFlipped: !c.isFlipped };
      });
      persistDraftNow(next);
      return next;
    });
  };

  // Reordenar capas (traer al frente o atrás)
  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    setCharacters((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index + 1 : index - 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      persistDraftNow(copy);
      return copy;
    });
  };

  // Manejo táctil sobre figura (en modo characters)
  const handleFigureTouchStart = (charId: string, e: React.TouchEvent | React.MouseEvent) => {
    if (touchMode !== 'characters') return;
    e.stopPropagation();
    setSelectedCharId(charId);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const char = characters.find((c) => c.id === charId);
    if (!char) return;

    touchStartRef.current = {
      clientX,
      clientY,
      initNormX: char.normalizedX ?? 0.5,
      initNormY: char.normalizedY ?? 0.75,
      charId,
      isDragStarted: false,
    };
  };

  // Manejo táctil general sobre el lienzo según el modo activo
  const handleCanvasTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (touchMode === 'viewport') {
      panStartRef.current = {
        clientX,
        clientY,
        initX: editorPan.x,
        initY: editorPan.y,
      };
      isDraggingRef.current = true;
    } else if (touchMode === 'background') {
      panStartRef.current = {
        clientX,
        clientY,
        initX: bgOffset.x,
        initY: bgOffset.y,
      };
      isDraggingRef.current = true;
    } else {
      // Modo characters: tocar fondo deselecciona figura
      setSelectedCharId(null);
      touchStartRef.current = null;
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (touchMode === 'characters') {
      if (!touchStartRef.current || !canvasRef.current) return;
      const dxScreen = clientX - touchStartRef.current.clientX;
      const dyScreen = clientY - touchStartRef.current.clientY;
      const dist = Math.hypot(dxScreen, dyScreen);

      // Umbral de tolerancia de 10px antes de iniciar arrastre relativo
      if (!touchStartRef.current.isDragStarted) {
        if (dist >= 10) {
          touchStartRef.current.isDragStarted = true;
          isDraggingRef.current = true;
          dragCharIdRef.current = touchStartRef.current.charId;
        }
      }

      if (touchStartRef.current.isDragStarted) {
        const rect = canvasRef.current.getBoundingClientRect();
        const deltaNormX = dxScreen / rect.width;
        const deltaNormY = dyScreen / rect.height;

        const newX = clampStageX(touchStartRef.current.initNormX + deltaNormX);
        const newY = clampStageY(touchStartRef.current.initNormY + deltaNormY);

        setCharacters((prev) =>
          prev.map((c) => {
            if (c.id !== touchStartRef.current?.charId) return c;
            return {
              ...c,
              normalizedX: newX,
              normalizedY: newY,
            };
          })
        );
      }
    } else if (touchMode === 'viewport') {
      if (!isDraggingRef.current || !panStartRef.current) return;
      const deltaX = clientX - panStartRef.current.clientX;
      const deltaY = clientY - panStartRef.current.clientY;
      setEditorPan({
        x: panStartRef.current.initX + deltaX,
        y: panStartRef.current.initY + deltaY,
      });
    } else if (touchMode === 'background') {
      if (!isDraggingRef.current || !panStartRef.current) return;
      const deltaX = clientX - panStartRef.current.clientX;
      const deltaY = clientY - panStartRef.current.clientY;
      setBgOffset({
        x: Math.max(-100, Math.min(100, panStartRef.current.initX + deltaX * 0.2)),
        y: Math.max(-100, Math.min(100, panStartRef.current.initY + deltaY * 0.2)),
      });
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current?.isDragStarted) {
      persistDraftNow(characters);
    }
    touchStartRef.current = null;
    isDraggingRef.current = false;
    dragCharIdRef.current = null;
    panStartRef.current = null;
  };

  // Construir objeto Scene completo actual
  const buildCurrentSceneData = (): Scene => ({
    id: initialScene?.id || `scene-${Date.now()}`,
    name: sceneName.trim() || 'Escena sin título',
    backgroundUrl,
    locationBanner: locationBanner.trim() || sceneName.trim(),
    subtitle: subtitle.trim(),
    weather,
    lighting,
    ambientAudioUrl,
    ambientAudioName,
    dmNotes,
    activeCharacters: characters,
    defaultCamera: cameraTransform,
  });

  // Guardar escena final
  const handleSave = async () => {
    if (!sceneName.trim() || !backgroundUrl) {
      alert('La escena requiere un nombre y una imagen de fondo.');
      return;
    }

    setIsSaving(true);
    try {
      const sceneData = buildCurrentSceneData();
      await onSaveScene(sceneData);
      clearSceneDraft(campaign.id, sceneData.id);
      onClose();
    } catch (err) {
      console.error('Error guardando escena:', err);
      alert('Hubo un error al guardar la escena.');
    } finally {
      setIsSaving(false);
    }
  };

  // Abrir modal de traslado a preparación (guardando antes si es necesario)
  const handleOpenTransfer = async () => {
    if (!sceneName.trim() || !backgroundUrl) {
      alert('Primero asigna un nombre y fondo a la escena antes de llevarla a preparación.');
      return;
    }
    const sceneData = buildCurrentSceneData();
    await onSaveScene(sceneData);
    setShowTransferModal(true);
  };

  const selectedChar = characters.find((c) => c.id === selectedCharId);

  return (
    <div
      className="scene-canvas-composer-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#06090e',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
      onMouseUp={handleTouchEnd}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. TOP HEADER (Limpio y Táctil) */}
      <header
        style={{
          height: '56px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
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
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>

          <input
            type="text"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            placeholder="Nombre de la Escena"
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              padding: '4px 6px',
              flex: 1,
              minWidth: '100px',
              maxWidth: '220px',
              outline: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: draftStatus === 'saving' ? '#fbbf24' : '#10b981',
              background: 'rgba(255,255,255,0.04)',
              padding: '4px 8px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Check size={12} />
            <span>{draftStatus === 'saving' ? 'Guardando...' : 'Borrador guardado'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '7px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isSaving ? 'wait' : 'pointer',
              boxShadow: '0 2px 10px rgba(217, 119, 6, 0.4)',
              whiteSpace: 'nowrap',
            }}
            title="Guardar escena permanentemente en campaña"
          >
            <Save size={15} />
            <span>{isSaving ? '...' : 'Guardar'}</span>
          </button>

          {/* Menú secundario (...) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowSecondaryMenu((v) => !v)}
              style={{
                background: showSecondaryMenu ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#cbd5e1',
                padding: '7px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Más acciones de la escena"
            >
              <MoreVertical size={16} />
            </button>

            {showSecondaryMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '210px',
                  background: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 999,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowSecondaryMenu(false);
                    handleOpenTransfer();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fbbf24',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Send size={14} />
                  <span>Añadir a preparación</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSecondaryMenu(false);
                    setAssetPickerMode('background');
                    setShowAssetPicker(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#cbd5e1',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <ImageIcon size={14} />
                  <span>Cambiar fondo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BARRA DE MODOS TÁCTILES INEQUÍVOCOS */}
      <div
        style={{
          background: '#090d16',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          zIndex: 80,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setTouchMode('characters');
          }}
          style={{
            background: touchMode === 'characters' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: touchMode === 'characters' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
            color: touchMode === 'characters' ? '#fbbf24' : '#94a3b8',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Move size={14} />
          <span>Mover Figuras</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTouchMode('viewport');
          }}
          style={{
            background: touchMode === 'viewport' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: touchMode === 'viewport' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
            color: touchMode === 'viewport' ? '#38bdf8' : '#94a3b8',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Hand size={14} />
          <span>Desplazar Vista</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTouchMode('background');
          }}
          style={{
            background: touchMode === 'background' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: touchMode === 'background' ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
            color: touchMode === 'background' ? '#c084fc' : '#94a3b8',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Maximize2 size={14} />
          <span>Ajustar Fondo</span>
        </button>
      </div>

      {/* 2. LIENZO CENTRAL 16:9 PROTAGONISTA */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#04070c',
          padding: '8px',
          overflow: 'hidden',
          position: 'relative',
          cursor: touchMode === 'viewport' ? 'grab' : touchMode === 'background' ? 'crosshair' : 'default',
        }}
        onMouseDown={handleCanvasTouchStart}
        onTouchStart={handleCanvasTouchStart}
        onMouseMove={handleCanvasTouchMove}
        onTouchMove={handleCanvasTouchMove}
      >
        {/* Contenedor estricto 16:9 */}
        <div
          ref={canvasRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1000px',
            aspectRatio: '16/9',
            maxHeight: '100%',
            background: '#0a0f18',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,255,255,0.15)',
            transform: `translate(${editorPan.x}px, ${editorPan.y}px) scale(${editorZoom})`,
            transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {/* Fondo de Escena con ajuste en modo background */}
          {backgroundUrl ? (
            <img
              src={backgroundUrl}
              alt="Fondo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                transform: `translate(${bgOffset.x}px, ${bgOffset.y}px)`,
                transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
              }}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setAssetPickerMode('background');
                setShowAssetPicker(true);
              }}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                gap: '12px',
                color: '#94a3b8',
              }}
            >
              <ImageIcon size={48} className="text-amber-400" />
              <strong>Toca aquí para elegir el Fondo de la Escena</strong>
              <span style={{ fontSize: '0.85rem' }}>Acepta fotos de tu dispositivo o de tu biblioteca</span>
            </div>
          )}

          {/* Filtros ambientales visuales */}
          {lighting === 'night' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.65)', mixBlendMode: 'multiply', pointerEvents: 'none' }} />
          )}
          {lighting === 'sunset' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(249, 115, 22, 0.35)', mixBlendMode: 'color', pointerEvents: 'none' }} />
          )}
          {lighting === 'blood_moon' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(185, 28, 28, 0.45)', mixBlendMode: 'multiply', pointerEvents: 'none' }} />
          )}

          {/* Banner indicador de ubicación */}
          {locationBanner && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                padding: '4px 16px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 700,
                pointerEvents: 'none',
              }}
            >
              {locationBanner}
            </div>
          )}

          {/* Personajes sobre el lienzo */}
          {characters.map((char, index) => {
            const isSelected = char.id === selectedCharId;
            const x = (char.normalizedX ?? 0.5) * 100;
            const y = (char.normalizedY ?? 0.75) * 100;
            const scale = char.scale ?? 1;

            return (
              <div
                key={char.id}
                onMouseDown={(e) => handleFigureTouchStart(char.id, e)}
                onTouchStart={(e) => handleFigureTouchStart(char.id, e)}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -100%) scale(${scale}) ${char.isFlipped ? 'scaleX(-1)' : ''}`,
                  transformOrigin: 'bottom center',
                  cursor: touchMode === 'characters' ? 'grab' : 'default',
                  zIndex: 10 + index,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* Indicador de selección */}
                {isSelected && touchMode === 'characters' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-6px',
                      border: '2px solid #fbbf24',
                      borderRadius: '12px',
                      boxShadow: '0 0 16px rgba(245, 158, 11, 0.6)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                <img
                  src={char.avatarUrl}
                  alt={char.name}
                  style={{
                    maxHeight: '160px',
                    maxWidth: '120px',
                    objectFit: 'contain',
                    filter: isSelected && touchMode === 'characters' ? 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.5))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
                    pointerEvents: 'none',
                  }}
                />

                <span
                  style={{
                    marginTop: '4px',
                    background: 'rgba(0,0,0,0.75)',
                    color: isSelected && touchMode === 'characters' ? '#fbbf24' : '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    transform: char.isFlipped ? 'scaleX(-1)' : 'none',
                  }}
                >
                  {char.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Indicador y ayuda contextual para modo Viewport */}
        {touchMode === 'viewport' && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '10px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.8rem',
              color: '#bae6fd',
              zIndex: 95,
            }}
          >
            <span>Desplaza con el dedo para ver detalles</span>
            <button
              type="button"
              onClick={() => {
                setEditorPan({ x: 0, y: 0 });
                setEditorZoom(1);
              }}
              style={{
                background: 'rgba(56, 189, 248, 0.2)',
                border: 'none',
                color: '#38bdf8',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ajustar a la vista
            </button>
          </div>
        )}

        {/* Indicador y ayuda contextual para modo Background */}
        {touchMode === 'background' && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '10px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.8rem',
              color: '#e9d5ff',
              zIndex: 95,
            }}
          >
            <span>Arrastra para re-encuadrar el fondo 16:9</span>
            <button
              type="button"
              onClick={() => setBgOffset({ x: 0, y: 0 })}
              style={{
                background: 'rgba(168, 85, 247, 0.2)',
                border: 'none',
                color: '#c084fc',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Restablecer fondo
            </button>
          </div>
        )}

        {/* Controles de Zoom del Editor */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 90,
          }}
        >
          <button
            type="button"
            onClick={() => setEditorZoom((z) => Math.max(0.7, z - 0.1))}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer' }}
            title="Reducir vista"
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1', minWidth: '38px', textAlign: 'center' }}>
            {Math.round(editorZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setEditorZoom((z) => Math.min(1.8, z + 0.1))}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer' }}
            title="Ampliar vista"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => setEditorZoom(1)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer' }}
            title="Restablecer vista"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* 3. BANDEJA INFERIOR UNIFICADA (Panel de Figura o Bandeja de Escena con altura fija) */}
      <div
        style={{
          height: '185px',
          background: '#090d16',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {selectedChar && touchMode === 'characters' ? (
          /* PANEL DE EDICIÓN DE FIGURA SELECCIONADA */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Cabecera compacta de la figura */}
            <div
              style={{
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
                background: 'rgba(245, 158, 11, 0.08)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <img
                  src={selectedChar.avatarUrl}
                  alt=""
                  style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #fbbf24', flexShrink: 0 }}
                />
                <strong style={{ fontSize: '0.88rem', color: '#fbbf24', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedChar.name}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleMirror(selectedChar.id)}
                  style={{
                    background: selectedChar.isFlipped ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: selectedChar.isFlipped ? '#fbbf24' : '#cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                  title="Reflejo horizontal (espejo)"
                >
                  <FlipHorizontal size={13} />
                  <span>Espejo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMoveLayer(selectedChar.id, 'down')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  title="Capa hacia atrás"
                >
                  <ChevronDown size={14} />
                  <span>Atrás</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMoveLayer(selectedChar.id, 'up')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  title="Capa hacia adelante"
                >
                  <ChevronUp size={14} />
                  <span>Adelante</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveCharacter(selectedChar.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  title="Retirar de la escena"
                >
                  <Trash2 size={13} />
                  <span>Retirar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCharId(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                  title="Cerrar ajustes y volver a las herramientas"
                >
                  <Check size={13} />
                  <span>Volver a herramientas</span>
                </button>
              </div>
            </div>

            {/* Ajustes de Escala y Cruceta D-Pad */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '6px 12px',
                gap: '16px',
              }}
            >
              {/* Sección Tamaño / Escala */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tamaño:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleScaleChange(selectedChar.id, -0.05)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    <Minus size={14} />
                  </button>

                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', minWidth: '44px', textAlign: 'center' }}>
                    {Math.round((selectedChar.scale ?? 1) * 100)}%
                  </span>

                  <button
                    type="button"
                    onClick={() => handleScaleChange(selectedChar.id, 0.05)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Sección D-Pad con pasos Fino (1px), Normal (5px) y Amplio (20px) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Paso D-Pad:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setDpadPreset('fine')}
                      style={{
                        background: dpadPreset === 'fine' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)',
                        border: dpadPreset === 'fine' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                        color: dpadPreset === 'fine' ? '#fbbf24' : '#cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Fino (1px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDpadPreset('normal')}
                      style={{
                        background: dpadPreset === 'normal' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)',
                        border: dpadPreset === 'normal' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                        color: dpadPreset === 'normal' ? '#fbbf24' : '#cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Normal (5px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDpadPreset('coarse')}
                      style={{
                        background: dpadPreset === 'coarse' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)',
                        border: dpadPreset === 'coarse' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                        color: dpadPreset === 'coarse' ? '#fbbf24' : '#cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Amplio (20px)
                    </button>
                  </div>
                </div>

                {/* Botones de la Cruceta */}
                {(() => {
                  const deltas = getDpadDeltas(dpadPreset);
                  return (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 34px)',
                        gridTemplateRows: 'repeat(2, 34px)',
                        gap: '3px',
                        alignItems: 'center',
                        justifyItems: 'center',
                      }}
                    >
                      <div />
                      <button
                        type="button"
                        onClick={() => handleNudge(selectedChar.id, 0, -deltas.dy)}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Subir figura"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <div />

                      <button
                        type="button"
                        onClick={() => handleNudge(selectedChar.id, -deltas.dx, 0)}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Izquierda"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNudge(selectedChar.id, 0, deltas.dy)}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Bajar figura"
                      >
                        <ChevronDown size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNudge(selectedChar.id, deltas.dx, 0)}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Derecha"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          /* BANDEJA ESTÁNDAR CON PESTAÑAS (Fondo, Personajes, Capas, Ambiente) */
          <>
            {/* Contenido contextual de la pestaña activa */}
            <div style={{ flex: 1, padding: '10px 14px', overflowY: 'auto' }}>
          {/* TAB 1: FONDO */}
          {activeBottomTab === 'background' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '90px',
                  height: '50px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {backgroundUrl ? (
                  <img src={backgroundUrl} alt="Fondo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                    <ImageIcon size={20} />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setAssetPickerMode('background');
                  setShowAssetPicker(true);
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
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <ImageIcon size={16} />
                <span>{backgroundUrl ? 'Cambiar Fondo (Fotos / Galería)' : 'Elegir Fondo'}</span>
              </button>

              <div style={{ flex: 1, minWidth: '180px' }}>
                <input
                  type="text"
                  value={locationBanner}
                  onChange={(e) => setLocationBanner(e.target.value)}
                  placeholder="Título en Pantalla (ej: Taberna del Dragón)"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAJES */}
          {activeBottomTab === 'characters' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setQuickCharName('');
                  setQuickCharAvatar('');
                  setShowQuickCharModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)',
                }}
                title="Crear un nuevo personaje e insertarlo directamente"
              >
                <Plus size={16} />
                <span>Nuevo</span>
              </button>

              <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                Toca para añadir:
              </span>

              {campaign.characters.map((ch) => {
                const isOnScreen = characters.some((c) => c.characterId === ch.id);

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleAddCharacterToCanvas(ch)}
                    style={{
                      background: isOnScreen ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.06)',
                      border: isOnScreen ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={ch.defaultAvatarUrl}
                      alt={ch.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>{ch.name}</span>
                    {isOnScreen && <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: CAPAS */}
          {activeBottomTab === 'layers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {characters.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No hay personajes en la escena todavía.</span>
              ) : (
                characters.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => setSelectedCharId(char.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: char.id === selectedCharId ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.04)',
                      border: char.id === selectedCharId ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={char.avatarUrl}
                        alt={char.name}
                        style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#fff' }}>{char.name}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveLayer(char.id, 'up');
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                        title="Subir capa"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveLayer(char.id, 'down');
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                        title="Bajar capa"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: FX Y AMBIENTE */}
          {activeBottomTab === 'fx' && (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
                  Iluminación
                </label>
                <select
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value as LightingFilter)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="normal">Normal</option>
                  <option value="night">Noche</option>
                  <option value="sunset">Atardecer</option>
                  <option value="blood_moon">Luna de Sangre</option>
                  <option value="torch_flicker">Antorcha</option>
                  <option value="mystic_violet">Místico Violeta</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
                  Clima
                </label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as WeatherType)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="none">Despejado</option>
                  <option value="rain">Lluvia</option>
                  <option value="storm">Tormenta</option>
                  <option value="snow">Nieve</option>
                  <option value="fog">Niebla</option>
                  <option value="embers">Brasas</option>
                  <option value="fireflies">Luciérnagas</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Barra de pestañas táctil estable */}
        <div
          style={{
            display: 'flex',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveBottomTab('background')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              background: activeBottomTab === 'background' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeBottomTab === 'background' ? '#fbbf24' : '#94a3b8',
              borderTop: activeBottomTab === 'background' ? '2px solid #fbbf24' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <ImageIcon size={16} />
            <span>Fondo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBottomTab('characters')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              background: activeBottomTab === 'characters' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeBottomTab === 'characters' ? '#fbbf24' : '#94a3b8',
              borderTop: activeBottomTab === 'characters' ? '2px solid #fbbf24' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Users size={16} />
            <span>Personajes ({characters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBottomTab('layers')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              background: activeBottomTab === 'layers' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeBottomTab === 'layers' ? '#fbbf24' : '#94a3b8',
              borderTop: activeBottomTab === 'layers' ? '2px solid #fbbf24' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Layers size={16} />
            <span>Capas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBottomTab('fx')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              background: activeBottomTab === 'fx' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeBottomTab === 'fx' ? '#fbbf24' : '#94a3b8',
              borderTop: activeBottomTab === 'fx' ? '2px solid #fbbf24' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={16} />
            <span>Ambiente</span>
          </button>
        </div>
      </>
    )}
  </div>

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={showAssetPicker}
        mode={assetPickerMode}
        currentUrl={assetPickerMode === 'background' ? backgroundUrl : quickCharAvatar}
        onSelectAsset={(asset) => {
          if (assetPickerMode === 'background') {
            setBackgroundUrl(asset.url);
            if (!sceneName || sceneName === 'Nueva Escena') {
              setSceneName(asset.name);
            }
          } else if (assetPickerMode === 'character') {
            setQuickCharAvatar(asset.url);
            if (!quickCharName) {
              setQuickCharName(asset.name);
            }
          }
          setShowAssetPicker(false);
        }}
        onClose={() => setShowAssetPicker(false)}
      />

      {/* Modal Rápido de Creación de Personaje sin salir del Compositor */}
      {showQuickCharModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowQuickCharModal(false)}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '6px', borderRadius: '8px' }}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 600 }}>
                    Nuevo Personaje
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Se guardará en <strong>{campaign.title}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCharModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAndAddCharacter} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    onClick={() => {
                      setAssetPickerMode('character');
                      setShowAssetPicker(true);
                    }}
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
                  onClick={() => setShowQuickCharModal(false)}
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
        scene={buildCurrentSceneData()}
        campaign={campaign}
        onClose={() => setShowTransferModal(false)}
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
                onClick={() => {
                  setCharacters(recoveredDraft.characters);
                  setBgOffset(recoveredDraft.bgOffset);
                  setEditorZoom(recoveredDraft.editorZoom);
                  if (recoveredDraft.selectedCharId) setSelectedCharId(recoveredDraft.selectedCharId);
                  setShowDraftModal(false);
                }}
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
                onClick={() => {
                  clearSceneDraft(campaign.id, recoveredDraft.sceneId);
                  setShowDraftModal(false);
                }}
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

              {initialScene && onUpdateCampaign && (
                <button
                  type="button"
                  onClick={async () => {
                    const copy = createSceneCopyFromDraft(initialScene, recoveredDraft);
                    const updatedCampaign: Campaign = {
                      ...campaign,
                      scenes: [...campaign.scenes, copy],
                      updatedAt: Date.now(),
                    };
                    await onUpdateCampaign(updatedCampaign);
                    clearSceneDraft(campaign.id, recoveredDraft.sceneId);
                    setShowDraftModal(false);
                    alert('Se ha creado una nueva escena con la copia de tu borrador.');
                  }}
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
    </div>
  );
};
