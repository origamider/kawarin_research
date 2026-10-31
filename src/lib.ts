import { getCollection, type CollectionEntry } from 'astro:content';

export type Experiment = CollectionEntry<'experiments'>;

export type Paper = CollectionEntry<'papers'>;

export async function getPapers() {
  return (await getCollection('papers')).filter((p) => !p.data.draft);
}

export function progress(p: Paper) {
  const total = p.data.steps.length;
  const done = p.data.steps.filter((c) => c.done).length;
  return { done, total, ratio: total ? done / total : 0 };
}


export const url = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

/** 考察を書いた論文（updated の新しい順）と本文冒頭の抜粋 */
export function notes(papers: Paper[]) {
  return papers
    .filter((p) => p.data.updated && p.body?.includes('## 考察'))
    .sort((a, b) => +b.data.updated! - +a.data.updated!)
    .map((p) => {
      const sec = p.body!.split('## 考察')[1].split(/\n## /)[0];
      const text = sec.split('\n').filter((l) => l.trim() && !l.startsWith('#')).join(' ');
      return { paper: p, excerpt: text.length > 120 ? text.slice(0, 120) + '…' : text };
    });
}

export async function getExperiments() {
  return (await getCollection('experiments')).filter((e) => !e.data.draft);
}

export type Activity = { date: Date; kind: '読了' | '考察' | '実験' | 'ステップ'; title: string; href: string };

/** 成果のタイムライン（新しい順）。読了・考察・実験・ステップ完了を1本にまとめる */
export function activities(papers: Paper[], exps: Experiment[]): Activity[] {
  const out: Activity[] = [];
  for (const p of papers) {
    const href = url(`/papers/${p.id}/`);
    if (p.data.status === 'done' && p.data.finished) out.push({ date: p.data.finished, kind: '読了', title: p.data.title, href });
    if (p.data.updated && p.body?.includes('## 考察')) out.push({ date: p.data.updated, kind: '考察', title: p.data.title, href: href + '#考察' });
    for (const s of p.data.steps) if (s.done && s.date) out.push({ date: s.date, kind: 'ステップ', title: `${p.data.title} — ${s.name}`, href });
  }
  for (const e of exps) out.push({ date: e.data.date, kind: '実験', title: e.data.title, href: url(`/experiments/${e.id}/`) });
  return out.sort((a, b) => +b.date - +a.date);
}
