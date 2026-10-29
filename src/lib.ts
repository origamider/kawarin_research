import { getCollection, type CollectionEntry } from 'astro:content';

export type Paper = CollectionEntry<'papers'>;

export async function getPapers() {
  return (await getCollection('papers')).filter((p) => !p.data.draft);
}

export function progress(p: Paper) {
  const total = p.data.chunks.length;
  const done = p.data.chunks.filter((c) => c.done).length;
  return { done, total, ratio: total ? done / total : 0 };
}

/** 日付ごとのチャンク完了数（草用） */
export function chunkDays(papers: Paper[]) {
  const days: Record<string, number> = {};
  for (const p of papers)
    for (const c of p.data.chunks)
      if (c.done && c.date) {
        const k = c.date.toISOString().slice(0, 10);
        days[k] = (days[k] ?? 0) + 1;
      }
  return days;
}

/** 読了した論文に紐づくフィールド = アンロック済み */
export function unlockedFields(papers: Paper[]) {
  return papers.filter((p) => p.data.status === 'done' && p.data.field).map((p) => p.data.field!);
}

export const url = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
