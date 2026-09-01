import React, { useState, useEffect } from 'react';
import type {
  Campaign,
  Character,
  CharacterOnScreen,
  CharacterPosition,
  ConnectionStatus,
  LightingFilter,
  Scene,
  WeatherType,
} from '../../types';
import { peerService } from '../../services/peerService';
import { soundEngine } from '../../services/soundEngine';
import { db, BUILTIN_SFX, DEMO_CAMPAIGN, initDefaultDataIfNeeded } from '../../db';
import {
  Zap,
  Activity,
  EyeOff,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  Flame,
  Sparkles,
  Sun,
  Moon,
  Sunset,
  Skull,
  UserPlus,
  Mic,
  Volume2,
  BookOpen,
  Sliders,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  Download,
  Dices,
  RefreshCw,
  Check,
  ChevronRight,
  X,
  LogOut,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface MasterControllerProps {
  initialRoomCode?: string;
  onExitToLobby?: () => void;
}

export const MasterController: React.FC<MasterControllerProps> = ({ initialRoomCode, onExitToLobby }) => {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode || '');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeTab, setActiveTab] = useState<'live' | 'notes' | 'library'>('live');
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  // Campaign & Database State
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [activeCharacters, setActiveCharacters] = useState<CharacterOnScreen[]>([]);
  const [weather, setWeather] = useState<WeatherType>('none');
  const [weatherIntensity, setWeatherIntensity] = useState<number>(0.5);
  const [lighting, setLighting] = useState<LightingFilter>('normal');
  const [isBlackout, setIsBlackout] = useState<boolean>(false);
  const [locationTitle, setLocationTitle] = useState<string>('');
  const [locationSubtitle, setLocationSubtitle] = useState<string>('');
  const [bannerVisible, setBannerVisible] = useState<boolean>(true);

  // UI Drawers & Modals
  const [showSummonModal, setShowSummonModal] = useState<boolean>(false);
  const [showNewSceneModal, setShowNewSceneModal] = useState<boolean>(false);
  const [showNewCharModal, setShowNewCharModal] = useState<boolean>(false);
  const [diceLog, setDiceLog] = useState<{ id: string; text: string; time: string }[]>([]);

  // Forms for new scene / character
  const [newSceneForm, setNewSceneForm] = useState({
    name: '',
    backgroundUrl: '',
    locationBanner: '',
    subtitle: '',
    weather: 'none' as WeatherType,
    lighting: 'normal' as LightingFilter,
    dmNotes: '',
  });

  const [newCharForm, setNewCharForm] = useState({
    name: '',
    roleOrTitle: '',
    defaultAvatarUrl: '',
    bio: '',
  });

  // Load campaign from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      const camp = await initDefaultDataIfNeeded();
      setCampaign(camp);
      if (camp.scenes.length > 0) {
        selectScene(camp.scenes[0], false);
      }
    };
    loadData();
  }, []);

  // Connect to Display Peer
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
      connectToRoom(initialRoomCode);
    }

    const unsubStatus = peerService.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubStatus();
    };
  }, [initialRoomCode]);

  const connectToRoom = async (code: string) => {
    try {
      await peerService.connectAsMaster(code);
    } catch (e) {
      console.error('Master connection failed:', e);
    }
  };

  // Sync state helpers
  const broadcastScene = (scene: Scene, chars: CharacterOnScreen[]) => {
    peerService.send({
      type: 'SET_SCENE',
      payload: scene,
      characters: chars,
    });
  };

  const selectScene = (scene: Scene, broadcast: boolean = true) => {
    setCurrentScene(scene);
    setWeather(scene.weather || 'none');
    setWeatherIntensity(scene.weatherIntensity ?? 0.5);
    setLighting(scene.lighting || 'normal');
    setLocationTitle(scene.locationBanner || scene.name);
    setLocationSubtitle(scene.subtitle || '');

    // Suggested NPCs or keep current
    let charsToPlace = activeCharacters;
    if (scene.suggestedNpcIds && scene.suggestedNpcIds.length > 0 && campaign) {
      const suggested = campaign.characters
        .filter((c) => scene.suggestedNpcIds?.includes(c.id))
        .map((c, idx) => {
          const positions: CharacterPosition[] = ['center-left', 'center-right', 'left', 'right'];
          return {
            id: `active-${c.id}-${Date.now()}`,
            characterId: c.id,
            name: c.name,
            avatarUrl: c.defaultAvatarUrl,
            position: positions[idx % positions.length],
            isSpeaking: false,
          };
        });
      charsToPlace = suggested;
      setActiveCharacters(suggested);
    }

    if (broadcast) {
      broadcastScene(scene, charsToPlace);
    }
  };

  // Character Management
  const summonCharacter = (char: Character) => {
    const positions: CharacterPosition[] = ['left', 'center-left', 'center-right', 'right'];
    const usedPositions = activeCharacters.map((c) => c.position);
    const availablePos = positions.find((p) => !usedPositions.includes(p)) || 'center-left';

    const newOnScreen: CharacterOnScreen = {
      id: `active-${char.id}-${Date.now()}`,
      characterId: char.id,
      name: char.name,
      avatarUrl: char.defaultAvatarUrl,
      position: availablePos,
      isSpeaking: false,
    };

    const updated = [...activeCharacters, newOnScreen];
    setActiveCharacters(updated);
    peerService.send({ type: 'ADD_CHARACTER', payload: newOnScreen });
    setShowSummonModal(false);
  };

  const dismissCharacter = (id: string) => {
    const updated = activeCharacters.filter((c) => c.id !== id);
    setActiveCharacters(updated);
    peerService.send({ type: 'REMOVE_CHARACTER', payload: { id } });
  };

  const toggleSpeaking = (id: string) => {
    const char = activeCharacters.find((c) => c.id === id);
    const newSpeaking = !char?.isSpeaking;

    const updated = activeCharacters.map((c) => ({
      ...c,
      isSpeaking: c.id === id ? newSpeaking : false,
    }));

    setActiveCharacters(updated);
    peerService.send({ type: 'SET_SPEAKING', payload: { id, isSpeaking: newSpeaking } });
  };

  const changeCharacterPosition = (id: string, position: CharacterPosition) => {
    const updated = activeCharacters.map((c) => (c.id === id ? { ...c, position } : c));
    setActiveCharacters(updated);
    peerService.send({ type: 'SET_CHARACTER_POSITION', payload: { id, position } });
  };

  const changeCharacterExpression = (id: string, expressionName: string, avatarUrl: string) => {
    const updated = activeCharacters.map((c) =>
      c.id === id ? { ...c, avatarUrl, activeExpression: expressionName } : c
    );
    setActiveCharacters(updated);
    peerService.send({
      type: 'SET_CHARACTER_EXPRESSION',
      payload: { id, expressionName, avatarUrl },
    });
  };

  // Weather & Atmosphere
  const setWeatherEffect = (type: WeatherType) => {
    setWeather(type);
    peerService.send({ type: 'SET_WEATHER', payload: { weather: type, intensity: weatherIntensity } });
  };

  const setWeatherIntensityVal = (val: number) => {
    setWeatherIntensity(val);
    peerService.send({ type: 'SET_WEATHER', payload: { weather, intensity: val } });
  };

  const setLightingPreset = (filter: LightingFilter) => {
    setLighting(filter);
    peerService.send({ type: 'SET_LIGHTING', payload: filter });
  };

  // Panic & Triggers
  const toggleBlackout = () => {
    const next = !isBlackout;
    setIsBlackout(next);
    peerService.send({ type: 'SET_BLACKOUT', payload: next });
  };

  const triggerLightning = () => {
    peerService.send({ type: 'TRIGGER_LIGHTNING' });
    soundEngine.playSynth('thunder');
  };

  const triggerScreenShake = () => {
    peerService.send({ type: 'TRIGGER_SHAKE' });
  };

  const updateBanner = () => {
    peerService.send({
      type: 'SET_BANNER',
      payload: { text: locationTitle, subtitle: locationSubtitle, visible: bannerVisible },
    });
  };

  // Play Sound Effect
  const playSfx = (sfx: typeof BUILTIN_SFX[0]) => {
    if (sfx.soundType === 'synthesized' && sfx.synthPreset) {
      soundEngine.playSynth(sfx.synthPreset);
    }
    peerService.send({
      type: 'PLAY_SFX',
      payload: {
        id: sfx.id,
        name: sfx.name,
        synthPreset: sfx.synthPreset,
        audioUrl: sfx.audioUrl,
        timestamp: Date.now(),
      },
    });
  };

  // Dice Roller
  const rollDice = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const isCrit = sides === 20 && result === 20;
    const isFumble = sides === 20 && result === 1;

    let text = `d${sides}: ${result}`;
    if (isCrit) text += ' (¡CRÍTICO! ⚔️)';
    if (isFumble) text += ' (¡PIFIA! 💀)';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDiceLog((prev) => [{ id: Math.random().toString(), text, time }, ...prev.slice(0, 15)]);
    soundEngine.playSynth('heartbeat');
  };

  // Library & Campaign Actions
  const handleCreateScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSceneForm.name || !newSceneForm.backgroundUrl || !campaign) return;

    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: newSceneForm.name,
      backgroundUrl: newSceneForm.backgroundUrl,
      locationBanner: newSceneForm.locationBanner || newSceneForm.name,
      subtitle: newSceneForm.subtitle,
      weather: newSceneForm.weather,
      lighting: newSceneForm.lighting,
      dmNotes: newSceneForm.dmNotes,
    };

    const updatedScenes = [...campaign.scenes, newScene];
    const updatedCampaign = { ...campaign, scenes: updatedScenes };

    await db.campaigns.put(updatedCampaign);
    await db.scenes.put(newScene);
    setCampaign(updatedCampaign);
    setShowNewSceneModal(false);
    setNewSceneForm({
      name: '',
      backgroundUrl: '',
      locationBanner: '',
      subtitle: '',
      weather: 'none',
      lighting: 'normal',
      dmNotes: '',
    });
  };

  const handleCreateChar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharForm.name || !newCharForm.defaultAvatarUrl || !campaign) return;

    const newChar: Character = {
      id: `char-${Date.now()}`,
      name: newCharForm.name,
      roleOrTitle: newCharForm.roleOrTitle || 'Aventurero',
      defaultAvatarUrl: newCharForm.defaultAvatarUrl,
      bio: newCharForm.bio,
    };

    const updatedChars = [...campaign.characters, newChar];
    const updatedCampaign = { ...campaign, characters: updatedChars };

    await db.campaigns.put(updatedCampaign);
    await db.characters.put(newChar);
    setCampaign(updatedCampaign);
    setShowNewCharModal(false);
    setNewCharForm({ name: '', roleOrTitle: '', defaultAvatarUrl: '', bio: '' });
  };

  const handleResetDemo = async () => {
    if (window.confirm('¿Restaurar la campaña de demostración inicial?')) {
      await db.campaigns.clear();
      await db.scenes.clear();
      await db.characters.clear();
      await db.campaigns.put(DEMO_CAMPAIGN);
      setCampaign(DEMO_CAMPAIGN);
      if (DEMO_CAMPAIGN.scenes.length > 0) {
        selectScene(DEMO_CAMPAIGN.scenes[0], true);
      }
    }
  };

  const exportCampaignJSON = () => {
    if (!campaign) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(campaign, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${campaign.title.replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importCampaignJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as Campaign;
          if (parsed.id && parsed.scenes) {
            await db.campaigns.put(parsed);
            setCampaign(parsed);
            alert('¡Campaña importada exitosamente!');
          }
        } catch (err) {
          alert('Archivo JSON no válido.');
        }
      };
    }
  };

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${roomCode}`;

  return (
    <div className="master-controller-root">
      {/* Top Header */}
      <header className="master-header">
        <div className="header-top">
          <div className="brand-group">
            <h1 className="app-title">Visual Player</h1>
            <span className="app-badge">DM Remote</span>
          </div>

          <div className="connection-group" style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`status-chip ${connectionStatus}`}
              onClick={() => setShowQRModal(true)}
              title="Información de Conexión"
            >
              <span className="pulse-indicator"></span>
              {connectionStatus === 'connected' ? (
                <span>Conectado ({roomCode})</span>
              ) : connectionStatus === 'connecting' ? (
                <span>Conectando...</span>
              ) : (
                <span>PIN: {roomCode || '---'}</span>
              )}
            </button>
            {onExitToLobby && (
              <button className="status-chip" onClick={onExitToLobby} title="Salir al Lobby">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Action Triggers Row */}
        <div className="quick-actions-bar">
          <button
            className={`action-pill ${isBlackout ? 'blackout-active' : 'blackout-btn'}`}
            onClick={toggleBlackout}
          >
            <EyeOff size={16} />
            <span>{isBlackout ? 'Encender Pantalla' : 'Blackout (Pánico)'}</span>
          </button>

          <button className="action-pill trigger-lightning-btn" onClick={triggerLightning}>
            <Zap size={16} />
            <span>Rayo</span>
          </button>

          <button className="action-pill trigger-shake-btn" onClick={triggerScreenShake}>
            <Activity size={16} />
            <span>Temblor</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="tab-navigation">
          <button
            className={`nav-tab ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Sliders size={16} />
            <span>En Vivo</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <BookOpen size={16} />
            <span>Notas DM</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <FolderOpen size={16} />
            <span>Campañas</span>
          </button>
        </nav>
      </header>

      {/* Main Tab Content */}
      <main className="master-content">
        {/* TAB 1: LIVE STAGE */}
        {activeTab === 'live' && (
          <div className="live-panel">
            {/* 1. Location Banner Quick Control */}
            <section className="control-section banner-section">
              <div className="section-header">
                <span className="section-title">Cartel de Ubicación en Pantalla</span>
                <button
                  className={`mini-toggle ${bannerVisible ? 'on' : 'off'}`}
                  onClick={() => {
                    setBannerVisible(!bannerVisible);
                    peerService.send({
                      type: 'SET_BANNER',
                      payload: { text: locationTitle, subtitle: locationSubtitle, visible: !bannerVisible },
                    });
                  }}
                >
                  {bannerVisible ? 'Visible' : 'Oculto'}
                </button>
              </div>
              <div className="banner-inputs">
                <input
                  type="text"
                  placeholder="Título (Ej. RUINAS DE ELDORIA)"
                  value={locationTitle}
                  onChange={(e) => setLocationTitle(e.target.value)}
                  onBlur={updateBanner}
                  className="master-input"
                />
                <input
                  type="text"
                  placeholder="Subtítulo (Ej. Sala del Trono Olvidado)"
                  value={locationSubtitle}
                  onChange={(e) => setLocationSubtitle(e.target.value)}
                  onBlur={updateBanner}
                  className="master-input secondary"
                />
              </div>
            </section>

            {/* 2. Scene Switcher Grid */}
            <section className="control-section">
              <div className="section-header">
                <span className="section-title">Cambiar Escenario</span>
                <span className="section-count">{campaign?.scenes.length || 0} escenas</span>
              </div>
              <div className="scenes-carousel">
                {campaign?.scenes.map((sc) => {
                  const isSelected = currentScene?.id === sc.id;
                  return (
                    <button
                      key={sc.id}
                      className={`scene-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectScene(sc, true)}
                    >
                      <div
                        className="scene-thumb"
                        style={{ backgroundImage: `url(${sc.backgroundUrl})` }}
                      >
                        {isSelected && <div className="active-badge">EN PANTALLA</div>}
                      </div>
                      <span className="scene-name">{sc.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Stage Characters */}
            <section className="control-section">
              <div className="section-header">
                <span className="section-title">Personajes en Escena ({activeCharacters.length})</span>
                <button
                  className="btn-primary-sm"
                  onClick={() => setShowSummonModal(true)}
                >
                  <UserPlus size={14} />
                  <span>Invocar NPC</span>
                </button>
              </div>

              {activeCharacters.length === 0 ? (
                <div className="empty-roster-box">
                  <p>No hay personajes en la pantalla.</p>
                  <button className="btn-secondary-sm" onClick={() => setShowSummonModal(true)}>
                    + Invocar de la Biblioteca
                  </button>
                </div>
              ) : (
                <div className="active-chars-grid">
                  {activeCharacters.map((char) => {
                    const originalChar = campaign?.characters.find((c) => c.id === char.characterId);
                    return (
                      <div
                        key={char.id}
                        className={`active-char-card ${char.isSpeaking ? 'speaking-focus' : ''}`}
                      >
                        <div className="char-card-top">
                          <img src={char.avatarUrl} alt={char.name} className="char-avatar" />
                          <div className="char-meta">
                            <span className="char-title">{char.name}</span>
                            <div className="position-pills">
                              {(['left', 'center-left', 'center-right', 'right'] as CharacterPosition[]).map(
                                (pos) => (
                                  <button
                                    key={pos}
                                    className={`pos-btn ${char.position === pos ? 'pos-active' : ''}`}
                                    onClick={() => changeCharacterPosition(char.id, pos)}
                                  >
                                    {pos === 'left' ? 'Izq' : pos === 'center-left' ? 'C-Izq' : pos === 'center-right' ? 'C-Der' : 'Der'}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          <button
                            className="dismiss-btn"
                            onClick={() => dismissCharacter(char.id)}
                            title="Quitar de Pantalla"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Speaking Toggle & Expressions */}
                        <div className="char-card-actions">
                          <button
                            className={`speak-btn ${char.isSpeaking ? 'active' : ''}`}
                            onClick={() => toggleSpeaking(char.id)}
                          >
                            <Mic size={14} />
                            <span>{char.isSpeaking ? 'Hablando (En Foco)' : 'Dar Foco de Voz'}</span>
                          </button>

                          {originalChar?.expressions && Object.keys(originalChar.expressions).length > 0 && (
                            <div className="expressions-row">
                              {Object.entries(originalChar.expressions).map(([expName, url]) => (
                                <button
                                  key={expName}
                                  className={`exp-btn ${char.avatarUrl === url ? 'exp-active' : ''}`}
                                  onClick={() => changeCharacterExpression(char.id, expName, url)}
                                >
                                  {expName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 4. Weather & Atmosphere Controls */}
            <section className="control-section">
              <span className="section-title">Clima y Partículas</span>
              <div className="weather-grid">
                <button
                  className={`weather-btn ${weather === 'none' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('none')}
                >
                  <Sun size={18} />
                  <span>Despejado</span>
                </button>
                <button
                  className={`weather-btn ${weather === 'rain' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('rain')}
                >
                  <CloudRain size={18} />
                  <span>Lluvia</span>
                </button>
                <button
                  className={`weather-btn ${weather === 'storm' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('storm')}
                >
                  <CloudLightning size={18} />
                  <span>Tormenta</span>
                </button>
                <button
                  className={`weather-btn ${weather === 'snow' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('snow')}
                >
                  <Snowflake size={18} />
                  <span>Nieve</span>
                </button>
                <button
                  className={`weather-btn ${weather === 'fog' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('fog')}
                >
                  <Wind size={18} />
                  <span>Niebla</span>
                </button>
                <button
                  className={`weather-btn ${weather === 'embers' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('embers')}
                >
                  <Flame size={18} />
                  <span>Ascuas</span>
                </button>
                <button
                  className={`weather-btn ${weather === 'fireflies' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('fireflies')}
                >
                  <Sparkles size={18} />
                  <span>Luciérnagas</span>
                </button>
              </div>

              {weather !== 'none' && (
                <div className="intensity-slider-row">
                  <span className="slider-label">Intensidad: {Math.round(weatherIntensity * 100)}%</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={weatherIntensity}
                    onChange={(e) => setWeatherIntensityVal(parseFloat(e.target.value))}
                    className="master-range"
                  />
                </div>
              )}
            </section>

            {/* 5. Lighting Color Filter */}
            <section className="control-section">
              <span className="section-title">Filtro de Luz e Iluminación</span>
              <div className="lighting-grid">
                <button
                  className={`light-btn ${lighting === 'normal' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('normal')}
                >
                  <Sun size={16} />
                  <span>Día / Normal</span>
                </button>
                <button
                  className={`light-btn ${lighting === 'torch_flicker' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('torch_flicker')}
                >
                  <Flame size={16} />
                  <span>Antorchas</span>
                </button>
                <button
                  className={`light-btn ${lighting === 'night' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('night')}
                >
                  <Moon size={16} />
                  <span>Noche</span>
                </button>
                <button
                  className={`light-btn ${lighting === 'sunset' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('sunset')}
                >
                  <Sunset size={16} />
                  <span>Atardecer</span>
                </button>
                <button
                  className={`light-btn ${lighting === 'blood_moon' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('blood_moon')}
                >
                  <Skull size={16} />
                  <span>Luna de Sangre</span>
                </button>
                <button
                  className={`light-btn ${lighting === 'mystic_violet' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('mystic_violet')}
                >
                  <Sparkles size={16} />
                  <span>Arcano / Místico</span>
                </button>
              </div>
            </section>

            {/* 6. SFX Soundboard */}
            <section className="control-section">
              <span className="section-title">Sonidos FX Instantáneos (SFX)</span>
              <div className="sfx-grid">
                {BUILTIN_SFX.map((sfx) => (
                  <button
                    key={sfx.id}
                    className="sfx-btn"
                    onClick={() => playSfx(sfx)}
                  >
                    <Volume2 size={16} />
                    <span>{sfx.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: DM NOTES & DICE */}
        {activeTab === 'notes' && (
          <div className="notes-panel">
            <div className="notes-card">
              <h2 className="notes-header">Notas Secretas: {currentScene?.name || 'Sin Escenario'}</h2>
              <textarea
                className="dm-notes-textarea"
                value={currentScene?.dmNotes || ''}
                placeholder="Escribe notas, estadísticas de monstruos, pistas o diálogos clave para esta escena..."
                onChange={(e) => {
                  if (!currentScene || !campaign) return;
                  const updatedScene = { ...currentScene, dmNotes: e.target.value };
                  setCurrentScene(updatedScene);
                  const updatedScenes = campaign.scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s));
                  const updatedCamp = { ...campaign, scenes: updatedScenes };
                  setCampaign(updatedCamp);
                  db.campaigns.put(updatedCamp);
                }}
              />
            </div>

            {/* Quick Dice Roller */}
            <div className="dice-roller-card">
              <div className="section-header">
                <span className="section-title">Lanzador de Dados del Master</span>
                <Dices size={18} />
              </div>
              <div className="dice-buttons">
                {[4, 6, 8, 10, 12, 20, 100].map((d) => (
                  <button key={d} className="die-btn" onClick={() => rollDice(d)}>
                    d{d}
                  </button>
                ))}
              </div>

              {diceLog.length > 0 && (
                <div className="dice-history">
                  {diceLog.map((log) => (
                    <div key={log.id} className="dice-log-entry">
                      <span className="dice-time">{log.time}</span>
                      <span className="dice-result">{log.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LIBRARY & CAMPAIGNS */}
        {activeTab === 'library' && (
          <div className="library-panel">
            <div className="campaign-meta-box">
              <div className="meta-info">
                <h2 className="campaign-title">{campaign?.title}</h2>
                <p className="campaign-desc">{campaign?.description}</p>
              </div>
              <div className="campaign-tools">
                <button className="tool-btn" onClick={exportCampaignJSON} title="Descargar Copia de Seguridad">
                  <Download size={16} />
                  <span>Exportar</span>
                </button>
                <label className="tool-btn file-label" title="Restaurar Copia de Seguridad">
                  <Upload size={16} />
                  <span>Importar</span>
                  <input type="file" accept=".json" onChange={importCampaignJSON} style={{ display: 'none' }} />
                </label>
                <button className="tool-btn danger" onClick={handleResetDemo} title="Cargar Datos de Prueba">
                  <RefreshCw size={16} />
                  <span>Reset Demo</span>
                </button>
              </div>
            </div>

            {/* Scenes Management */}
            <div className="library-section">
              <div className="section-header">
                <span className="section-title">Escenarios de la Campaña</span>
                <button className="btn-primary-sm" onClick={() => setShowNewSceneModal(true)}>
                  <Plus size={14} />
                  <span>Nuevo Escenario</span>
                </button>
              </div>
              <div className="library-list">
                {campaign?.scenes.map((sc) => (
                  <div key={sc.id} className="library-item">
                    <img src={sc.backgroundUrl} alt={sc.name} className="item-thumb" />
                    <div className="item-info">
                      <span className="item-title">{sc.name}</span>
                      <span className="item-subtitle">{sc.subtitle || 'Sin subtítulo'}</span>
                    </div>
                    <button
                      className="item-delete-btn"
                      onClick={async () => {
                        if (!campaign || campaign.scenes.length <= 1) {
                          alert('Debe quedar al menos un escenario en la campaña.');
                          return;
                        }
                        const updatedScenes = campaign.scenes.filter((s) => s.id !== sc.id);
                        const updatedCamp = { ...campaign, scenes: updatedScenes };
                        await db.campaigns.put(updatedCamp);
                        setCampaign(updatedCamp);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Characters Management */}
            <div className="library-section">
              <div className="section-header">
                <span className="section-title">Fichas de NPCs y Personajes</span>
                <button className="btn-primary-sm" onClick={() => setShowNewCharModal(true)}>
                  <Plus size={14} />
                  <span>Nuevo NPC</span>
                </button>
              </div>
              <div className="library-list">
                {campaign?.characters.map((ch) => (
                  <div key={ch.id} className="library-item">
                    <img src={ch.defaultAvatarUrl} alt={ch.name} className="item-thumb circle" />
                    <div className="item-info">
                      <span className="item-title">{ch.name}</span>
                      <span className="item-subtitle">{ch.roleOrTitle}</span>
                    </div>
                    <button
                      className="item-delete-btn"
                      onClick={async () => {
                        if (!campaign) return;
                        const updatedChars = campaign.characters.filter((c) => c.id !== ch.id);
                        const updatedCamp = { ...campaign, characters: updatedChars };
                        await db.campaigns.put(updatedCamp);
                        setCampaign(updatedCamp);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: SUMMON NPC */}
      {showSummonModal && (
        <div className="modal-overlay" onClick={() => setShowSummonModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invocar Personaje a la Escena</h2>
              <button className="modal-close" onClick={() => setShowSummonModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="summon-roster">
              {campaign?.characters.map((ch) => (
                <div key={ch.id} className="roster-card" onClick={() => summonCharacter(ch)}>
                  <img src={ch.defaultAvatarUrl} alt={ch.name} className="roster-avatar" />
                  <div className="roster-meta">
                    <strong>{ch.name}</strong>
                    <span>{ch.roleOrTitle}</span>
                  </div>
                  <ChevronRight size={18} className="text-amber-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW SCENE */}
      {showNewSceneModal && (
        <div className="modal-overlay" onClick={() => setShowNewSceneModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Nuevo Escenario</h2>
              <button className="modal-close" onClick={() => setShowNewSceneModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateScene} className="modal-form">
              <label>Nombre del Escenario</label>
              <input
                type="text"
                required
                placeholder="Ej. Cripta Olvidada"
                value={newSceneForm.name}
                onChange={(e) => setNewSceneForm({ ...newSceneForm, name: e.target.value })}
                className="master-input"
              />

              <label>Imagen de Fondo (URL o Subir)</label>
              <div className="input-with-upload">
                <input
                  type="text"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={newSceneForm.backgroundUrl}
                  onChange={(e) => setNewSceneForm({ ...newSceneForm, backgroundUrl: e.target.value })}
                  className="master-input"
                />
                <label className="btn-file-upload">
                  <Upload size={16} />
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, (url) => setNewSceneForm({ ...newSceneForm, backgroundUrl: url }))}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <label>Subtítulo de Ubicación</label>
              <input
                type="text"
                placeholder="Ej. Nivel Subterráneo 2"
                value={newSceneForm.subtitle}
                onChange={(e) => setNewSceneForm({ ...newSceneForm, subtitle: e.target.value })}
                className="master-input"
              />

              <label>Notas Secretas del DM</label>
              <textarea
                placeholder="Trampas, monstruos, tiradas..."
                value={newSceneForm.dmNotes}
                onChange={(e) => setNewSceneForm({ ...newSceneForm, dmNotes: e.target.value })}
                className="master-input textarea"
              />

              <button type="submit" className="btn-primary full">
                Guardar Escenario
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW CHARACTER */}
      {showNewCharModal && (
        <div className="modal-overlay" onClick={() => setShowNewCharModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Nuevo Personaje / NPC</h2>
              <button className="modal-close" onClick={() => setShowNewCharModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateChar} className="modal-form">
              <label>Nombre del Personaje</label>
              <input
                type="text"
                required
                placeholder="Ej. Lord Valerius"
                value={newCharForm.name}
                onChange={(e) => setNewCharForm({ ...newCharForm, name: e.target.value })}
                className="master-input"
              />

              <label>Rol o Título</label>
              <input
                type="text"
                placeholder="Ej. Conde de Ravenloft"
                value={newCharForm.roleOrTitle}
                onChange={(e) => setNewCharForm({ ...newCharForm, roleOrTitle: e.target.value })}
                className="master-input"
              />

              <label>Retrato / Avatar (URL o Subir)</label>
              <div className="input-with-upload">
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={newCharForm.defaultAvatarUrl}
                  onChange={(e) => setNewCharForm({ ...newCharForm, defaultAvatarUrl: e.target.value })}
                  className="master-input"
                />
                <label className="btn-file-upload">
                  <Upload size={16} />
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, (url) => setNewCharForm({ ...newCharForm, defaultAvatarUrl: url }))}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <label>Biografía / Rasgos</label>
              <textarea
                placeholder="Personalidad, secretos..."
                value={newCharForm.bio}
                onChange={(e) => setNewCharForm({ ...newCharForm, bio: e.target.value })}
                className="master-input textarea"
              />

              <button type="submit" className="btn-primary full">
                Crear Ficha de NPC
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR & CONNECTION */}
      {showQRModal && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Emparejar Dispositivos</h2>
              <button className="modal-close" onClick={() => setShowQRModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="qr-container">
              <div className="qr-card">
                <QRCodeSVG value={joinUrl} size={180} level="M" />
              </div>
              <div className="pin-box">
                <span>PIN de la Sala</span>
                <strong className="pin-code">{roomCode}</strong>
              </div>
              <p className="qr-instructions">
                Abre la aplicación en tu <strong>Tablet o TV</strong> y selecciona modo "Pantalla", o escanea este QR.
              </p>
              <button
                className="btn-primary full"
                onClick={() => {
                  connectToRoom(roomCode);
                  setShowQRModal(false);
                }}
              >
                <Check size={18} />
                <span>Reconectar Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
