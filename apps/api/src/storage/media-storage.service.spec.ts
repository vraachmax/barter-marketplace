import { createHash } from 'node:crypto';
import { del, put } from '@vercel/blob';
import {
  assertListingImage,
  getMediaType,
  MediaStorageService,
  resolveMediaStorageDriver,
} from './media-storage.service';

jest.mock('@vercel/blob', () => ({ put: jest.fn(), del: jest.fn() }));

const putMock = jest.mocked(put);
const delMock = jest.mocked(del);

function file(mimetype: string, body = 'image-data'): Express.Multer.File {
  return {
    buffer: Buffer.from(body),
    mimetype,
    originalname: 'unsafe-name.exe',
  } as Express.Multer.File;
}

describe('media storage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    delete process.env.MEDIA_STORAGE_DRIVER;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses local storage without a Blob token', () => {
    expect(resolveMediaStorageDriver(process.env)).toBe('local');
  });

  it('automatically enables Vercel Blob when its token is present', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    expect(resolveMediaStorageDriver(process.env)).toBe('vercel-blob');
  });

  it('fails fast when Blob is explicitly enabled without a token', () => {
    process.env.MEDIA_STORAGE_DRIVER = 'vercel-blob';
    expect(() => resolveMediaStorageDriver(process.env)).toThrow(
      'BLOB_READ_WRITE_TOKEN is required',
    );
  });

  it('accepts only supported image and chat media MIME types', () => {
    expect(() => assertListingImage(file('image/jpeg'))).not.toThrow();
    expect(() => assertListingImage(file('application/pdf'))).toThrow(
      'unsupported_image_type',
    );
    expect(getMediaType(file('video/mp4'))).toBe('VIDEO');
    expect(getMediaType(file('image/webp'))).toBe('IMAGE');
  });

  it('uploads a public immutable object and returns its hash', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    putMock.mockResolvedValue({
      url: 'https://store.public.blob.vercel-storage.com/uploads/listings/one/photo.jpg',
      downloadUrl: '',
      pathname: 'uploads/listings/one/photo.jpg',
      contentType: 'image/jpeg',
      contentDisposition: 'inline',
      etag: 'etag',
    });
    const input = file('image/jpeg');
    const storage = new MediaStorageService();

    const result = await storage.upload('listings', 'listing-1', input);

    expect(result.url).toContain('.blob.vercel-storage.com/');
    expect(result.sha256).toBe(
      createHash('sha256').update(input.buffer).digest('hex'),
    );
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^uploads\/listings\/listing-1\/.+\.jpg$/),
      input.buffer,
      expect.objectContaining({
        access: 'public',
        addRandomSuffix: false,
        token: 'test-token',
      }),
    );
  });

  it('deletes only URLs belonging to Vercel Blob', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    const storage = new MediaStorageService();

    await storage.delete('https://store.public.blob.vercel-storage.com/photo.jpg');
    await storage.delete('https://example.com/photo.jpg');

    expect(delMock).toHaveBeenCalledTimes(1);
    expect(delMock).toHaveBeenCalledWith(
      'https://store.public.blob.vercel-storage.com/photo.jpg',
      { token: 'test-token' },
    );
  });
});
