// SessionStart hook: reading 中の論文と「次の15分チャンク」を表示する
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'papers');
const papers = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
  const m = readFileSync(join(dir, f), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  return { slug: f.replace(/\.md$/, ''), ...(m ? load(m[1]) : {}) };
});

const lines = [];
const today = new Date().toISOString().slice(0, 10);
const doneToday = papers.flatMap((p) => p.chunks ?? []).filter((c) => c.done && String(c.date ?? '').startsWith(today)).length;
for (const p of papers.filter((p) => p.status === 'reading')) {
  const chunks = p.chunks ?? [];
  const next = chunks.find((c) => !c.done);
  const done = chunks.filter((c) => c.done).length;
  lines.push(`📖 ${p.title} [${done}/${chunks.length}]`);
  lines.push(next ? `   ▶ 次の15分: ${next.name}` : '   🎉 全チャンク完了 → status を done にするとフィールド解放');
}
if (!lines.length) lines.push('reading 中の論文なし。papers/ から1本選んで status: reading に。');
lines.push(`今日完了したチャンク: ${doneToday}`);
console.log(lines.join('\n'));
