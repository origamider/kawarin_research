// 小さな MLP 方策。パラメータは平らな Float32Array（進化戦略でそのまま摂動できる）。
import { OBS, ACT } from './sim';

export const HIDDEN = 16;
export const N_PARAMS = OBS * HIDDEN + HIDDEN + HIDDEN * ACT + ACT;

const h = new Float32Array(HIDDEN);

export function act(p: Float32Array, o: number[]): [number, number] {
  let k = 0;
  for (let j = 0; j < HIDDEN; j++) {
    let s = 0;
    for (let i = 0; i < OBS; i++) s += p[k++] * o[i];
    h[j] = s;
  }
  for (let j = 0; j < HIDDEN; j++) h[j] = Math.tanh(h[j] + p[k++]);
  const out = [0, 0];
  for (let a = 0; a < ACT; a++) {
    let s = 0;
    for (let j = 0; j < HIDDEN; j++) s += p[k++] * h[j];
    out[a] = s;
  }
  for (let a = 0; a < ACT; a++) out[a] = Math.tanh(out[a] + p[k++]);
  return out as [number, number];
}
