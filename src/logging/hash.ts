/** Synchronous, non-cryptographic hash for turning a stack trace into a short, stable, non-identifying id (never the stack text itself). */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Hashes the first call-site frame (falls back to the message line if there is no stack) — enough to group recurring errors by origin without ever storing the stack text itself. */
export function stackHash(error: Error): string {
  const lines = (error.stack ?? error.message ?? '').split('\n');
  const frame = lines[1] ?? lines[0] ?? '';
  return fnv1aHex(frame.trim());
}
