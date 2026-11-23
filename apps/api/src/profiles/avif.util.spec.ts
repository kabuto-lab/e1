import { convertToAvif, toAvifStorageKey } from './avif.util';

const sharp = require('sharp') as typeof import('sharp').default;

describe('AVIF conversion with the installed native Sharp library', () => {
  it.each(['png', 'jpeg', 'webp'] as const)('converts %s to a readable AVIF without enlarging it', async (format) => {
    const input = await sharp({ create: { width: 24, height: 36, channels: 3, background: '#c8a46f' } })
      .toFormat(format).toBuffer();
    const output = await convertToAvif(input);
    expect(output.subarray(0, 32).includes(Buffer.from('avif'))).toBe(true);
    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBe(24);
    expect(metadata.height).toBe(36);
    await expect(sharp(output).raw().toBuffer()).resolves.toHaveLength(24 * 36 * 3);
  });

  it('honours the requested size while preserving aspect ratio', async () => {
    const input = await sharp({ create: { width: 48, height: 72, channels: 3, background: '#c8a46f' } })
      .png().toBuffer();
    const output = await convertToAvif(input, { maxWidth: 16, maxHeight: 24 });
    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBe(16);
    expect(metadata.height).toBe(24);
  });

  it('rejects invalid image data', async () => {
    await expect(convertToAvif(Buffer.from('invalid image data'))).rejects.toThrow();
  });

  it('keeps the object path when replacing the extension', () => {
    expect(toAvifStorageKey('uploads/model/photo.jpg')).toBe('uploads/model/photo.avif');
  });
});
