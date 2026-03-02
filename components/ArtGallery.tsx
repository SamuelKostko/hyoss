'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ArtCard from './ArtCard';
import FilterSidebar from './FilterSidebar';
import type { Artwork } from '@/lib/art-data';
import { upload } from '@vercel/blob/client';

type ArtworkDraft = Partial<Artwork> & {
  dimensions?: Partial<Artwork['dimensions']>;
};

function normalizeDraft(draft: ArtworkDraft): ArtworkDraft {
  const safeYear = Number.isFinite(Number(draft.year)) ? Number(draft.year) : new Date().getFullYear();
  const safePrice = Number.isFinite(Number(draft.price)) ? Number(draft.price) : 0;
  const safeWidth = Number.isFinite(Number(draft.dimensions?.width)) ? Number(draft.dimensions?.width) : 0;
  const safeHeight = Number.isFinite(Number(draft.dimensions?.height)) ? Number(draft.dimensions?.height) : 0;
  const safeUnit = (draft.dimensions?.unit ?? 'cm').toString();

  return {
    ...draft,
    title: (draft.title ?? '').toString(),
    artist: (draft.artist ?? '').toString(),
    category: (draft.category ?? '').toString(),
    currency: (draft.currency ?? 'USD').toString(),
    medium: (draft.medium ?? '').toString(),
    description: (draft.description ?? '').toString(),
    image: (draft.image ?? '').toString(),
    edition: (draft.edition ?? '').toString(),
    year: safeYear,
    price: safePrice,
    availability: (draft.availability as Artwork['availability']) ?? 'available',
    dimensions: {
      width: safeWidth,
      height: safeHeight,
      unit: safeUnit,
    },
  };
}

export default function ArtGallery() {
  const [adminMode, setAdminMode] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ArtworkDraft>(() => ({
    title: '',
    artist: '',
    year: new Date().getFullYear(),
    price: 0,
    currency: 'USD',
    category: 'Pintura',
    availability: 'available',
    image: '',
    medium: '',
    description: '',
    edition: '',
    dimensions: { width: 0, height: 0, unit: 'cm' },
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const refreshCatalog = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/artworks', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as Artwork[];
      setArtworks(Array.isArray(data) ? data : []);
    } catch {
      setArtworks([]);
      setLoadError('No se pudo cargar el catálogo del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/admin/me', { cache: 'no-store' });
        const data = (await response.json()) as { isAdmin?: boolean };
        setAdminMode(Boolean(data?.isAdmin));
      } catch {
        setAdminMode(false);
      }
    })();

    refreshCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((artwork) => {
      const categoryMatch =
        selectedCategory === 'Todos' || artwork.category === selectedCategory;
      return categoryMatch;
    });
  }, [artworks, selectedCategory]);

  const resetDraft = () => {
    setEditingId(null);
    setDraft({
      title: '',
      artist: '',
      year: new Date().getFullYear(),
      price: 0,
      currency: 'USD',
      category: 'Pintura',
      availability: 'available',
      image: '',
      medium: '',
      description: '',
      edition: '',
      dimensions: { width: 0, height: 0, unit: 'cm' },
    });
  };

  const startEdit = (artwork: Artwork) => {
    setEditingId(artwork.id);
    setDraft({
      ...artwork,
      edition: artwork.edition ?? '',
    });
  };

  const saveDraft = async () => {
    const normalized = normalizeDraft(draft);
    const title = normalized.title?.trim();
    if (!title) return;

    setIsSaving(true);
    try {
      const isEdit = Boolean(editingId);
      const url = isEdit ? `/api/artworks/${editingId}` : '/api/artworks';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await refreshCatalog();
      resetDraft();
    } finally {
      setIsSaving(false);
    }
  };

  const uploadArtworkImage = async (file: File) => {
    setUploadError(null);
    setIsUploadingImage(true);
    try {
      const safeName = (file.name || 'image')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '_')
        .slice(0, 120);

      const pathname = `artworks/${crypto.randomUUID()}-${safeName}`;

      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/uploads',
      });

      if (blob?.url) {
        setDraft((d) => ({ ...d, image: blob.url }));
      } else {
        setUploadError('Respuesta inválida al subir la imagen.');
      }
    } catch {
      setUploadError('No se pudo subir la imagen.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const deleteArtwork = async (id: string) => {
    const ok = window.confirm('¿Eliminar esta obra del catálogo?');
    if (!ok) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/artworks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (editingId === id) resetDraft();
      await refreshCatalog();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {adminMode && (
          <div className="mb-8 p-6 bg-neutral-50 border border-neutral-200 rounded-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-2xl text-foreground">Administrar catálogo</h2>
                <p className="font-sans text-sm text-neutral-600">
                  Modo admin activo
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshCatalog}
                  className="px-4 py-2 rounded-sm bg-background border border-neutral-200 text-foreground font-sans text-sm hover:bg-neutral-100 transition-colors"
                  disabled={isLoading || isSaving}
                >
                  Recargar
                </button>
                <button
                  onClick={resetDraft}
                  className="px-4 py-2 rounded-sm bg-background border border-neutral-200 text-foreground font-sans text-sm hover:bg-neutral-100 transition-colors"
                  disabled={isSaving}
                >
                  Nuevo
                </button>
              </div>
            </div>

            {loadError && (
              <p className="font-sans text-sm text-neutral-600 mb-4">{loadError}</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={draft.title ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Título"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                  <input
                    value={draft.artist ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
                    placeholder="Artista"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                  <input
                    value={draft.category ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                    placeholder="Categoría"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                  <select
                    value={(draft.availability as string) ?? 'available'}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, availability: e.target.value as Artwork['availability'] }))
                    }
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  >
                    <option value="available">Disponible</option>
                    <option value="reserved">Reservado</option>
                    <option value="sold">Vendido</option>
                  </select>
                  <input
                    type="number"
                    value={Number(draft.price ?? 0)}
                    onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
                    placeholder="Precio"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                  <input
                    value={draft.currency ?? 'USD'}
                    onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                    placeholder="Moneda (USD)"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                  <input
                    value={draft.medium ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, medium: e.target.value }))}
                    placeholder="Técnica / Medium"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-sans text-sm text-neutral-600">Imagen de la obra</p>
                    {draft.image ? (
                      <p className="font-sans text-xs text-neutral-600 truncate">{draft.image}</p>
                    ) : (
                      <p className="font-sans text-xs text-neutral-600">Sin imagen</p>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadArtworkImage(file);
                    }}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                    disabled={isSaving || isUploadingImage}
                  />
                  {uploadError && (
                    <p className="font-sans text-xs text-neutral-600">{uploadError}</p>
                  )}
                  {isUploadingImage && (
                    <p className="font-sans text-xs text-neutral-600">Subiendo imagen…</p>
                  )}
                </div>

                <textarea
                  value={draft.description ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Descripción"
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                />

                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    value={Number(draft.dimensions?.width ?? 0)}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        dimensions: {
                          width: Number(e.target.value),
                          height: Number(d.dimensions?.height ?? 0),
                          unit: (d.dimensions?.unit ?? 'cm').toString(),
                        },
                      }))
                    }
                    placeholder="Ancho"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                  <input
                    type="number"
                    value={Number(draft.dimensions?.height ?? 0)}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        dimensions: {
                          width: Number(d.dimensions?.width ?? 0),
                          height: Number(e.target.value),
                          unit: (d.dimensions?.unit ?? 'cm').toString(),
                        },
                      }))
                    }
                    placeholder="Alto"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                  <input
                    value={draft.dimensions?.unit ?? 'cm'}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        dimensions: {
                          width: Number(d.dimensions?.width ?? 0),
                          height: Number(d.dimensions?.height ?? 0),
                          unit: e.target.value,
                        },
                      }))
                    }
                    placeholder="Unidad (cm)"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={draft.edition ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, edition: e.target.value }))}
                    placeholder="Edición (opcional)"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-background font-sans text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveDraft}
                      disabled={isSaving || isUploadingImage || !String(draft.title ?? '').trim()}
                      className="flex-1 px-4 py-2 rounded-sm bg-foreground text-background font-sans text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                      {editingId ? 'Guardar cambios' : 'Agregar obra'}
                    </button>
                    {editingId && (
                      <button
                        onClick={resetDraft}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-sm bg-background border border-neutral-200 text-foreground font-sans text-sm hover:bg-neutral-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-sm bg-background">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <p className="font-sans text-sm text-neutral-600">
                    Obras ({artworks.length})
                  </p>
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {artworks.map((artwork) => (
                    <div
                      key={artwork.id}
                      className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-foreground font-medium truncate">
                          {artwork.title}
                        </p>
                        <p className="font-sans text-xs text-neutral-600 truncate">
                          #{artwork.id} · ${artwork.price.toLocaleString()} {artwork.currency} · {artwork.availability}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEdit(artwork)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-sm bg-neutral-100 text-foreground font-sans text-xs hover:bg-neutral-200 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteArtwork(artwork.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-sm bg-neutral-100 text-foreground font-sans text-xs hover:bg-neutral-200 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center lg:text-left"
        >
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-foreground mb-4">
            Catálogo de Arte
          </h1>
          <p className="font-sans text-lg text-neutral-600 max-w-2xl mx-auto lg:mx-0">
            Descubre obras únicas. Cada pieza cuenta una
            historia y transforma espacios.
          </p>
        </motion.div>

        {/* Gallery with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <FilterSidebar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <div className="flex-1">
            {/* Results Count */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <p className="font-sans text-sm text-neutral-600">
                {filteredArtworks.length}{' '}
                {filteredArtworks.length === 1 ? 'obra encontrada' : 'obras encontradas'}
              </p>
            </motion.div>

            {/* Grid */}
            {filteredArtworks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                {filteredArtworks.map((artwork, index) => (
                  <ArtCard key={artwork.id} artwork={artwork} index={index} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🔍</span>
                </div>
                <h3 className="font-display text-2xl text-foreground mb-2">
                  No se encontraron obras
                </h3>
                <p className="font-sans text-neutral-600">
                  Intenta ajustar los filtros para ver más resultados
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
