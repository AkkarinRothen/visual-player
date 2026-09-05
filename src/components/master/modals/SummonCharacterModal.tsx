import React, { useMemo, useState } from 'react';
import { X, ChevronRight, Search } from 'lucide-react';
import type { Character } from '../../../types';

interface SummonCharacterModalProps {
  isOpen: boolean;
  characters: Character[];
  onSummon: (char: Character) => void;
  onClose: () => void;
}

export const SummonCharacterModal: React.FC<SummonCharacterModalProps> = ({
  isOpen,
  characters,
  onSummon,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const filteredCharacters = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return characters;
    return characters.filter((character) =>
      `${character.name} ${character.roleOrTitle || ''}`.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [characters, query]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invocar Personaje a la Escena</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <label className="relative block mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o rol…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            autoFocus
          />
        </label>
        <div className="summon-roster">
          {filteredCharacters.map((ch) => (
            <div
              key={ch.id}
              className="roster-card"
              onClick={() => {
                onSummon(ch);
                onClose();
              }}
            >
              <img src={ch.defaultAvatarUrl} alt={ch.name} className="roster-avatar" />
              <div className="roster-meta">
                <strong>{ch.name}</strong>
                <span>{ch.roleOrTitle}</span>
              </div>
              <ChevronRight size={18} className="text-amber-400" />
            </div>
          ))}
          {filteredCharacters.length === 0 && (
            <div className="p-5 text-center text-sm text-slate-400">
              No hay personajes que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
