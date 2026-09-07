import React, { useMemo, useState } from 'react';
import type { HistoryEvent } from '../../types';
import { History, RotateCcw, X, Radio, Layers, Search } from 'lucide-react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';

interface HistoryModalProps {
  pastEvents: HistoryEvent[];
  onRestoreEvent: (event: HistoryEvent) => void;
  onClose: () => void;
}

const historyFeatures = tableFeatures({});
const historyColumnHelper = createColumnHelper<typeof historyFeatures, HistoryEvent>();

export const HistoryModal: React.FC<HistoryModalProps> = ({
  pastEvents,
  onRestoreEvent,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pastEvents;
    return pastEvents.filter((event) => {
      const sceneName = event.stateSnapshot.sceneName || 'Sin Escenario';
      return [event.description, event.mode, sceneName].some((value) => value.toLowerCase().includes(query));
    });
  }, [pastEvents, searchQuery]);

  const columns = useMemo(() => historyColumnHelper.columns([
    historyColumnHelper.accessor('timestamp', {
      header: 'Hora',
      cell: (info) => new Date(info.getValue()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }),
    historyColumnHelper.accessor('description', {
      header: 'Acción',
      cell: (info) => <strong className="history-table-action">{info.getValue()}</strong>,
    }),
    historyColumnHelper.accessor('mode', {
      header: 'Modo',
      cell: (info) => {
        const isLive = info.getValue() === 'live';
        return (
          <span className={`event-mode-badge ${info.getValue()}`}>
            {isLive ? <Radio size={12} /> : <Layers size={12} />}
            <span>{isLive ? 'En Vivo' : 'Borrador'}</span>
          </span>
        );
      },
    }),
    historyColumnHelper.accessor((event) => event.stateSnapshot.sceneName || 'Sin Escenario', {
      id: 'scene',
      header: 'Escena',
      cell: (info) => <span className="history-table-scene">{info.getValue()}</span>,
    }),
    historyColumnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          className="btn-secondary-sm restore-event-btn"
          onClick={() => {
            if (window.confirm(`¿Restaurar estado: "${row.original.description}"?`)) {
              onRestoreEvent(row.original);
              onClose();
            }
          }}
          title="Restaurar este punto"
          aria-label={`Restaurar ${row.original.description}`}
        >
          <RotateCcw size={14} />
          <span>Restaurar</span>
        </button>
      ),
    }),
  ]), [onClose, onRestoreEvent]);
  const table = useTable({ features: historyFeatures, columns, data: filteredEvents });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex-align-gap">
            <History size={20} className="text-amber-400" />
            <h2>Historial de Acciones</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar historial">
            <X size={20} />
          </button>
        </div>

        <p className="modal-subtitle">
          Últimas acciones registradas. Puedes viajar a cualquier punto anterior sin perder la trazabilidad.
        </p>

        {pastEvents.length === 0 ? (
          <div className="empty-history-box">
            <History size={36} className="text-slate-600 mb-2" />
            <p>No hay acciones previas registradas en esta sesión.</p>
          </div>
        ) : (
          <>
            <label className="history-search-field">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Buscar en el historial</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por acción, modo o escena..."
              />
            </label>
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} scope="col">
                          {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getAllCells().map((cell) => (
                        <td key={cell.id}><table.FlexRender cell={cell} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEvents.length === 0 && <p className="history-table-empty">No encontramos acciones con esa búsqueda.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
