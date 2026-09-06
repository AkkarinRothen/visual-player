import React, { useMemo } from 'react';
import { Search, Package, Sparkles, Play } from 'lucide-react';
import { formatVideoDuration } from '../../../utils/videoOptimizer';
import type { AssetPickerLibraryTabProps } from './assetPickerTypes';

export const AssetPickerLibraryTab: React.FC<AssetPickerLibraryTabProps> = ({
  mode,
  storedAssets,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  selectedPackFilter,
  setSelectedPackFilter,
  visibleCount,
  setVisibleCount,
  onSelectFromLibrary,
  onOpenResourcePacksModal,
}) => {
  // Identificar colecciones y packs disponibles entre los recursos guardados
  const availablePacks = useMemo(() => {
    const map = new Map<string, string>();
    storedAssets.forEach((a) => {
      if (a.packId && a.packName) {
        map.set(a.packId, a.packName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [storedAssets]);

  // Filtrar assets de la biblioteca con búsqueda segura y coincidencia flexible (nombre, pack, tags)
  const filteredAssets = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return storedAssets.filter((a) => {
      const safeName = (a.name || '').toLowerCase();
      const safePack = (a.packName || '').toLowerCase();
      const matchesSearch =
        !q ||
        safeName.includes(q) ||
        safePack.includes(q) ||
        (Array.isArray(a.tags) && a.tags.some((t) => (t || '').toLowerCase().includes(q)));

      if (!matchesSearch) return false;
      if (filterType === 'image') return a.type === 'image' || !a.type;
      if (filterType === 'video') return a.type === 'video';
      if (selectedPackFilter !== 'all') {
        if (selectedPackFilter === 'none') return !a.packId;
        return a.packId === selectedPackFilter;
      }
      return true;
    });
  }, [storedAssets, searchQuery, filterType, selectedPackFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Buscador y Filtros */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Buscar en recursos guardados..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>
        {(mode === 'background' || mode === 'all') && (
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              style={{
                padding: '6px 10px',
                border: 'none',
                borderRadius: '6px',
                background: filterType === 'all' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                color: filterType === 'all' ? '#fbbf24' : '#94a3b8',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: filterType === 'all' ? 600 : 400,
              }}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('image')}
              style={{
                padding: '6px 10px',
                border: 'none',
                borderRadius: '6px',
                background: filterType === 'image' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                color: filterType === 'image' ? '#fbbf24' : '#94a3b8',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: filterType === 'image' ? 600 : 400,
              }}
            >
              Fotos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('video')}
              style={{
                padding: '6px 10px',
                border: 'none',
                borderRadius: '6px',
                background: filterType === 'video' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                color: filterType === 'video' ? '#fbbf24' : '#94a3b8',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: filterType === 'video' ? 600 : 400,
              }}
            >
              Videos
            </button>
          </div>
        )}
      </div>

      {/* Barra de Filtro por Colección/Pack + Botón de Gestor */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '200px' }}>
          <Package size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <select
            value={selectedPackFilter}
            onChange={(e) => setSelectedPackFilter(e.target.value)}
            aria-label="Filtrar por pack de recursos"
            style={{
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '8px',
              color: '#fbbf24',
              fontSize: '0.8rem',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              width: '100%',
              maxWidth: '280px',
            }}
          >
            <option value="all" style={{ background: '#0f172a', color: '#fff' }}>
              Todas las colecciones ({storedAssets.length})
            </option>
            {availablePacks.map((p) => {
              const count = storedAssets.filter((a) => a.packId === p.id).length;
              return (
                <option key={p.id} value={p.id} style={{ background: '#0f172a', color: '#fff' }}>
                  Pack: {p.name} ({count})
                </option>
              );
            })}
            <option value="none" style={{ background: '#0f172a', color: '#fff' }}>
              Sin pack / Subidos manualmente
            </option>
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenResourcePacksModal}
          style={{
            padding: '6px 12px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            color: '#fbbf24',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
          title="Instalar nuevos packs (.vppack) o desinstalar existentes"
        >
          <Package size={14} />
          <span>Packs de Recursos</span>
        </button>
      </div>

      {filteredAssets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <Sparkles size={32} className="text-amber-400" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>No hay imágenes guardadas aún.</p>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Sube una desde la pestaña "Desde Dispositivo" para empezar tu colección local.
          </span>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '12px',
              maxHeight: '380px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {filteredAssets.slice(0, visibleCount).map((asset) => (
              <div
                key={asset.id}
                onClick={() => onSelectFromLibrary(asset)}
                style={{
                  position: 'relative',
                  aspectRatio: mode === 'background' ? '16/9' : '1/1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: '#090d16',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
                title={asset.name}
              >
                <img
                  src={asset.thumbnailUrl || asset.dataUrl}
                  alt={asset.name}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: mode === 'background' ? 'cover' : 'contain',
                  }}
                />
                {asset.type === 'video' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      padding: '2px 5px',
                      background: 'rgba(0,0,0,0.75)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.65rem',
                      color: '#fbbf24',
                      fontWeight: 600,
                    }}
                  >
                    <Play size={8} fill="#fbbf24" />
                    <span>{formatVideoDuration(asset.durationSeconds || 0)}</span>
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                    padding: '4px 6px',
                    fontSize: '0.72rem',
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {asset.packName && (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.6rem',
                        padding: '0 4px',
                        borderRadius: '3px',
                        background: 'rgba(245, 158, 11, 0.3)',
                        color: '#fef08a',
                        marginRight: '4px',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                      }}
                      title={`Pack: ${asset.packName}`}
                    >
                      Pack
                    </span>
                  )}
                  {asset.name}
                </div>
              </div>
            ))}
          </div>

          {filteredAssets.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 24)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                cursor: 'pointer',
                margin: '8px auto 0',
                display: 'block',
              }}
            >
              Cargar más recursos ({filteredAssets.length - visibleCount} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
};
