import { join } from 'node:path';

const uploadsRoot = join(__dirname, '..', '..', 'uploads');

export function getUploadsRoot(): string {
  return uploadsRoot;
}

export function getUploadsDirectory(name: 'listings' | 'chat-media'): string {
  return join(uploadsRoot, name);
}
