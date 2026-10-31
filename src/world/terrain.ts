// 地形生成。パラメータ（= 地形の「好み」）から浮島のボクセルを作る。描画には依存しない。
export type TerrainParams = {
  seed: number;
  scale: number;    // 起伏の細かさ（小さいほど大きな山）
  height: number;   // 最大の高さ
  water: number;    // 水面の高さ（0..1, 高さに対する割合）
  terrace: number;  // 段々の強さ（0 = なめらか, 1 = くっきり段々）
  ridge: number;    // 尾根っぽさ（0 = 丘, 1 = 鋭い稜線）
  warp: number;     // 海岸線のゆがみ（0 = 丸い島, 1 = 入り組んだ島）
  crystals: number; // 結晶の密度
  shards: number;   // 周りに浮かぶ欠片の量
};
export type ParamKey = Exclude<keyof TerrainParams, 'seed'>;

export const SIZE = 40;

export const RANGES: Record<ParamKey, [number, number]> = {
  scale: [0.04, 0.14], height: [3, 10], water: [0, 0.45], terrace: [0, 1], ridge: [0, 1],
  warp: [0, 1], crystals: [0, 0.02], shards: [0, 1],
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function randomParams(): TerrainParams {
  const r = Math.random;
  const p = { seed: (r() * 2 ** 31) | 0 } as TerrainParams;
  for (const [k, [lo, hi]] of Object.entries(RANGES)) (p as any)[k] = lo + r() * (hi - lo);
  return p;
}

/** 好きな地形の近くをサンプルする（好みの学習）。liked が多いほど探索幅を狭める */
export function sampleParams(liked: TerrainParams[]): TerrainParams {
  const valid = liked.filter((l) => 'warp' in l); // 旧形式の好みは使わない
  if (!valid.length || Math.random() < 0.2) return randomParams();
  const base = valid[(Math.random() * valid.length) | 0];
  const width = Math.max(0.06, 0.2 - valid.length * 0.01);
  const p = { ...base, seed: (Math.random() * 2 ** 31) | 0 };
  for (const [k, [lo, hi]] of Object.entries(RANGES)) {
    const v = (p as any)[k] + (Math.random() * 2 - 1) * (hi - lo) * width;
    (p as any)[k] = Math.min(hi, Math.max(lo, v));
  }
  return p;
}

function valueNoise(seed: number) {
  const r = rng(seed);
  const n = 256, perm = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5), val = Array.from({ length: n }, r);
  const at = (x: number, y: number) => val[perm[(perm[x & 255] + y) & 255]];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

export type Kind = 'ground' | 'peak' | 'rock' | 'water' | 'crystal' | 'shard';
export type Voxel = { x: number; y: number; z: number; kind: Kind };

export function generate(p: TerrainParams, extraCrystals = 0): { voxels: Voxel[] } {
  const noise = valueNoise(p.seed);
  const edge = valueNoise(p.seed + 7);
  const r = rng(p.seed + 1);
  const voxels: Voxel[] = [];
  const waterLevel = Math.round(p.water * p.height);
  const c = SIZE / 2;
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      // 海岸線: 角度ごとに半径をノイズでゆがめ、直方体ではなく不定形の島にする
      const dx = x - c, dz = z - c;
      const ang = Math.atan2(dz, dx);
      const wob = edge(Math.cos(ang) * 1.5 + 5, Math.sin(ang) * 1.5 + 5) * 2 - 1;
      const local = edge(x * 0.12, z * 0.12) * 2 - 1;
      const radius = c * (0.78 + wob * 0.25 * (0.4 + p.warp) + local * 0.12 * p.warp);
      const d = Math.hypot(dx, dz) / radius;
      if (d >= 1) continue;

      let v = 0, amp = 1, f = p.scale, tot = 0;
      for (let o = 0; o < 4; o++) { v += noise(x * f, z * f) * amp; tot += amp; amp *= 0.5; f *= 2; }
      v /= tot;
      v = v * (1 - p.ridge) + (1 - Math.abs(v * 2 - 1)) * p.ridge;
      v *= 1 - Math.max(0, d - 0.55) * 1.6; // 縁に向かって下がる
      let h = v * p.height;
      const t = Math.round(h);
      h = h + (t - h) * p.terrace;
      const hi = Math.max(0, Math.round(h));
      // 浮島の底: 中心ほど深く垂れ下がる（つらら状）
      const depth = Math.round((1 - d) ** 1.5 * (6 + noise(x * 0.3 + 50, z * 0.3) * 6));
      for (let y = -depth; y <= hi; y++)
        voxels.push({ x, y, z, kind: y < hi - 1 ? 'rock' : hi >= p.height * 0.7 ? 'peak' : 'ground' });
      if (d < 0.85) for (let y = hi + 1; y <= waterLevel; y++) voxels.push({ x, y, z, kind: 'water' });
      if (hi > waterLevel && d < 0.9 && r() < p.crystals + extraCrystals) {
        const th = 2 + ((r() * 4) | 0);
        for (let y = 1; y <= th; y++) voxels.push({ x, y: hi + y, z, kind: 'crystal' });
      }
    }
  }
  // 周りに浮かぶ欠片
  const n = Math.round(p.shards * 40);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, rad = c * (1.05 + r() * 0.6);
    const x = Math.round(c + Math.cos(a) * rad), z = Math.round(c + Math.sin(a) * rad), y = Math.round(-4 + r() * 16);
    const s = 1 + ((r() * 2) | 0);
    for (let k = 0; k < s * s; k++) voxels.push({ x: x + (k % s), y: y - ((k / s) | 0), z, kind: 'shard' });
  }
  return { voxels };
}
