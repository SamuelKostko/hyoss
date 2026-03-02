import { promises as fs } from 'fs';
import path from 'path';
import type { Artwork } from '@/lib/art-data';
import { list, put } from '@vercel/blob';

const CATALOG_DIRNAME = 'data';
const CATALOG_FILENAME = 'catalog.json';
const CATALOG_BLOB_PATH = `${CATALOG_DIRNAME}/${CATALOG_FILENAME}`;

function shouldUseBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function getCatalogPath(): string {
  return path.join(process.cwd(), CATALOG_DIRNAME, CATALOG_FILENAME);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureCatalogFile(): Promise<void> {
  const catalogPath = getCatalogPath();
  const exists = await fileExists(catalogPath);
  if (exists) return;

  await fs.mkdir(path.dirname(catalogPath), { recursive: true });
  await fs.writeFile(catalogPath, JSON.stringify([], null, 2), 'utf8');
}

async function ensureCatalogBlob(): Promise<string> {
  const existing = await list({ prefix: CATALOG_BLOB_PATH });
  const exact = existing.blobs.find((b) => b.pathname === CATALOG_BLOB_PATH);
  if (exact?.url) return exact.url;

  const created = await put(CATALOG_BLOB_PATH, JSON.stringify([], null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
  return created.url;
}

async function readCatalogFromBlob(): Promise<Artwork[]> {
  const url = await ensureCatalogBlob();
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return [];
  try {
    const parsed = (await response.json()) as unknown;
    return Array.isArray(parsed) ? (parsed as Artwork[]) : [];
  } catch {
    return [];
  }
}

async function writeCatalogToBlob(artworks: Artwork[]): Promise<void> {
  await put(CATALOG_BLOB_PATH, JSON.stringify(artworks, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export async function readCatalog(): Promise<Artwork[]> {
  if (shouldUseBlobStorage()) {
    return readCatalogFromBlob();
  }

  const catalogPath = getCatalogPath();
  await ensureCatalogFile();

  const raw = await fs.readFile(catalogPath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Artwork[];
  } catch {
    return [];
  }
}

export async function writeCatalog(artworks: Artwork[]): Promise<void> {
  if (shouldUseBlobStorage()) {
    await writeCatalogToBlob(artworks);
    return;
  }

  const catalogPath = getCatalogPath();
  await fs.mkdir(path.dirname(catalogPath), { recursive: true });

  const tmpPath = `${catalogPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(artworks, null, 2), 'utf8');
  await fs.rename(tmpPath, catalogPath);
}

export function generateNextArtworkId(existing: Artwork[]): string {
  const numericIds = existing
    .map((a) => Number.parseInt(a.id, 10))
    .filter((n) => Number.isFinite(n));

  const next = (numericIds.length ? Math.max(...numericIds) : 0) + 1;
  return String(next).padStart(3, '0');
}
