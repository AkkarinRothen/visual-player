import React, { useState, useMemo } from 'react';
import type { DisplayState, PublishCategoryKey, CategoryDiff, DependencyWarning, Campaign } from '../../types';
import {
  Send,
  CheckSquare,
  Square,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  X,
  Image,
  Users,
  CloudRain,
  Sun,
  BookOpen,
  Music,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

interface SelectivePublishModalProps {
  liveState: DisplayState;
  stagedState: DisplayState;
  campaign: Campaign | null;
  onPublishSelective: (selectedKeys: PublishCategoryKey[]) => void;
  onPublishAll: () => void;
  onClose: () => void;
}

export const SelectivePublishModal: React.FC<SelectivePublishModalProps> = ({
  liveState,
  stagedState,
  campaign,
  onPublishSelective,
  onPublishAll,
  onClose,
}) => {
  // 1. Calculate All Diffs
  const diffs: CategoryDiff[] = useMemo(() => {
    const list: CategoryDiff[] = [];

    // Background / Scene
    const bgChanged =
      liveState.currentSceneId !== stagedState.currentSceneId ||
      liveState.backgroundUrl !== stagedState.backgroundUrl;
    if (bgChanged) {
      list.push({
        key: 'background',
        label: 'Escenario y Fondo',
        icon: 'Image',
        hasChanged: true,
        liveSummary: liveState.sceneName || 'Escenario actual',
        stagedSummary: stagedState.sceneName || 'Nuevo escenario',
      });
    }

    // Characters on screen
    const liveCharsStr = JSON.stringify(liveState.characters.map((c) => ({ id: c.id, pos: c.position, spk: c.isSpeaking, exp: c.activeExpression })));
    const stagedCharsStr = JSON.stringify(stagedState.characters.map((c) => ({ id: c.id, pos: c.position, spk: c.isSpeaking, exp: c.activeExpression })));
    const charsChanged = liveCharsStr !== stagedCharsStr;
    if (charsChanged) {
      const added = stagedState.characters.filter((sc) => !liveState.characters.some((lc) => lc.id === sc.id));
      const removed = liveState.characters.filter((lc) => !stagedState.characters.some((sc) => sc.id === lc.id));
      let desc = `${stagedState.characters.length} NPCs`;
      if (added.length > 0) desc += ` (+${added.map((c) => c.name).join(', ')})`;
      if (removed.length > 0) desc += ` (-${removed.map((c) => c.name).join(', ')})`;

      list.push({
        key: 'characters',
        label: 'Personajes en Escena',
        icon: 'Users',
        hasChanged: true,
        liveSummary: `${liveState.characters.length} NPCs en pantalla`,
        stagedSummary: desc,
      });
    }

    // Weather
    const weatherChanged =
      liveState.weather !== stagedState.weather ||
      liveState.weatherIntensity !== stagedState.weatherIntensity;
    if (weatherChanged) {
      list.push({
        key: 'weather',
        label: 'Clima y Partículas',
        icon: 'CloudRain',
        hasChanged: true,
        liveSummary: `${liveState.weather} (${Math.round(liveState.weatherIntensity * 100)}%)`,
        stagedSummary: `${stagedState.weather} (${Math.round(stagedState.weatherIntensity * 100)}%)`,
      });
    }

    // Lighting
    const lightingChanged = liveState.lighting !== stagedState.lighting;
    if (lightingChanged) {
      list.push({
        key: 'lighting',
        label: 'Filtro de Iluminación',
        icon: 'Sun',
        hasChanged: true,
        liveSummary: liveState.lighting,
        stagedSummary: stagedState.lighting,
      });
    }

    // Location Banner
    const bannerChanged =
      liveState.locationBanner.text !== stagedState.locationBanner.text ||
      liveState.locationBanner.subtitle !== stagedState.locationBanner.subtitle ||
      liveState.locationBanner.visible !== stagedState.locationBanner.visible;
    if (bannerChanged) {
      list.push({
        key: 'locationBanner',
        label: 'Cartel de Ubicación',
        icon: 'BookOpen',
        hasChanged: true,
        liveSummary: liveState.locationBanner.visible ? liveState.locationBanner.text : '(Oculto)',
        stagedSummary: stagedState.locationBanner.visible ? stagedState.locationBanner.text : '(Oculto)',
      });
    }

    // Ambient Audio
    const audioChanged =
      liveState.ambientAudioUrl !== stagedState.ambientAudioUrl ||
      liveState.ambientPlaying !== stagedState.ambientPlaying ||
      liveState.ambientVolume !== stagedState.ambientVolume;
    if (audioChanged) {
      list.push({
        key: 'ambientAudio',
        label: 'Música y Audio Ambiental',
        icon: 'Music',
        hasChanged: true,
        liveSummary: liveState.ambientPlaying ? 'En reproducción' : 'Pausado / Sin audio',
        stagedSummary: stagedState.ambientPlaying ? `Reproduciendo (${Math.round(stagedState.ambientVolume * 100)}%)` : 'Pausado',
      });
    }

    // Blackout
    const blackoutChanged = liveState.isBlackout !== stagedState.isBlackout;
    if (blackoutChanged) {
      list.push({
        key: 'blackout',
        label: 'Blackout (Pánico)',
        icon: 'EyeOff',
        hasChanged: true,
        liveSummary: liveState.isBlackout ? 'Blackout Activo' : 'Pantalla Normal',
        stagedSummary: stagedState.isBlackout ? 'Blackout Activo' : 'Pantalla Normal',
      });
    }

    return list;
  }, [liveState, stagedState]);

  // Selected categories state (default: all changed)
  const [selectedKeys, setSelectedKeys] = useState<PublishCategoryKey[]>(() =>
    diffs.map((d) => d.key)
  );

  const toggleCategory = (key: PublishCategoryKey) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter((k) => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  const selectAll = () => {
    setSelectedKeys(diffs.map((d) => d.key));
  };

  const deselectAll = () => {
    setSelectedKeys([]);
  };

  // 2. Dependency Analysis Engine
  const warnings: DependencyWarning[] = useMemo(() => {
    const list: DependencyWarning[] = [];

    const isBgSelected = selectedKeys.includes('background');
    const isBannerSelected = selectedKeys.includes('locationBanner');
    const isAudioSelected = selectedKeys.includes('ambientAudio');
    const isCharsSelected = selectedKeys.includes('characters');

    const stagedScene = campaign?.scenes.find((s) => s.id === stagedState.currentSceneId);

    // Warning: Background changed without updating Location Banner
    if (isBgSelected && !isBannerSelected && diffs.some((d) => d.key === 'locationBanner')) {
      list.push({
        id: 'warn-bg-banner',
        type: 'narrative_warning',
        title: 'Cartel desincronizado con el nuevo escenario',
        description: `Se publicará el fondo "${stagedState.sceneName}" pero el cartel mantendrá "${liveState.locationBanner.text}".`,
        recommendedCategoryKeys: ['locationBanner'],
      });
    }

    // Warning: Background changed without updating Scene Ambient Audio
    if (isBgSelected && !isAudioSelected && stagedScene?.ambientAudioUrl && diffs.some((d) => d.key === 'ambientAudio')) {
      list.push({
        id: 'warn-bg-audio',
        type: 'narrative_warning',
        title: 'Música ambiental no sincronizada',
        description: `El nuevo escenario tiene asignada una pista de audio que no ha sido seleccionada.`,
        recommendedCategoryKeys: ['ambientAudio'],
      });
    }

    // Warning: Characters published without publishing the new Background they belong to
    if (isCharsSelected && !isBgSelected && diffs.some((d) => d.key === 'background')) {
      list.push({
        id: 'warn-chars-old-bg',
        type: 'narrative_warning',
        title: 'Personajes en escenario anterior',
        description: `Los personajes se publicarán sobre "${liveState.sceneName}" en lugar de "${stagedState.sceneName}".`,
        recommendedCategoryKeys: ['background'],
      });
    }

    return list;
  }, [selectedKeys, diffs, liveState, stagedState, campaign]);

  const applyRecommended = (recommendedKeys: PublishCategoryKey[]) => {
    const combined = Array.from(new Set([...selectedKeys, ...recommendedKeys]));
    setSelectedKeys(combined);
  };

  const getCategoryIcon = (key: PublishCategoryKey) => {
    switch (key) {
      case 'background':
        return <Image size={18} className="text-amber-400" />;
      case 'characters':
        return <Users size={18} className="text-blue-400" />;
      case 'weather':
        return <CloudRain size={18} className="text-cyan-400" />;
      case 'lighting':
        return <Sun size={18} className="text-amber-300" />;
      case 'locationBanner':
        return <BookOpen size={18} className="text-emerald-400" />;
      case 'ambientAudio':
        return <Music size={18} className="text-purple-400" />;
      case 'blackout':
        return <EyeOff size={18} className="text-rose-400" />;
    }
  };

  const remainingChangesCount = diffs.length - selectedKeys.length;

  return (
    <div className="modal-overlay selective-publish-overlay" onClick={onClose}>
      <div className="modal-content selective-publish-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex-align-gap">
            <Send size={20} className="text-amber-400" />
            <h2>Revisar y Publicar Borrador</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="modal-subtitle">
          Selecciona exactamente qué elementos del borrador deseas enviar a la Tablet. Los cambios no seleccionados se conservarán en Preparación.
        </p>

        {/* Action bar: Select All / Deselect All */}
        <div className="diff-selection-toolbar">
          <span className="diff-count-badge">
            {selectedKeys.length} de {diffs.length} categorías seleccionadas
          </span>
          <div className="flex-align-gap">
            <button className="toolbar-btn" onClick={selectAll}>
              <CheckSquare size={14} />
              <span>Seleccionar Todo</span>
            </button>
            <button className="toolbar-btn" onClick={deselectAll}>
              <Square size={14} />
              <span>Deseleccionar</span>
            </button>
          </div>
        </div>

        {/* Dependency Warnings Panel */}
        {warnings.length > 0 && (
          <div className="dependency-warnings-box">
            {warnings.map((warn) => (
              <div key={warn.id} className={`dependency-alert ${warn.type}`}>
                <div className="flex-align-gap">
                  {warn.type === 'technical_blocker' ? (
                    <AlertCircle size={16} className="text-rose-400" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-400" />
                  )}
                  <strong>{warn.title}</strong>
                </div>
                <p className="dep-desc">{warn.description}</p>
                {warn.recommendedCategoryKeys.length > 0 && (
                  <button
                    className="btn-apply-recommended"
                    onClick={() => applyRecommended(warn.recommendedCategoryKeys)}
                  >
                    <Sparkles size={12} />
                    <span>Auto-seleccionar recomendados</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Diffs List */}
        <div className="diffs-list-container">
          {diffs.map((diff) => {
            const isSelected = selectedKeys.includes(diff.key);

            return (
              <div
                key={diff.key}
                className={`diff-category-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleCategory(diff.key)}
              >
                <div className="diff-card-left">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Controlled by card click
                    className="diff-checkbox"
                  />
                  <div className="diff-icon-wrapper">{getCategoryIcon(diff.key)}</div>
                  <div className="diff-label-block">
                    <strong className="diff-label">{diff.label}</strong>
                    <div className="diff-comparison-row">
                      <span className="diff-pill live">
                        <strong>En Pantalla:</strong> {diff.liveSummary}
                      </span>
                      <ArrowRight size={14} className="text-slate-500" />
                      <span className="diff-pill staged">
                        <strong>Borrador:</strong> {diff.stagedSummary}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info & Buttons */}
        <div className="selective-publish-footer">
          {remainingChangesCount > 0 && selectedKeys.length > 0 && (
            <span className="remaining-staging-notice">
              ℹ️ Quedarán {remainingChangesCount} cambio(s) pendientes en borrador.
            </span>
          )}

          <div className="modal-footer-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>

            <button
              className="btn-secondary publish-all-btn"
              onClick={() => {
                onPublishAll();
                onClose();
              }}
              title="Publicar todo el borrador completo"
            >
              <Send size={15} />
              <span>Publicar Todo ({diffs.length})</span>
            </button>

            <button
              className="btn-primary publish-selected-btn"
              disabled={selectedKeys.length === 0}
              onClick={() => {
                onPublishSelective(selectedKeys);
                onClose();
              }}
            >
              <Send size={16} />
              <span>Publicar Seleccionados ({selectedKeys.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
