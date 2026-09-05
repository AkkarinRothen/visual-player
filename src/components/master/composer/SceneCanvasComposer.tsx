import React, { useState, useEffect, useRef } from 'react';
import type {
  Campaign,
  Scene,
  Character,
  CharacterOnScreen,
  WeatherType,
  LightingFilter,
  CameraTransform,
} from '../../../types';
import { db } from '../../../db';
import {
  saveSceneDraft,
  getSceneDraft,
  clearSceneDraft,
  createSceneCopyFromDraft,
  type SceneDraftState,
} from '../../../services/draftStorageService';
import {
  type TouchMode,
  type DpadPreset,
  type ComposerBottomTab,
} from './composerTypes';
import { ComposerHeader } from './ComposerHeader';
import { ComposerTouchModeBar } from './ComposerTouchModeBar';
import { ComposerViewport } from './ComposerViewport';
import { ComposerSelectedCharPanel } from './ComposerSelectedCharPanel';
import { ComposerBottomTabs } from './ComposerBottomTabs';
import { ComposerModals } from './ComposerModals';

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
  const [activeBottomTab, setActiveBottomTab] = useState<ComposerBottomTab>('characters');

  // Modals
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [assetPickerMode, setAssetPickerMode] = useState<'background' | 'character'>('background');

  // Modos táctiles inequívocos
  const [touchMode, setTouchMode] = useState<TouchMode>('characters');
  const [editorPan, setEditorPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bgOffset, setBgOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // D-pad steps en unidades del escenario 1920x1080 (Fino 1px, Normal 5px, Amplio 20px)
  const [dpadPreset, setDpadPreset] = useState<DpadPreset>('normal');

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
      {/* 1. TOP HEADER */}
      <ComposerHeader
        sceneName={sceneName}
        setSceneName={setSceneName}
        draftStatus={draftStatus}
        isSaving={isSaving}
        showSecondaryMenu={showSecondaryMenu}
        setShowSecondaryMenu={setShowSecondaryMenu}
        onClose={onClose}
        onSave={handleSave}
        onOpenTransfer={handleOpenTransfer}
        onOpenBackgroundPicker={() => {
          setAssetPickerMode('background');
          setShowAssetPicker(true);
        }}
      />

      {/* 2. BARRA DE MODOS TÁCTILES */}
      <ComposerTouchModeBar
        touchMode={touchMode}
        setTouchMode={setTouchMode}
      />

      {/* 3. LIENZO CENTRAL 16:9 */}
      <ComposerViewport
        canvasRef={canvasRef}
        touchMode={touchMode}
        editorPan={editorPan}
        editorZoom={editorZoom}
        setEditorPan={setEditorPan}
        setEditorZoom={setEditorZoom}
        bgOffset={bgOffset}
        setBgOffset={setBgOffset}
        isDragging={isDraggingRef.current}
        backgroundUrl={backgroundUrl}
        lighting={lighting}
        locationBanner={locationBanner}
        characters={characters}
        selectedCharId={selectedCharId}
        onOpenBackgroundPicker={() => {
          setAssetPickerMode('background');
          setShowAssetPicker(true);
        }}
        onCanvasTouchStart={handleCanvasTouchStart}
        onCanvasTouchMove={handleCanvasTouchMove}
        onFigureTouchStart={handleFigureTouchStart}
      />

      {/* 4. BANDEJA INFERIOR FIJA TÁCTIL */}
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
          <ComposerSelectedCharPanel
            selectedChar={selectedChar}
            dpadPreset={dpadPreset}
            setDpadPreset={setDpadPreset}
            onToggleMirror={handleToggleMirror}
            onMoveLayer={handleMoveLayer}
            onRemoveCharacter={handleRemoveCharacter}
            onCloseSelection={() => setSelectedCharId(null)}
            onScaleChange={handleScaleChange}
            onNudge={handleNudge}
          />
        ) : (
          <ComposerBottomTabs
            activeBottomTab={activeBottomTab}
            setActiveBottomTab={setActiveBottomTab}
            backgroundUrl={backgroundUrl}
            locationBanner={locationBanner}
            setLocationBanner={setLocationBanner}
            campaign={campaign}
            characters={characters}
            selectedCharId={selectedCharId}
            setSelectedCharId={setSelectedCharId}
            lighting={lighting}
            setLighting={setLighting}
            weather={weather}
            setWeather={setWeather}
            onOpenBackgroundPicker={() => {
              setAssetPickerMode('background');
              setShowAssetPicker(true);
            }}
            onOpenQuickCharModal={() => {
              setQuickCharName('');
              setQuickCharAvatar('');
              setShowQuickCharModal(true);
            }}
            onAddCharacterToCanvas={handleAddCharacterToCanvas}
            onMoveLayer={handleMoveLayer}
          />
        )}
      </div>

      {/* 5. MODALES ENCAPSULADOS */}
      <ComposerModals
        showAssetPicker={showAssetPicker}
        assetPickerMode={assetPickerMode}
        backgroundUrl={backgroundUrl}
        quickCharAvatar={quickCharAvatar}
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
        onCloseAssetPicker={() => setShowAssetPicker(false)}
        showQuickCharModal={showQuickCharModal}
        onCloseQuickCharModal={() => setShowQuickCharModal(false)}
        quickCharName={quickCharName}
        setQuickCharName={setQuickCharName}
        isCreatingChar={isCreatingChar}
        campaignTitle={campaign.title}
        onOpenAssetPickerForChar={() => {
          setAssetPickerMode('character');
          setShowAssetPicker(true);
        }}
        onCreateAndAddCharacter={handleCreateAndAddCharacter}
        showTransferModal={showTransferModal}
        onCloseTransferModal={() => setShowTransferModal(false)}
        sceneToTransfer={buildCurrentSceneData()}
        campaign={campaign}
        onOpenSession={onOpenSession}
        showDraftModal={showDraftModal}
        recoveredDraft={recoveredDraft}
        onAcceptDraft={() => {
          if (recoveredDraft) {
            setCharacters(recoveredDraft.characters);
            setBgOffset(recoveredDraft.bgOffset);
            setEditorZoom(recoveredDraft.editorZoom);
            if (recoveredDraft.selectedCharId) setSelectedCharId(recoveredDraft.selectedCharId);
          }
          setShowDraftModal(false);
        }}
        onDiscardDraft={() => {
          if (recoveredDraft) {
            clearSceneDraft(campaign.id, recoveredDraft.sceneId);
          }
          setShowDraftModal(false);
        }}
        onSaveDraftAsCopy={
          initialScene && onUpdateCampaign && recoveredDraft
            ? async () => {
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
              }
            : undefined
        }
      />
    </div>
  );
};
