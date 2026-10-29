// 連続空間のシミュレータ。フィールドはタイル格子（'#'壁 '.'床 '*'オーブ '^'トゲ '~'沼 'S'スタート）だが、
// エージェントは格子に縛られず 360° 向き・上限つきの速度で動く。描画には依存しない。
export type Field = { name: string; title: string; default?: boolean; hue?: number; map: string[] };

export const N_RAYS = 8;
export const OBS = N_RAYS * 2 + 2; // レイごとに [壁の近さ, オーブの近さ] + 速度 + バイアス
export const ACT = 2; // [旋回, スロットル]
const DT = 0.1, MAX_SPEED = 1.6, MAX_TURN = 3.5, MAX_RAY = 8, PICK_R = 0.5;
export const MAX_T = 500;

export class Sim {
  grid: string[][];
  w: number; h: number;
  sx = 1.5; sy = 1.5;
  orbs: { x: number; y: number }[] = [];
  got: boolean[] = [];
  x = 0; y = 0; heading = 0; speed = 0; t = 0; done = false; ret = 0;

  constructor(public field: Field) {
    this.grid = field.map.map((r) => [...r]);
    this.h = this.grid.length; this.w = this.grid[0].length;
    this.grid.forEach((row, y) => row.forEach((c, x) => {
      if (c === 'S') { this.sx = x + 0.5; this.sy = y + 0.5; }
      if (c === '*') this.orbs.push({ x: x + 0.5, y: y + 0.5 });
    }));
    this.reset();
  }

  reset(heading = 0) {
    this.x = this.sx; this.y = this.sy; this.heading = heading; this.speed = 0;
    this.t = 0; this.done = false; this.ret = 0;
    this.got = this.orbs.map(() => false);
  }

  cell(x: number, y: number) { return this.grid[Math.floor(y)]?.[Math.floor(x)] ?? '#'; }
  solid(x: number, y: number) { return this.cell(x, y) === '#'; }

  nearestOrb() {
    let m = 0;
    this.orbs.forEach((o, k) => { if (!this.got[k]) m = m ? Math.min(m, Math.hypot(o.x - this.x, o.y - this.y)) : Math.hypot(o.x - this.x, o.y - this.y); });
    return m;
  }

  rayAngle(i: number) { return this.heading + (i / N_RAYS) * Math.PI * 2; }

  /** 壁までの距離（0..MAX_RAY） */
  ray(angle: number) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    for (let d = 0.1; d < MAX_RAY; d += 0.1) if (this.solid(this.x + dx * d, this.y + dy * d)) return d;
    return MAX_RAY;
  }

  obs(out: number[] = []) {
    out.length = 0;
    const sector = Math.PI / N_RAYS;
    const orbNear = new Array(N_RAYS).fill(0);
    this.orbs.forEach((o, k) => {
      if (this.got[k]) return;
      const dx = o.x - this.x, dy = o.y - this.y, dist = Math.hypot(dx, dy);
      let rel = Math.atan2(dy, dx) - this.heading;
      rel = ((rel % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const i = Math.round(rel / (2 * sector)) % N_RAYS;
      orbNear[i] = Math.max(orbNear[i], Math.max(0, 1 - dist / (MAX_RAY * 1.5)));
    });
    for (let i = 0; i < N_RAYS; i++) out.push(1 - this.ray(this.rayAngle(i)) / MAX_RAY, orbNear[i]);
    out.push(this.speed / MAX_SPEED, 1);
    return out;
  }

  step(turn: number, throttle: number) {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    this.heading += clamp(turn) * MAX_TURN * DT;
    this.speed = ((clamp(throttle) + 1) / 2) * MAX_SPEED * (this.cell(this.x, this.y) === '~' ? 0.4 : 1);
    const nx = this.x + Math.cos(this.heading) * this.speed * DT;
    const ny = this.y + Math.sin(this.heading) * this.speed * DT;
    const before = this.nearestOrb();
    let r = -0.004, bumped = false;
    if (!this.solid(nx, this.y)) this.x = nx; else bumped = true;
    if (!this.solid(this.x, ny)) this.y = ny; else bumped = true;
    if (bumped) r -= 0.01;
    if (this.cell(this.x, this.y) === '^') r -= 0.05;
    r += 0.15 * (before - this.nearestOrb()); // 近づいたら少し褒める（報酬整形）
    this.orbs.forEach((o, k) => {
      if (!this.got[k] && Math.hypot(o.x - this.x, o.y - this.y) < PICK_R) { this.got[k] = true; r += 1; }
    });
    this.t++;
    this.ret += r;
    if (this.got.every(Boolean)) { r += (MAX_T - this.t) / MAX_T; this.ret += (MAX_T - this.t) / MAX_T; this.done = true; } // 早く全部取るほどボーナス
    if (this.t >= MAX_T) this.done = true;
    return r;
  }
}
