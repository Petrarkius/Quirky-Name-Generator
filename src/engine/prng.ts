export const MAX_SEED_MODULUS = 2147483647; // 2^31 - 1
export const ROW_SEED_STRIDE = 10007;

/**
 * Computes the deterministic per-row seed using the specification formula:
 * RowSeed_i = (BaseSeed + i * 10007) mod (2^31 - 1)
 */
export function computeRowSeed(baseSeed: number, rowIndex: number): number {
  const safeBase = Math.abs(Math.trunc(Number.isFinite(baseSeed) ? baseSeed : 0));
  const raw = (safeBase + rowIndex * ROW_SEED_STRIDE) % MAX_SEED_MODULUS;
  return raw < 0 ? raw + MAX_SEED_MODULUS : raw;
}

/**
 * 32-bit bit-mixer (Murmur3 finalizer) to derive independent deterministic
 * sub-streams for each column from a single row seed.
 */
export function mixSeed(seed: number, salt: number): number {
  let h = (seed ^ salt) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Mulberry32 deterministic 32-bit PRNG.
 * Avoids Math.random() entirely for cross-browser seed reproducibility.
 */
export class SeededPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = 0;
    this.init(seed);
  }

  init(seed: number): void {
    this.state = seed >>> 0;
  }

  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array.');
    }
    const index = Math.floor(this.nextFloat() * items.length);
    return items[index];
  }
}

export function createRandomBaseSeed(): number {
  const array = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(array);
    return 10000 + (array[0] % 990000);
  }
  return 10000 + Math.floor(Date.now() % 990000);
}
