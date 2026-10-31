import { World, type Mood } from './scene';
import { RANGES, sampleParams, type ParamKey, type TerrainParams } from './terrain';

const KEY = 'kawarin-world-liked';
const MOOD_KEY = 'kawarin-world-mood';
const REGEN_MS = 60_000;

const LABELS: Record<ParamKey, string> = {
  scale: '起伏の細かさ', height: '高さ', water: '水位', terrace: '段々', ridge: '尾根',
  warp: '海岸のゆがみ', crystals: '結晶', shards: '浮かぶ欠片',
};

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 保存できなくても動く */ }
}

export function mount(root: HTMLElement) {
  const world = new World(root.querySelector<HTMLElement>('.stage')!);
  const clock = root.querySelector<HTMLElement>('.clock')!;
  const likeBtn = root.querySelector<HTMLButtonElement>('button.like')!;
  const lapseBtn = root.querySelector<HTMLButtonElement>('button.lapse')!;
  const panel = root.querySelector<HTMLElement>('.panel')!;
  const extraCrystals = Number(root.dataset.read ?? 0) * 0.004; // 読了本数ぶん結晶が増える
  let liked = load<TerrainParams[]>(KEY, []);
  let current: TerrainParams, lastGen = 0, count = 0;
  let lapse = false, lapseStart = 0, lapseBase = 0;

  // ノイズのスライダー
  const sliders = {} as Record<ParamKey, HTMLInputElement>;
  const terrainBox = panel.querySelector<HTMLElement>('.terrain')!;
  for (const [k, [lo, hi]] of Object.entries(RANGES) as [ParamKey, [number, number]][]) {
    const label = document.createElement('label');
    label.innerHTML = `<span>${LABELS[k]}</span>`;
    const input = Object.assign(document.createElement('input'), { type: 'range', min: String(lo), max: String(hi), step: String((hi - lo) / 100) });
    input.addEventListener('change', () => {
      current = { ...current, [k]: Number(input.value) };
      build();
    });
    label.appendChild(input);
    terrainBox.appendChild(label);
    sliders[k] = input;
  }

  // 太陽の気分
  const autoBox = panel.querySelector<HTMLInputElement>('input.auto')!;
  const brightIn = panel.querySelector<HTMLInputElement>('input.bright')!;
  const vividIn = panel.querySelector<HTMLInputElement>('input.vivid')!;
  const savedMood = load<Mood | null>(MOOD_KEY, null);
  if (savedMood) {
    world.mood = savedMood;
    brightIn.value = String(savedMood.bright);
    vividIn.value = String(savedMood.vivid);
  }
  autoBox.checked = !savedMood;
  const applyMood = () => {
    world.mood = autoBox.checked ? null : { bright: Number(brightIn.value), vivid: Number(vividIn.value) };
    brightIn.disabled = vividIn.disabled = autoBox.checked;
    save(MOOD_KEY, world.mood);
  };
  autoBox.addEventListener('change', applyMood);
  brightIn.addEventListener('input', applyMood);
  vividIn.addEventListener('input', applyMood);
  brightIn.disabled = vividIn.disabled = autoBox.checked;

  function build() {
    world.build(current, extraCrystals);
    lastGen = performance.now();
    for (const k of Object.keys(sliders) as ParamKey[]) sliders[k].value = String(current[k]);
    likeBtn.textContent = '♡ この地形が好き';
    likeBtn.disabled = false;
  }
  function regen() {
    current = sampleParams(liked);
    count++;
    build();
  }

  function dayFrac(now: number) {
    const d = new Date();
    const real = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
    return lapse ? (lapseBase + (now - lapseStart) / 120_000) % 1 : real; // タイムラプスは 2 分で 1 日
  }

  likeBtn.addEventListener('click', () => {
    liked = [...liked, current].slice(-30);
    save(KEY, liked);
    likeBtn.textContent = `♥ 覚えた（${liked.length}）`;
    likeBtn.disabled = true;
  });
  root.querySelector('button.next')!.addEventListener('click', regen);
  root.querySelector('button.tune')!.addEventListener('click', (e) => {
    panel.hidden = !panel.hidden;
    (e.currentTarget as HTMLElement).classList.toggle('on', !panel.hidden);
  });
  lapseBtn.addEventListener('click', () => {
    lapse = !lapse;
    lapseStart = performance.now();
    lapseBase = dayFrac(lapseStart);
    lapseBtn.classList.toggle('on', lapse);
  });

  function loop(now: number) {
    if (panel.hidden && now - lastGen > REGEN_MS) regen(); // 調整中は勝手に変えない
    const f = dayFrac(now);
    world.render(now, f);
    const mins = Math.floor(f * 1440);
    clock.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')} · 地形 #${count} · 好み ${liked.length}`;
    requestAnimationFrame(loop);
  }
  regen();
  requestAnimationFrame(loop);
}
