import { inflateSync } from 'zlib';
import { decode } from '@cwasm/webp';

// 读取仓库 PNG/WebP 的真实 RGBA，避免透明命中替身悄悄丢 alpha。
const pixelCache = new Map();
export function imagePixels(png) {
  const key = png.toString('base64');
  if (pixelCache.has(key)) return pixelCache.get(key);
  if (png.toString('ascii', 0, 4) === 'RIFF' && png.toString('ascii', 8, 12) === 'WEBP') {
    const result = decode(png);
    pixelCache.set(key, result);
    return result;
  }
  if (png[24] !== 8 || png[25] !== 6 || png[28] !== 0) throw new Error('测试图片需要无隔行的 RGBA8 PNG');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20), chunks = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, data = new Uint8ClampedArray(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, a = x >= 4 ? data[i - 4] : 0, b = y ? data[i - stride] : 0;
      const c = y && x >= 4 ? data[i - stride - 4] : 0, p = a + b - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      data[i] = (raw[y * (stride + 1) + x + 1] + [0, a, b, Math.floor((a + b) / 2), paeth][filter]) & 255;
    }
  }
  const result = { data, width, height };
  pixelCache.set(key, result);
  return result;
}
