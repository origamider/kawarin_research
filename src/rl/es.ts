// 進化戦略（OpenAI-ES 風、対称サンプリング＋ランク整形）。World Models の Controller 学習と同じ発想。
import { Sim, type Field } from './sim';
import { act, N_PARAMS } from './policy';

const POP = 24, SIGMA = 0.12, LR = 0.06;

function gauss() {
  const u = 1 - Math.random(), v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function rollout(sim: Sim, p: Float32Array, heading: number) {
  sim.reset(heading);
  const o: number[] = [];
  while (!sim.done) { const [t, th] = act(p, sim.obs(o)); sim.step(t, th); }
  return sim.ret;
}

export type ESState = { theta: number[]; gen: number; history: number[]; best: number };

export class ES {
  theta = new Float32Array(N_PARAMS).map(() => gauss() * 0.3);
  gen = 0; history: number[] = []; best = -Infinity;
  private sim: Sim;
  private noise: Float32Array[] = [];
  private scores: number[] = [];
  private heading = 0;
  private cand = new Float32Array(N_PARAMS);

  constructor(field: Field, saved?: ESState) {
    this.sim = new Sim(field);
    if (saved && saved.theta.length === N_PARAMS) {
      this.theta = Float32Array.from(saved.theta);
      this.gen = saved.gen; this.history = saved.history; this.best = saved.best ?? -Infinity;
    }
    this.newGeneration();
  }

  private newGeneration() {
    this.heading = Math.random() * Math.PI * 2;
    this.noise = Array.from({ length: POP / 2 }, () => new Float32Array(N_PARAMS).map(gauss));
    this.scores = [];
  }

  /** budgetMs だけ候補を評価する。世代が終わったら true */
  work(budgetMs: number) {
    const end = performance.now() + budgetMs;
    let finished = false;
    while (performance.now() < end) {
      const i = this.scores.length;
      const eps = this.noise[i >> 1], sign = i % 2 ? -1 : 1;
      for (let k = 0; k < N_PARAMS; k++) this.cand[k] = this.theta[k] + sign * SIGMA * eps[k];
      this.scores.push(rollout(this.sim, this.cand, this.heading));
      if (this.scores.length === POP) { this.update(); finished = true; }
    }
    return finished;
  }

  private update() {
    // ランクを [-0.5, 0.5] に整形してスケールに頑健にする
    const order = this.scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);
    const rank = new Array(POP);
    order.forEach(([, i], r) => (rank[i] = r / (POP - 1) - 0.5));
    for (let n = 0; n < POP / 2; n++) {
      const w = (rank[2 * n] - rank[2 * n + 1]) * LR / (POP * SIGMA);
      const eps = this.noise[n];
      for (let k = 0; k < N_PARAMS; k++) this.theta[k] += w * eps[k];
    }
    const mean = this.scores.reduce((a, b) => a + b, 0) / POP;
    this.best = Math.max(this.best, ...this.scores);
    this.history.push(mean); if (this.history.length > 300) this.history.shift();
    this.gen++;
    this.newGeneration();
  }

  toJSON(): ESState { return { theta: [...this.theta], gen: this.gen, history: this.history, best: this.best }; }
}
