import { Sim, type Field } from './sim';
import { ES, type ESState } from './es';
import { act } from './policy';
import { FieldScene, codeRain } from './scene';

const KEY = 'kawarin-rl-v2';

function loadSaved(): Record<string, ESState> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
function save(s: Record<string, ESState>) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 容量超過・プライベートモードは無視 */ }
}

function sparkline(c: HTMLCanvasElement, values: number[]) {
  const ctx = c.getContext('2d')!, { width: w, height: h } = c;
  ctx.clearRect(0, 0, w, h);
  if (values.length < 2) return;
  const lo = Math.min(...values), hi = Math.max(...values, lo + 1e-6);
  ctx.strokeStyle = '#7fd8a0'; ctx.lineWidth = 2; ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * w, y = h - ((v - lo) / (hi - lo)) * (h - 4) - 2;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
}

export function mount(root: HTMLElement) {
  const fields: Field[] = JSON.parse(root.dataset.fields!);
  const stage = root.querySelector<HTMLElement>('.stage')!;
  const hud = root.querySelector<HTMLElement>('.hud-text')!;
  const spark = root.querySelector<HTMLCanvasElement>('canvas.spark')!;
  const budgetSel = root.querySelector<HTMLSelectElement>('select.budget')!;
  const rain = codeRain(root.querySelector<HTMLCanvasElement>('canvas.rain')!);
  const view = new FieldScene(stage);
  const saved = loadSaved();

  let es: ES, show: Sim;
  const o: number[] = [];

  function persist() { saved[show.field.name] = es.toJSON(); save(saved); }

  function select(name: string) {
    if (es) persist();
    const f = fields.find((f) => f.name === name)!;
    es = new ES(f, saved[name]);
    show = new Sim(f);
    show.reset(Math.random() * Math.PI * 2);
    view.setField(show);
    root.querySelectorAll<HTMLButtonElement>('button[data-field]').forEach((b) => b.classList.toggle('on', b.dataset.field === name));
  }

  let lastHud = 0;
  function loop(now: number) {
    // 学習（裏で候補を評価）と、現在の方策による実演を同時に回す
    if (es.work(Number(budgetSel.value)) && es.gen % 10 === 0) persist();
    if (show.done) show.reset(Math.random() * Math.PI * 2);
    const [t, th] = act(es.theta, show.obs(o));
    show.step(t, th);
    rain();
    view.render(now);
    if (now - lastHud > 300) {
      lastHud = now;
      const got = show.got.filter(Boolean).length;
      hud.textContent = `gen ${es.gen} · 平均報酬 ${(es.history.at(-1) ?? 0).toFixed(2)} · best ${Number.isFinite(es.best) ? es.best.toFixed(2) : '-'} · 実演中 ${got}/${show.orbs.length}`;
      sparkline(spark, es.history);
    }
    requestAnimationFrame(loop);
  }

  root.querySelectorAll<HTMLButtonElement>('button[data-field]').forEach((b) => b.addEventListener('click', () => select(b.dataset.field!)));
  root.querySelector('button.reset')!.addEventListener('click', () => {
    const n = show.field.name;
    delete saved[n]; save(saved);
    es = new ES(show.field);
  });
  addEventListener('pagehide', () => persist());
  select(fields[0].name);
  requestAnimationFrame(loop);
}
