import React from 'react';
import { Plus } from 'lucide-react';
import type { GameSession } from '../../../../types';

interface TransferTargetSessionPickerProps {
  sessions: GameSession[];
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;
  isLoading: boolean;
  showNewSessionInput: boolean;
  setShowNewSessionInput: (show: boolean) => void;
  newSessionTitle: string;
  setNewSessionTitle: (title: string) => void;
  onCreateNewSession: (e: React.FormEvent) => void;
}

export const TransferTargetSessionPicker: React.FC<TransferTargetSessionPickerProps> = ({
  sessions,
  selectedSessionId,
  setSelectedSessionId,
  isLoading,
  showNewSessionInput,
  setShowNewSessionInput,
  newSessionTitle,
  setNewSessionTitle,
  onCreateNewSession,
}) => {
  return (
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

      {showNewSessionInput && (
        <form
          onSubmit={onCreateNewSession}
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
      )}

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
          aria-label="Sesión de destino"
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
  );
};
