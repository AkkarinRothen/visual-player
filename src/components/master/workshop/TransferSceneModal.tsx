import React, { useState, useEffect } from 'react';
import { X, Send, Plus, CheckCircle, Image as ImageIcon, Users, Sparkles, Compass } from 'lucide-react';
import type { Campaign, Scene, GameSession, DisplayState, WeatherType } from '../../../types';
import { getSessionsByCampaign, createGameSession } from '../../../db/sessionDb';
import { db } from '../../../db';

export interface TransferSceneModalProps {
  scene: Scene | null;
  campaign?: Campaign | null;
  currentCampaignId?: string;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (targetSessionName: string, mode: 'repertoire' | 'staging') => void;
  onTransferred?: (targetSessionName: string, mode: 'repertoire' | 'staging') => void;
  onOpenSession?: (sessionId: string) => void;
}

export const TransferSceneModal: React.FC<TransferSceneModalProps> = ({
  isOpen = true,
  scene,
  campaign: propCampaign,
  currentCampaignId,
  onClose,
  onSuccess,
  onTransferred,
  onOpenSession,
}) => {
  const [resolvedCampaign, setResolvedCampaign] = useState<Campaign | null>(propCampaign || null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [transferMode, setTransferMode] = useState<'repertoire' | 'staging'>('repertoire');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showNewSessionInput, setShowNewSessionInput] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [transferredSession, setTransferredSession] = useState<{ id: string; name: string; mode: 'repertoire' | 'staging' } | null>(null);

  // Resolver campaña si solo vino currentCampaignId
  useEffect(() => {
    if (propCampaign) {
      setResolvedCampaign(propCampaign);
    } else if (currentCampaignId) {
      db.campaigns.get(currentCampaignId).then((c) => {
        if (c) setResolvedCampaign(c);
      });
    }
  }, [propCampaign, currentCampaignId]);

  useEffect(() => {
    if (isOpen && resolvedCampaign) {
      loadSessions(resolvedCampaign.id);
      setTransferredSession(null);
      setShowNewSessionInput(false);
      setNewSessionTitle('');
    }
  }, [isOpen, resolvedCampaign]);

  const loadSessions = async (campaignId: string) => {
    setIsLoading(true);
    try {
      const list = await getSessionsByCampaign(campaignId);
      const activeList = list.filter((s: GameSession) => !s.isDeleted);
      setSessions(activeList);
      if (activeList.length > 0) {
        setSelectedSessionId(activeList[0].id);
      } else {
        setSelectedSessionId('');
      }
    } catch (err) {
      console.warn('Error cargando sesiones para traslado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !scene || !resolvedCampaign) return null;

  const charactersCount = scene.activeCharacters?.length || 0;

  const handleCreateNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim() || !resolvedCampaign) return;

    try {
      const created = await createGameSession(resolvedCampaign.id, newSessionTitle.trim());
      await loadSessions(resolvedCampaign.id);
      setSelectedSessionId(created.id);
      setShowNewSessionInput(false);
      setNewSessionTitle('');
    } catch (err) {
      console.error('Error creando nueva preparación:', err);
      alert('No se pudo crear la nueva preparación.');
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedSessionId) {
      alert('Por favor selecciona una preparación de destino.');
      return;
    }

    setIsTransferring(true);
    try {
      // 1. Obtener la sesión destino desde Dexie
      const targetSession = await db.sessions.get(selectedSessionId);
      if (!targetSession) {
        throw new Error('Sesión no encontrada en la base de datos');
      }

      // 2. Crear copia profunda independiente de la escena
      const sceneCopy: Scene = JSON.parse(JSON.stringify(scene));
      // Asegurar ID único si colisiona o mantener referencia estable
      const existingScenes = targetSession.frozenScenes || [];
      const updatedFrozenScenes = existingScenes.some((s) => s.id === sceneCopy.id)
        ? existingScenes.map((s) => (s.id === sceneCopy.id ? sceneCopy : s))
        : [...existingScenes, sceneCopy];

      // 3. Si el modo es 'staging', configurar el borrador de preparación activo
      let updatedStagedState = targetSession.stagedState;
      if (transferMode === 'staging') {
        const baseState: DisplayState = targetSession.stagedState || targetSession.liveState || {
          currentSceneId: sceneCopy.id,
          sceneName: sceneCopy.name,
          backgroundUrl: sceneCopy.backgroundUrl,
          characters: sceneCopy.activeCharacters || [],
          locationBanner: {
            text: sceneCopy.locationBanner || sceneCopy.name,
            subtitle: sceneCopy.subtitle || '',
            visible: !!sceneCopy.locationBanner,
          },
          weather: (sceneCopy.weather && sceneCopy.weather !== 'none' ? sceneCopy.weather : 'clear') as WeatherType,
          weatherIntensity: 1,
          lighting: sceneCopy.lighting || 'normal',
          isBlackout: false,
          shakeTrigger: 0,
          lightningTrigger: 0,
          ambientAudioUrl: sceneCopy.ambientAudioUrl || '',
          ambientPlaying: !!sceneCopy.ambientAudioUrl,
          ambientVolume: 0.8,
          lastSfx: null,
          combatState: {
            isActive: false,
            round: 1,
            currentTurnIndex: 0,
            combatants: [],
          },
        };

        updatedStagedState = {
          ...baseState,
          currentSceneId: sceneCopy.id,
          sceneName: sceneCopy.name,
          backgroundUrl: sceneCopy.backgroundUrl,
          characters: sceneCopy.activeCharacters || [],
          locationBanner: {
            text: sceneCopy.locationBanner || sceneCopy.name,
            subtitle: sceneCopy.subtitle || '',
            visible: true,
          },
          weather: (sceneCopy.weather && sceneCopy.weather !== 'none' ? sceneCopy.weather : baseState.weather) as WeatherType,
          lighting: sceneCopy.lighting || baseState.lighting,
          ambientAudioUrl: sceneCopy.ambientAudioUrl || baseState.ambientAudioUrl,
          ambientPlaying: !!sceneCopy.ambientAudioUrl,
        };
      }

      // 4. Guardar transaccionalmente en Dexie
      await db.transaction('rw', db.sessions, async () => {
        await db.sessions.update(selectedSessionId, {
          frozenScenes: updatedFrozenScenes,
          ...(transferMode === 'staging' ? { stagedState: updatedStagedState } : {}),
          revision: (targetSession.revision || 1) + 1,
          updatedAt: Date.now(),
        });
      });

      // 5. Estado de éxito
      setTransferredSession({
        id: targetSession.id,
        name: targetSession.name,
        mode: transferMode,
      });

      onSuccess?.(targetSession.name, transferMode);
      onTransferred?.(targetSession.name, transferMode);
    } catch (err) {
      console.error('Error al transferir escena a sesión:', err);
      alert('Hubo un error al trasladar la escena a la preparación.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
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
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <Send size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 600 }}>
                Llevar Escena a Preparación
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Campaña: <strong>{resolvedCampaign.title}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Pantalla de éxito tras confirmar */}
        {transferredSession ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <CheckCircle size={52} className="text-emerald-400" style={{ margin: '0 auto 16px' }} />
            <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#fff' }}>
              ¡Escena incorporada con éxito!
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.5 }}>
              La escena <strong>{scene.name}</strong> ha sido trasladada a la sesión{' '}
              <strong style={{ color: '#fbbf24' }}>«{transferredSession.name}»</strong>{' '}
              {transferredSession.mode === 'staging'
                ? 'y cargada en el borrador de Staging.'
                : 'como parte de su repertorio disponible.'}
              <br />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                No se ha publicado nada en la Mesa de los jugadores.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#e2e8f0',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Seguir en el Taller
              </button>
              {onOpenSession && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSession(transferredSession.id);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #d97706, #b45309)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Compass size={16} />
                  <span>Abrir Preparación</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Contenido del formulario de traslado */
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 1. Tarjeta resumen de la escena */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '96px',
                  height: '54px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#090d16',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {scene.backgroundUrl ? (
                  <img
                    src={scene.backgroundUrl}
                    alt={scene.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                    }}
                  >
                    <ImageIcon size={20} />
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h4
                  style={{
                    margin: '0 0 4px',
                    fontSize: '0.95rem',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {scene.name}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={13} className="text-amber-400" />
                    {charactersCount} {charactersCount === 1 ? 'figura' : 'figuras'}
                  </span>
                  {scene.ambientAudioUrl && (
                    <span style={{ color: '#38bdf8' }}>• Con música ambiental</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Selector de Sesión de Destino */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Sesión o Preparación de Destino:
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewSessionInput(!showNewSessionInput)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fbbf24',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <Plus size={13} />
                  <span>{showNewSessionInput ? 'Cancelar nueva' : '+ Nueva preparación'}</span>
                </button>
              </div>

              {showNewSessionInput ? (
                <form
                  onSubmit={handleCreateNewSession}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '10px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <input
                    type="text"
                    required
                    placeholder="Nombre de la nueva sesión..."
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#090d16',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      color: '#fff',
                      padding: '6px 10px',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#d97706',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Crear
                  </button>
                </form>
              ) : null}

              {isLoading ? (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '10px 0' }}>
                  Cargando preparaciones...
                </div>
              ) : sessions.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '14px',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                  }}
                >
                  No hay preparaciones creadas en esta campaña.
                  <br />
                  Usa el botón <strong>«+ Nueva preparación»</strong> para crear una.
                </div>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#090d16',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.frozenScenes?.length || 0} escenas)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 3. Opciones de Incorporación */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
                Forma de Incorporación:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    background: transferMode === 'repertoire' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: transferMode === 'repertoire' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="transferMode"
                    value="repertoire"
                    checked={transferMode === 'repertoire'}
                    onChange={() => setTransferMode('repertoire')}
                    style={{ marginTop: '2px', accentColor: '#d97706' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#fff', display: 'block' }}>
                      Añadir al repertorio disponible (Recomendado)
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Guarda la escena en la lista de preparación para usarla cuando la historia lo requiera, sin alterar el borrador activo.
                    </span>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    background: transferMode === 'staging' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: transferMode === 'staging' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="transferMode"
                    value="staging"
                    checked={transferMode === 'staging'}
                    onChange={() => setTransferMode('staging')}
                    style={{ marginTop: '2px', accentColor: '#d97706' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#fff', display: 'block' }}>
                      Abrir como escena en preparación (Staging)
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Carga la escena de inmediato en el borrador de Staging de la sesión lista para revisar o publicar.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Advertencia informativa */}
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                fontSize: '0.78rem',
                color: '#bae6fd',
              }}
            >
              <Sparkles size={16} className="text-sky-400" style={{ flexShrink: 0 }} />
              <span>
                Se genera una copia independiente de la escena y sus personajes colocados, reutilizando las imágenes guardadas en tu dispositivo.
              </span>
            </div>

            {/* Acciones inferiores */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isTransferring}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={isTransferring || !selectedSessionId}
                style={{
                  background: isTransferring || !selectedSessionId ? '#4b5563' : 'linear-gradient(135deg, #d97706, #b45309)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: isTransferring || !selectedSessionId ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={15} />
                <span>{isTransferring ? 'Trasladando...' : 'Confirmar Traslado'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
