import React from 'react';
import type { DuplicateSessionOptions } from '../../../../types';
import { Copy, BookTemplate, Trash2 } from 'lucide-react';

export interface DuplicateSessionDialogProps {
  options: DuplicateSessionOptions;
  onChangeOptions: React.Dispatch<React.SetStateAction<DuplicateSessionOptions>>;
  onClose: () => void;
  onDuplicate: () => void;
}

export const DuplicateSessionDialog: React.FC<DuplicateSessionDialogProps> = ({
  options,
  onChangeOptions,
  onClose,
  onDuplicate,
}) => {
  return (
    <div className="session-dialog-overlay">
      <div className="session-dialog">
        <h3>Duplicar preparación</h3>
        <input
          className="session-dialog-input"
          value={options.newName ?? ''}
          onChange={(e) => onChangeOptions((o) => ({ ...o, newName: e.target.value }))}
          placeholder="Nombre de la copia"
          aria-label="Nombre de la sesión duplicada"
        />
        <label className="session-dialog-checkbox">
          <input
            type="checkbox"
            checked={options.excludeCombatProgress}
            onChange={(e) => onChangeOptions((o) => ({ ...o, excludeCombatProgress: e.target.checked }))}
          />
          Excluir progreso de combate (rondas, temporizadores)
        </label>
        <label className="session-dialog-checkbox">
          <input
            type="checkbox"
            checked={options.restoreNpcHp}
            onChange={(e) => onChangeOptions((o) => ({ ...o, restoreNpcHp: e.target.checked }))}
          />
          Restaurar HP al máximo en Monstruos y NPCs (desmarcar para conservar daño infligido)
        </label>
        <label className="session-dialog-checkbox">
          <input
            type="checkbox"
            checked={options.excludeConditions}
            onChange={(e) => onChangeOptions((o) => ({ ...o, excludeConditions: e.target.checked }))}
          />
          Excluir condiciones activas
        </label>
        <div className="session-dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-dialog-confirm" onClick={onDuplicate}>
            <Copy size={14} /> Duplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export interface SaveTemplateDialogProps {
  templateName: string;
  onChangeTemplateName: (name: string) => void;
  onClose: () => void;
  onSaveTemplate: () => void;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  templateName,
  onChangeTemplateName,
  onClose,
  onSaveTemplate,
}) => {
  return (
    <div className="session-dialog-overlay">
      <div className="session-dialog">
        <h3>Guardar como plantilla</h3>
        <p className="session-dialog-hint">
          La plantilla excluirá HP perdidos, combate activo y condiciones transitorias.
        </p>
        <input
          className="session-dialog-input"
          value={templateName}
          onChange={(e) => onChangeTemplateName(e.target.value)}
          placeholder="Nombre de la plantilla"
          aria-label="Nombre de la plantilla"
        />
        <div className="session-dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-dialog-confirm" onClick={onSaveTemplate} disabled={!templateName.trim()}>
            <BookTemplate size={14} /> Guardar plantilla
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ConfirmDeleteDialogProps {
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  onClose,
  onConfirm,
}) => {
  return (
    <div className="session-dialog-overlay">
      <div className="session-dialog session-dialog-danger">
        <h3>¿Eliminar sesión definitivamente?</h3>
        <p>Esta acción no se puede deshacer. La sesión se eliminará de forma irreversible.</p>
        <div className="session-dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-dialog-danger" onClick={onConfirm}>
            <Trash2 size={14} /> Eliminar definitivamente
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ConfirmEmptyTrashDialogProps {
  trashedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmEmptyTrashDialog: React.FC<ConfirmEmptyTrashDialogProps> = ({
  trashedCount,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="session-dialog-overlay">
      <div className="session-dialog session-dialog-danger">
        <h3>¿Vaciar papelera?</h3>
        <p>Se eliminarán permanentemente todas las sesiones de la papelera ({trashedCount}).</p>
        <div className="session-dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-dialog-danger" onClick={onConfirm}>
            <Trash2 size={14} /> Vaciar papelera
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── DIÁLOGOS DE CONTINUIDAD Y REUTILIZACIÓN ────────────────────────────── */

export interface PrepareNextSessionDialogProps {
  currentSessionName: string;
  options: import('../../../../types').NextSessionOptions;
  onChangeOptions: React.Dispatch<React.SetStateAction<import('../../../../types').NextSessionOptions>>;
  onClose: () => void;
  onConfirm: () => void;
}

export const PrepareNextSessionDialog: React.FC<PrepareNextSessionDialogProps> = ({
  currentSessionName,
  options,
  onChangeOptions,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="session-dialog-overlay">
      <div className="session-dialog" style={{ width: 'min(500px, 95vw)' }}>
        <h3>Preparar siguiente entrega</h3>
        <p className="session-dialog-hint">
          Crea una nueva preparación para el mismo grupo a partir de <strong>{currentSessionName}</strong>.
        </p>

        <div className="session-continuity-summary">
          <div className="continuity-item">
            <span className="continuity-icon">🛡️</span>
            <div>
              <strong>Se conserva:</strong> Revelaciones del grupo, estado de puertas y mundo, inventario y notas.
            </div>
          </div>
          <div className="continuity-item">
            <span className="continuity-icon">✨</span>
            <div>
              <strong>Limpio para empezar:</strong> Comienza en Preparación, con la Mesa en blanco (sin publicar) y temporizadores detenidos.
            </div>
          </div>
        </div>

        <input
          className="session-dialog-input"
          value={options.newName ?? ''}
          onChange={(e) => onChangeOptions((o) => ({ ...o, newName: e.target.value }))}
          placeholder="Nombre de la siguiente sesión (ej. Sesión 4)"
          aria-label="Nombre de la nueva sesión"
        />

        <label className="session-dialog-checkbox">
          <input
            type="checkbox"
            checked={options.preserveNpcHpLoss ?? true}
            onChange={(e) => onChangeOptions((o) => ({ ...o, preserveNpcHpLoss: e.target.checked }))}
          />
          Conservar daño infligido a NPCs y monstruos (desmarcar para curar al máximo)
        </label>

        <label className="session-dialog-checkbox">
          <input
            type="checkbox"
            checked={options.preserveConditions ?? true}
            onChange={(e) => onChangeOptions((o) => ({ ...o, preserveConditions: e.target.checked }))}
          />
          Conservar estados y condiciones de combate activos
        </label>

        <div className="session-dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-dialog-confirm" onClick={onConfirm} disabled={!options.newName?.trim()}>
            Continuar historia
          </button>
        </div>
      </div>
    </div>
  );
};

export interface CreateNewGroupSessionDialogProps {
  sourceSessionName: string;
  initialBaselineConfig?: import('../../../../types').SessionInitialBaseline;
  options: import('../../../../types').NewGroupSessionOptions;
  onChangeOptions: React.Dispatch<React.SetStateAction<import('../../../../types').NewGroupSessionOptions>>;
  onClose: () => void;
  onConfirm: () => void;
}

export const CreateNewGroupSessionDialog: React.FC<CreateNewGroupSessionDialogProps> = ({
  sourceSessionName,
  initialBaselineConfig,
  options,
  onChangeOptions,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="session-dialog-overlay">
      <div className="session-dialog" style={{ width: 'min(520px, 95vw)' }}>
        <h3>Jugar con otro grupo</h3>
        <p className="session-dialog-hint">
          Bifurca <strong>{sourceSessionName}</strong> creando una línea de progreso independiente.
        </p>

        <div className="session-continuity-summary">
          <div className="continuity-item">
            <span className="continuity-icon">👥</span>
            <div>
              <strong>Grupo independiente:</strong> Las decisiones, revelaciones y diario de esta mesa nunca se mezclarán con otros grupos.
            </div>
          </div>
          <div className="continuity-item">
            <span className="continuity-icon">🎭</span>
            <div>
              <strong>Misterios protegidos:</strong> Los personajes vuelven a sus siluetas y alias misteriosos para no spoilear la trama.
            </div>
          </div>
          <div className="continuity-item">
            <span className="continuity-icon">🏰</span>
            <div>
              <strong>Escenario intacto:</strong> Conserva mapas, props decorados, puertas intencionalmente abiertas, luces y música.
            </div>
          </div>
          {initialBaselineConfig ? (
            <div className="continuity-item" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '8px 10px', marginTop: 4 }}>
              <span className="continuity-icon">🛡️</span>
              <div>
                <strong>Línea base preparada:</strong> {initialBaselineConfig.label || 'Configuración inicial'} (v{initialBaselineConfig.version})
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                  Se conservarán los personajes conocidos de origen, los NPCs heridos de antemano y las puertas cerradas preparadas.
                </div>
              </div>
            </div>
          ) : (
            <div className="continuity-item" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '8px 10px', marginTop: 4 }}>
              <span className="continuity-icon">⚠️</span>
              <div>
                <strong>Sin línea base fijada:</strong> Se derivará una configuración limpia a partir del borrador de la sesión.
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#93c5fd', background: 'rgba(59,130,246,0.1)', padding: '6px 10px', borderRadius: 4, margin: '8px 0', border: '1px solid rgba(59,130,246,0.2)' }}>
          🔒 La nueva sesión comenzará en Preparación con la Mesa en blanco (sin alterar la pantalla de los jugadores).
        </div>

        <input
          className="session-dialog-input"
          value={options.targetGroupName}
          onChange={(e) => onChangeOptions((o) => ({ ...o, targetGroupName: e.target.value }))}
          placeholder="Nombre del nuevo grupo (ej. Grupo de los Viernes)"
          aria-label="Nombre del grupo"
        />

        <input
          className="session-dialog-input"
          value={options.newName ?? ''}
          onChange={(e) => onChangeOptions((o) => ({ ...o, newName: e.target.value }))}
          placeholder="Nombre de la sesión (ej. Capítulo 1 - Viernes)"
          aria-label="Nombre de la nueva sesión"
        />

        <label className="session-dialog-checkbox">
          <input
            type="checkbox"
            checked={options.resetRevelations ?? true}
            onChange={(e) => onChangeOptions((o) => ({ ...o, resetRevelations: e.target.checked }))}
          />
          Reiniciar revelaciones de identidad (ocultar apariencias y nombres reales)
        </label>

        <label className="session-dialog-checkbox">
          <input
            type="checkbox"
            checked={options.resetNpcHp ?? true}
            onChange={(e) => onChangeOptions((o) => ({ ...o, resetNpcHp: e.target.checked }))}
          />
          Restaurar puntos de vida de NPCs y monstruos al 100%
        </label>

        <div className="session-dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="btn-dialog-confirm"
            onClick={onConfirm}
            disabled={!options.targetGroupName?.trim() || !options.newName?.trim()}
          >
            Crear partida para nuevo grupo
          </button>
        </div>
      </div>
    </div>
  );
};

