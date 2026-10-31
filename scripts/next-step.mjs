// SessionStart hook: reading 中の論文と「次の一歩」を表示する
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
const doneToday = papers.flatMap((p) => p.steps ?? []).filter((c) => c.done && String(c.date ?? '').startsWith(today)).length;
for (const p of papers.filter((p) => p.status === 'reading')) {
  const steps = p.steps ?? [];
  if (!steps.length) { lines.push(`📖 ${p.title}`, '   ステップ未設定 → 「分け方を相談したい」と言う'); continue; }
  const next = steps.find((c) => !c.done);
  const done = steps.filter((c) => c.done).length;
  lines.push(`📖 ${p.title} [${done}/${steps.length}]`);
  lines.push(next ? `   ▶ 次の一歩: ${next.name}` : '   🎉 全ステップ完了');
}
if (!lines.length) lines.push('reading 中の論文なし。papers/ から1本選んで status: reading に。');
lines.push(`今日完了したステップ: ${doneToday}`);
console.log(lines.join('\n'));
