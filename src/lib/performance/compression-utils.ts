import { promisify } from 'util';
import zlib from 'zlib';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

export async function compress(
  data: string | Buffer,
  encoding: 'gzip' | 'br' = 'gzip'
): Promise<Buffer> {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  
  if (encoding === 'gzip') {
    return await gzip(buffer);
  } else {
    return await brotliCompress(buffer);
  }
}

export async function decompress(
  data: Buffer,
  encoding: 'gzip' | 'br' = 'gzip'
): Promise<string> {
  let decompressed: Buffer;
  
  if (encoding === 'gzip') {
    decompressed = await gunzip(data);
  } else {
    decompressed = await brotliDecompress(data);
  }
  
  return decompressed.toString('utf-8');
}

// Compression ratio analyzer
export async function analyzeCompression(data: string): Promise<{
  original: number;
  gzip: { size: number; ratio: number };
  brotli: { size: number; ratio: number };
  recommendation: 'none' | 'gzip' | 'br';
}> {
  const original = Buffer.byteLength(data, 'utf-8');
  
  const [gzipBuffer, brotliBuffer] = await Promise.all([
    compress(data, 'gzip'),
    compress(data, 'br')
  ]);
  
  const gzipSize = gzipBuffer.length;
  const brotliSize = brotliBuffer.length;
  
  const result = {
    original,
    gzip: {
      size: gzipSize,
      ratio: gzipSize / original
    },
    brotli: {
      size: brotliSize,
      ratio: brotliSize / original
    },
    recommendation: 'none' as 'none' | 'gzip' | 'br'
  };
  
  // Recommend compression if it saves more than 10%
  if (result.gzip.ratio < 0.9 || result.brotli.ratio < 0.9) {
    result.recommendation = result.brotli.size < result.gzip.size ? 'br' : 'gzip';
  }
  
  return result;
}