import { NextResponse } from 'next/server';
import { generateNextArtworkId, readCatalog, writeCatalog } from '@/lib/catalog-storage';
import { isAdminSession } from '@/lib/admin-auth';
import type { Artwork } from '@/lib/art-data';

export async function GET() {
  try {
    const artworks = await readCatalog();
    return NextResponse.json(artworks);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const artworks = await readCatalog();

    let body: Partial<Artwork>;
    try {
      body = (await request.json()) as Partial<Artwork>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const title = String(body.title ?? '').trim();
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const nowYear = new Date().getFullYear();
    const newArtwork: Artwork = {
      id: generateNextArtworkId(artworks),
      title,
      artist: String(body.artist ?? '').trim() || 'Artista',
      year: Number.isFinite(Number(body.year)) ? Number(body.year) : nowYear,
      price: Number.isFinite(Number(body.price)) ? Number(body.price) : 0,
      currency: String(body.currency ?? 'USD').trim() || 'USD',
      dimensions: {
        width: Number.isFinite(Number(body.dimensions?.width)) ? Number(body.dimensions?.width) : 0,
        height: Number.isFinite(Number(body.dimensions?.height)) ? Number(body.dimensions?.height) : 0,
        unit: String(body.dimensions?.unit ?? 'cm').trim() || 'cm',
      },
      medium: String(body.medium ?? '').trim() || 'Técnica no especificada',
      description: String(body.description ?? '').trim() || 'Sin descripción.',
      image:
        String(body.image ?? '').trim() ||
        'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
      category: String(body.category ?? '').trim() || 'Pintura',
      availability: (body.availability as Artwork['availability']) || 'available',
      edition: body.edition ? String(body.edition) : undefined,
    };

    const updated = [newArtwork, ...artworks];
    await writeCatalog(updated);

    return NextResponse.json(newArtwork, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
