import React from 'react';
import type {
  Campaign,
  Character,
  CharacterPosition,
  CinematicMacro,
  DisplayState,
  LightingFilter,
  SavedEncounter,
  Scene,
  WeatherType,
} from '../../../types';
import { BUILTIN_SFX, saveEncounter, getCampaignEncounters, deleteEncounter, updateCampaign } from '../../../db';
import { CombatTab } from '../CombatTab';
import { MomentsTab } from '../MomentsTab';
import {
  Sparkles,
  Music,
  Volume2,
  VolumeX,
  UserPlus,
  X,
  Mic,
  Sun,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  Flame,
  Moon,
  Sunset,
  Skull,
  Dices,
  FolderSync,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';

export interface MasterMainTabsProps {
  activeTab: 'live' | 'moments' | 'combat' | 'notes' | 'library';
  sessionViewMode: 'session' | 'classic';
  setActiveTab: (tab: 'live' | 'moments' | 'combat' | 'notes' | 'library') => void;
  campaign: Campaign | null;
  setCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;
  currentScene: Scene | null;
  activeDisplay: DisplayState;
  liveState: DisplayState;
  operationMode: 'live' | 'staging';
  updateDisplay: (
    fn: (prev: DisplayState) => DisplayState,
    description: string,
    syncImmediate?: boolean
  ) => void;
  updateBanner: () => void;
  selectScene: (sc: Scene) => void;
  toggleAmbientPlay: () => void;
  handleAmbientVolumeChange: (vol: number) => void;
  setShowSummonModal: (show: boolean) => void;
  onOpenCompositor: () => void;
  changeCharacterPosition: (charId: string, pos: CharacterPosition) => void;
  dismissCharacter: (charId: string) => void;
  toggleSpeaking: (charId: string) => void;
  changeCharacterExpression: (charId: string, expName: string, url: string) => void;
  setWeatherEffect: (w: WeatherType) => void;
  setWeatherIntensityVal: (v: number) => void;
  setLightingPreset: (l: LightingFilter) => void;
  playSfx: (sfx: any) => void;
  handleExecuteMacro: (m: CinematicMacro) => void;
  handleLoadMacroToStaging: (m: CinematicMacro) => void;
  handleUpdateMacros: (macros: CinematicMacro[]) => void;
  encountersList: SavedEncounter[];
  setEncountersList: (encs: SavedEncounter[]) => void;
  createAutoCheckpoint: (desc: string, state: DisplayState) => void;
  broadcastMessage: (msg: any) => void;
  diceLog: { id: string; time: string; text: string }[];
  rollDice: (sides: number) => void;
  setShowCampaignPickerModal: (show: boolean) => void;
  exportCampaignJSON: () => void;
  importCampaignJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResetDemo: () => void;
  setEditingScene: (sc: Scene | null) => void;
  setShowNewSceneModal: (show: boolean) => void;
  openEditSceneModal: (sc: Scene) => void;
  setEditingChar: (ch: Character | null) => void;
  setShowNewCharModal: (show: boolean) => void;
  openEditCharModal: (ch: Character) => void;
}

export const MasterMainTabs: React.FC<MasterMainTabsProps> = ({
  activeTab,
  sessionViewMode,
  setActiveTab,
  campaign,
  setCampaign,
  currentScene,
  activeDisplay,
  liveState,
  operationMode,
  updateDisplay,
  updateBanner,
  selectScene,
  toggleAmbientPlay,
  handleAmbientVolumeChange,
  setShowSummonModal,
  onOpenCompositor,
  changeCharacterPosition,
  dismissCharacter,
  toggleSpeaking,
  changeCharacterExpression,
  setWeatherEffect,
  setWeatherIntensityVal,
  setLightingPreset,
  playSfx,
  handleExecuteMacro,
  handleLoadMacroToStaging,
  handleUpdateMacros,
  encountersList,
  setEncountersList,
  createAutoCheckpoint,
  broadcastMessage,
  diceLog,
  rollDice,
  setShowCampaignPickerModal,
  exportCampaignJSON,
  importCampaignJSON,
  handleResetDemo,
  setEditingScene,
  setShowNewSceneModal,
  openEditSceneModal,
  setEditingChar,
  setShowNewCharModal,
  openEditCharModal,
}) => {
  return (
    <>
      {activeTab === 'live' && sessionViewMode === 'classic' && (
        <div className="live-panel">
          <section className="control-section live-scene-editor-cta">
            <div className="live-scene-editor-cta-copy">
              <div className="live-scene-editor-cta-title">
                <Edit size={18} />
                <span>Editar escena en vivo</span>
              </div>
              <p>Arrastrá NPCs directamente, cambiá el fondo y ajustá el encuadre.</p>
            </div>
            <button
              type="button"
              className="btn-primary-sm live-scene-editor-cta-button"
              onClick={onOpenCompositor}
              aria-label="Abrir editor táctil para mover personajes y cambiar el fondo"
            >
              <Edit size={16} />
              <span>Mover personajes</span>
            </button>
          </section>

          {/* Quick Moments Shortcuts in Live Panel */}
          {campaign?.macros && campaign.macros.length > 0 && (
            <section className="control-section quick-moments-live-section">
              <div className="section-header">
                <div className="flex-align-gap">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className="section-title">Momentos Rápidos</span>
                </div>
                <button className="link-button" onClick={() => setActiveTab('moments')}>
                  Ver todos ({campaign.macros.length})
                </button>
              </div>
              <div className="quick-moments-scroll-row">
                {campaign.macros.map((m) => (
                  <button
                    key={m.id}
                    className="quick-moment-chip"
                    onClick={() => handleExecuteMacro(m)}
                    title={m.description}
                  >
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 1. Location Banner Quick Control */}
          <section className="control-section banner-section">
            <div className="section-header">
              <span className="section-title">Cartel de Ubicación en Pantalla</span>
              <button
                className={`mini-toggle ${activeDisplay.locationBanner.visible ? 'on' : 'off'}`}
                onClick={() => {
                  const next = !activeDisplay.locationBanner.visible;
                  updateDisplay(
                    (prev) => ({ ...prev, locationBanner: { ...prev.locationBanner, visible: next } }),
                    `Cartel: ${next ? 'Visible' : 'Oculto'}`
                  );
                }}
              >
                {activeDisplay.locationBanner.visible ? 'Visible' : 'Oculto'}
              </button>
            </div>
            <div className="banner-inputs">
              <input
                type="text"
                placeholder="Título (Ej. RUINAS DE ELDORIA)"
                value={activeDisplay.locationBanner.text}
                onChange={(e) =>
                  updateDisplay(
                    (prev) => ({
                      ...prev,
                      locationBanner: { ...prev.locationBanner, text: e.target.value },
                    }),
                    'Actualizar texto de cartel',
                    false
                  )
                }
                onBlur={updateBanner}
                className="master-input"
              />
              <input
                type="text"
                placeholder="Subtítulo (Ej. Sala del Trono Olvidado)"
                value={activeDisplay.locationBanner.subtitle || ''}
                onChange={(e) =>
                  updateDisplay(
                    (prev) => ({
                      ...prev,
                      locationBanner: { ...prev.locationBanner, subtitle: e.target.value },
                    }),
                    'Actualizar subtítulo de cartel',
                    false
                  )
                }
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
                const isSelected = activeDisplay.currentSceneId === sc.id;
                return (
                  <button
                    key={sc.id}
                    className={`scene-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectScene(sc)}
                  >
                    <div
                      className="scene-thumb"
                      style={{ backgroundImage: `url(${sc.backgroundUrl})` }}
                    >
                      {isSelected && (
                        <div className="active-badge">
                          {operationMode === 'live' ? 'EN PANTALLA' : 'BORRADOR'}
                        </div>
                      )}
                    </div>
                    <span className="scene-name">{sc.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Ambient Audio Bar for Current Scene */}
          {activeDisplay.ambientAudioUrl && (
            <section className="control-section audio-control-section">
              <div className="section-header">
                <div className="flex-align-gap">
                  <Music size={16} className="text-amber-400" />
                  <span className="section-title">
                    {currentScene?.ambientAudioName || 'Música Ambiental'}
                  </span>
                </div>
                <button
                  className={`mini-toggle ${activeDisplay.ambientPlaying ? 'on' : 'off'}`}
                  onClick={toggleAmbientPlay}
                >
                  {activeDisplay.ambientPlaying ? 'Reproduciendo' : 'Pausado'}
                </button>
              </div>
              <div className="audio-slider-row">
                {activeDisplay.ambientPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={activeDisplay.ambientVolume}
                  onChange={(e) => handleAmbientVolumeChange(parseFloat(e.target.value))}
                  className="master-range"
                />
                <span className="slider-label">{Math.round(activeDisplay.ambientVolume * 100)}%</span>
              </div>
            </section>
          )}

          {/* 4. Stage Characters */}
          <section className="control-section">
            <div className="section-header">
              <span className="section-title">Personajes en Escena ({activeDisplay.characters.length})</span>
              <button
                className="btn-primary-sm"
                onClick={() => setShowSummonModal(true)}
              >
                <UserPlus size={14} />
                <span>Invocar NPC</span>
              </button>
            </div>

            {activeDisplay.characters.length === 0 ? (
              <div className="empty-roster-box">
                <p>No hay personajes en la pantalla.</p>
                <button className="btn-secondary-sm" onClick={() => setShowSummonModal(true)}>
                  + Invocar de la Biblioteca
                </button>
              </div>
            ) : (
              <div className="active-chars-grid">
                {activeDisplay.characters.map((char) => {
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

          {/* 5. Weather & Atmosphere Controls */}
          <section className="control-section">
            <span className="section-title">Clima y Partículas</span>
            <div className="weather-grid">
              <button
                className={`weather-btn ${activeDisplay.weather === 'none' ? 'active' : ''}`}
                onClick={() => setWeatherEffect('none')}
              >
                <Sun size={18} />
                <span>Despejado</span>
              </button>
              <button
                className={`weather-btn ${activeDisplay.weather === 'rain' ? 'active' : ''}`}
                onClick={() => setWeatherEffect('rain')}
              >
                <CloudRain size={18} />
                <span>Lluvia</span>
              </button>
              <button
                className={`weather-btn ${activeDisplay.weather === 'storm' ? 'active' : ''}`}
                onClick={() => setWeatherEffect('storm')}
              >
                <CloudLightning size={18} />
                <span>Tormenta</span>
              </button>
              <button
                className={`weather-btn ${activeDisplay.weather === 'snow' ? 'active' : ''}`}
                onClick={() => setWeatherEffect('snow')}
              >
                <Snowflake size={18} />
                <span>Nieve</span>
              </button>
              <button
                className={`weather-btn ${activeDisplay.weather === 'fog' ? 'active' : ''}`}
                onClick={() => setWeatherEffect('fog')}
              >
                <Wind size={18} />
                <span>Niebla</span>
              </button>
              <button
                className={`weather-btn ${activeDisplay.weather === 'embers' ? 'active' : ''}`}
                onClick={() => setWeatherEffect('embers')}
              >
                <Flame size={18} />
                <span>Ascuas</span>
              </button>
              <button
                className={`weather-btn ${activeDisplay.weather === 'fireflies' ? 'active' : ''}`}
                onClick={() => setWeatherEffect('fireflies')}
              >
                <Sparkles size={18} />
                <span>Luciérnagas</span>
              </button>
            </div>

            {activeDisplay.weather !== 'none' && (
              <div className="intensity-slider-row">
                <span className="slider-label">Intensidad: {Math.round(activeDisplay.weatherIntensity * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={activeDisplay.weatherIntensity}
                  onChange={(e) => setWeatherIntensityVal(parseFloat(e.target.value))}
                  className="master-range"
                />
              </div>
            )}
          </section>

          {/* 6. Lighting Color Filter */}
          <section className="control-section">
            <span className="section-title">Filtro de Luz e Iluminación</span>
            <div className="lighting-grid">
              <button
                className={`light-btn ${activeDisplay.lighting === 'normal' ? 'active' : ''}`}
                onClick={() => setLightingPreset('normal')}
              >
                <Sun size={16} />
                <span>Día / Normal</span>
              </button>
              <button
                className={`light-btn ${activeDisplay.lighting === 'torch_flicker' ? 'active' : ''}`}
                onClick={() => setLightingPreset('torch_flicker')}
              >
                <Flame size={16} />
                <span>Antorchas</span>
              </button>
              <button
                className={`light-btn ${activeDisplay.lighting === 'night' ? 'active' : ''}`}
                onClick={() => setLightingPreset('night')}
              >
                <Moon size={16} />
                <span>Noche</span>
              </button>
              <button
                className={`light-btn ${activeDisplay.lighting === 'sunset' ? 'active' : ''}`}
                onClick={() => setLightingPreset('sunset')}
              >
                <Sunset size={16} />
                <span>Atardecer</span>
              </button>
              <button
                className={`light-btn ${activeDisplay.lighting === 'blood_moon' ? 'active' : ''}`}
                onClick={() => setLightingPreset('blood_moon')}
              >
                <Skull size={16} />
                <span>Luna de Sangre</span>
              </button>
              <button
                className={`light-btn ${activeDisplay.lighting === 'mystic_violet' ? 'active' : ''}`}
                onClick={() => setLightingPreset('mystic_violet')}
              >
                <Sparkles size={16} />
                <span>Arcano / Místico</span>
              </button>
            </div>
          </section>

          {/* 7. SFX Soundboard */}
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

      {/* TAB 2: MOMENTS / MACROS */}
      {activeTab === 'moments' && (
        <MomentsTab
          campaign={campaign}
          onExecuteMacro={handleExecuteMacro}
          onLoadMacroToStaging={handleLoadMacroToStaging}
          onUpdateMacros={handleUpdateMacros}
        />
      )}

      {/* TAB 3: COMBAT & INITIATIVE TRACKER */}
      {activeTab === 'combat' && (
        <CombatTab
          combatState={activeDisplay.combatState}
          campaign={campaign}
          currentScene={currentScene}
          encounters={encountersList}
          onSaveEncounter={async (saved) => {
            await saveEncounter(saved);
            if (campaign) {
              const updated = await getCampaignEncounters(campaign.id);
              setEncountersList(updated);
            }
          }}
          onDeleteEncounter={async (id) => {
            await deleteEncounter(id);
            if (campaign) {
              const updated = await getCampaignEncounters(campaign.id);
              setEncountersList(updated);
            }
          }}
          onUpdateCombatState={(newState) => {
            if (activeDisplay.combatState.isActive !== newState.isActive) {
              createAutoCheckpoint(
                newState.isActive ? 'Inicio de Combate' : 'Finalización de Combate',
                liveState
              );
            }
            updateDisplay(
              (prev) => ({ ...prev, combatState: newState }),
              `Combate: Ronda ${newState.round}, Turno ${newState.currentTurnIndex + 1}`
            );
            if (!newState.isActive) {
              broadcastMessage({ type: 'END_COMBAT' });
            } else {
              broadcastMessage({ type: 'UPDATE_COMBAT', payload: newState });
            }
          }}
        />
      )}

      {/* TAB 4: DM NOTES & DICE */}
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
                const updatedScenes = campaign.scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s));
                const updatedCamp = { ...campaign, scenes: updatedScenes };
                setCampaign(updatedCamp);
                updateCampaign(updatedCamp);
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

      {/* TAB 5: LIBRARY & CAMPAIGNS */}
      {activeTab === 'library' && (
        <div className="library-panel">
          <div className="campaign-meta-box">
            <div className="meta-info">
              <div className="flex-between">
                <h2 className="campaign-title">{campaign?.title}</h2>
                <button
                  className="btn-secondary-sm"
                  onClick={() => setShowCampaignPickerModal(true)}
                >
                  <FolderSync size={14} />
                  <span>Cambiar Campaña</span>
                </button>
              </div>
              <p className="campaign-desc">{campaign?.description || 'Sin descripción'}</p>
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
              <span className="section-title">Escenarios de la Campaña ({campaign?.scenes.length || 0})</span>
              <button
                className="btn-primary-sm"
                onClick={() => {
                  setEditingScene(null);
                  setShowNewSceneModal(true);
                }}
              >
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
                  <div className="item-actions">
                    <button
                      className="item-action-btn"
                      onClick={() => openEditSceneModal(sc)}
                      title="Editar Escenario"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="item-delete-btn"
                      onClick={async () => {
                        if (!campaign || campaign.scenes.length <= 1) {
                          alert('Debe quedar al menos un escenario en la campaña.');
                          return;
                        }
                        if (window.confirm(`¿Eliminar el escenario "${sc.name}"?`)) {
                          const updatedScenes = campaign.scenes.filter((s) => s.id !== sc.id);
                          const updatedCamp = { ...campaign, scenes: updatedScenes };
                          await updateCampaign(updatedCamp);
                          setCampaign(updatedCamp);
                        }
                      }}
                      title="Eliminar Escenario"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Characters Management */}
          <div className="library-section">
            <div className="section-header">
              <span className="section-title">Fichas de NPCs y Personajes ({campaign?.characters.length || 0})</span>
              <button
                className="btn-primary-sm"
                onClick={() => {
                  setEditingChar(null);
                  setShowNewCharModal(true);
                }}
              >
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
                  <div className="item-actions">
                    <button
                      className="item-action-btn"
                      onClick={() => openEditCharModal(ch)}
                      title="Editar NPC"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="item-delete-btn"
                      onClick={async () => {
                        if (!campaign) return;
                        if (window.confirm(`¿Eliminar al personaje "${ch.name}"?`)) {
                          const updatedChars = campaign.characters.filter((c) => c.id !== ch.id);
                          const updatedCamp = { ...campaign, characters: updatedChars };
                          await updateCampaign(updatedCamp);
                          setCampaign(updatedCamp);
                        }
                      }}
                      title="Eliminar NPC"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
