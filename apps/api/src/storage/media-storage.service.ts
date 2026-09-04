import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { del, put } from '@vercel/blob';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { getUploadsDirectory, getUploadsRoot } from './uploads-path';

export type MediaFolder = 'listings' | 'chat-media';
export type MediaStorageDriver = 'local' | 'vercel-blob';
export type StoredMedia = { url: string; sha256: string };

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
};

const IMAGE_MIME_TYPES = new Set(
  Object.keys(MIME_EXTENSIONS).filter((mime) => mime.startsWith('image/')),
);
const VIDEO_MIME_TYPES = new Set(
  Object.keys(MIME_EXTENSIONS).filter((mime) => mime.startsWith('video/')),
);

function normalizeMimeType(raw: string | undefined): string {
  return String(raw || '').split(';', 1)[0].trim().toLowerCase();
}

function safeSegment(raw: string): string {
  const value = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  if (!value) throw new BadRequestException('invalid_media_owner');
  return value;
}

export function getMediaType(file: Express.Multer.File): 'IMAGE' | 'VIDEO' {
  const mime = normalizeMimeType(file.mimetype);
  if (IMAGE_MIME_TYPES.has(mime)) return 'IMAGE';
  if (VIDEO_MIME_TYPES.has(mime)) return 'VIDEO';
  throw new BadRequestException('unsupported_media_type');
}

export function assertListingImage(file: Express.Multer.File): void {
  const mime = normalizeMimeType(file.mimetype);
  if (!IMAGE_MIME_TYPES.has(mime)) {
    throw new BadRequestException('unsupported_image_type');
  }
}

export function resolveMediaStorageDriver(
  env: NodeJS.ProcessEnv = process.env,
): MediaStorageDriver {
  const configured = env.MEDIA_STORAGE_DRIVER?.trim().toLowerCase();
  if (configured && configured !== 'local' && configured !== 'vercel-blob') {
    throw new Error(`Unsupported MEDIA_STORAGE_DRIVER: ${configured}`);
  }
  if (configured === 'vercel-blob') {
    if (!env.BLOB_READ_WRITE_TOKEN?.trim()) {
      throw new Error(
        'BLOB_READ_WRITE_TOKEN is required when MEDIA_STORAGE_DRIVER=vercel-blob',
      );
    }
    return 'vercel-blob';
  }
  if (configured === 'local') return 'local';
  return env.BLOB_READ_WRITE_TOKEN?.trim() ? 'vercel-blob' : 'local';
}

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly driver = resolveMediaStorageDriver();
  private readonly blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  constructor() {
    if (this.driver === 'local' && process.env.NODE_ENV === 'production') {
      this.logger.warn(
        'Media storage is local and ephemeral. Configure BLOB_READ_WRITE_TOKEN for persistent uploads.',
      );
    }
  }

  get status() {
    return {
      driver: this.driver,
      persistent: this.driver === 'vercel-blob',
    } as const;
  }

  async upload(
    folder: MediaFolder,
    ownerId: string,
    file: Express.Multer.File,
  ): Promise<StoredMedia> {
    if (!file.buffer?.length) throw new BadRequestException('file_required');
    const mime = normalizeMimeType(file.mimetype);
    const extension = MIME_EXTENSIONS[mime];
    if (!extension) throw new BadRequestException('unsupported_media_type');

    const safeOwnerId = safeSegment(ownerId);
    const filename = `${randomUUID()}${extension}`;
    const pathname = `uploads/${folder}/${safeOwnerId}/${filename}`;
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    if (this.driver === 'vercel-blob') {
      const blob = await put(pathname, file.buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: false,
        cacheControlMaxAge: 31_536_000,
        contentType: mime,
        token: this.blobToken,
      });
      return { url: blob.url, sha256 };
    }

    const directory = getUploadsDirectory(folder, safeOwnerId);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, filename), file.buffer, { flag: 'wx' });
    return { url: `/uploads/${folder}/${safeOwnerId}/${filename}`, sha256 };
  }

  async delete(url: string | null | undefined): Promise<void> {
    if (!url) return;
    if (url.startsWith('/uploads/')) {
      const root = resolve(getUploadsRoot());
      const target = resolve(root, url.slice('/uploads/'.length));
      if (!target.startsWith(`${root}${sep}`)) return;
      await unlink(target).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
      return;
    }

    if (this.driver !== 'vercel-blob' || !this.isVercelBlobUrl(url)) return;
    await del(url, { token: this.blobToken });
  }

  async deleteMany(urls: Array<string | null | undefined>): Promise<void> {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    const results = await Promise.allSettled(unique.map((url) => this.delete(url)));
    const failures = results.filter((result) => result.status === 'rejected').length;
    if (failures > 0) {
      this.logger.warn(`Failed to delete ${failures} stored media object(s)`);
    }
  }

  private isVercelBlobUrl(raw: string): boolean {
    try {
      const url = new URL(raw);
      return (
        url.protocol === 'https:' &&
        (url.hostname === 'blob.vercel-storage.com' ||
          url.hostname.endsWith('.blob.vercel-storage.com'))
      );
    } catch {
      return false;
    }
  }
}
