/**
 * Browser-native gzip via CompressionStream/DecompressionStream — no
 * dependency (e.g. pako) needed. Supported in Chrome/Edge, which the app
 * already requires exclusively for the File System Access API (see
 * src/adapters/excel/folderSource.ts and DataSourceSettings.tsx), so this
 * adds no new browser-support constraint.
 */
export function supportsNativeCompression(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

export async function gzipText(text: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  if (!supportsNativeCompression()) return bytes;
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  void writer.write(bytes).then(() => writer.close());
  const compressed = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(compressed);
}

export async function gunzipToText(bytes: Uint8Array): Promise<string> {
  if (!supportsNativeCompression()) return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  void writer.write(bytes as BufferSource).then(() => writer.close());
  const decompressed = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(decompressed);
}
