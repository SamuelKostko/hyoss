import { NextResponse } from 'next/server';
import { readCatalog, writeCatalog } from '@/lib/catalog-storage';
import { isAdminSession } from '@/lib/admin-auth';
import type { Artwork } from '@/lib/art-data';

type RouteParams = { params: Promise<{ id: string }> };

function mergeArtwork(existing: Artwork, patch: Partial<Artwork>): Artwork {
  return {
    ...existing,
    ...patch,
    id: existing.id,
    dimensions: {
      ...existing.dimensions,
      ...(patch.dimensions ?? {}),
    },
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const artworks = await readCatalog();
    const artwork = artworks.find((a) => a.id === id);
    if (!artwork) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(artwork);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const artworks = await readCatalog();
    const index = artworks.findIndex((a) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let patch: Partial<Artwork>;
    try {
      patch = (await request.json()) as Partial<Artwork>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updatedArtwork = mergeArtwork(artworks[index], patch);
    const updated = [...artworks];
    updated[index] = updatedArtwork;

    await writeCatalog(updated);
    return NextResponse.json(updatedArtwork);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const artworks = await readCatalog();
    const updated = artworks.filter((a) => a.id !== id);
    if (updated.length === artworks.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await writeCatalog(updated);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
