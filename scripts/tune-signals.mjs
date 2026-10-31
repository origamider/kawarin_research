// /tune の材料を集める: 前回の tune 以降のユーザー発言・利用の兆し・Grok の未処理レポート
// 使い方: node scripts/tune-signals.mjs        （tune を終えたら --mark で日付を記録）
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const markFile = join(root, 'ideas', '.last-tune');
if (process.argv.includes('--mark')) {
  writeFileSync(markFile, new Date().toISOString() + '\n');
  console.log('tune の日付を記録しました');
  process.exit(0);
}
const since = existsSync(markFile)
  ? new Date(readFileSync(markFile, 'utf8').trim())
  : new Date(Date.now() - 14 * 864e5);
const days = (d) => Math.floor((Date.now() - d) / 864e5);

// 1. 会話ログから本人の発言だけを拾う（ツール結果・システム文は除く）
const logDir = join(homedir(), '.claude', 'projects', root.replace(/[\/_.]/g, '-'));
const said = [];
for (const f of existsSync(logDir) ? readdirSync(logDir).filter((f) => f.endsWith('.jsonl')) : []) {
  if (statSync(join(logDir, f)).mtime < since) continue;
  const seen = new Set();
  for (const line of readFileSync(join(logDir, f), 'utf8').split('\n')) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type !== 'user' || e.isSidechain || typeof e.message?.content !== 'string') continue;
    const t = e.message.content.trim();
    if (!t || t.startsWith('<') || t.startsWith('This session is being continued') || seen.has(t) || new Date(e.timestamp) < since) continue;
    seen.add(t);
    said.push(`- (${e.timestamp.slice(0, 10)}) ${t.replace(/\s+/g, ' ').slice(0, 400)}`);
  }
}

// 2. 利用の兆し
const papers = readdirSync(join(root, 'papers')).filter((f) => f.endsWith('.md')).map((f) => {
  const m = readFileSync(join(root, 'papers', f), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  return { slug: f.replace(/\.md$/, ''), ...(m ? load(m[1]) : {}) };
});
const signals = [];
for (const p of papers.filter((p) => p.status === 'reading')) {
  const steps = p.steps ?? [];
  const last = steps.filter((s) => s.done && s.date).map((s) => new Date(s.date)).sort((a, b) => b - a)[0];
  if (!steps.length) signals.push(`- ${p.slug}: reading なのにステップ未設定`);
  else if (!last) signals.push(`- ${p.slug}: 完了ステップがまだない（${steps.length}個中0）`);
  else if (days(last) >= 3) signals.push(`- ${p.slug}: 最後にステップを終えてから ${days(last)} 日`);
}
const lastUpdate = papers.map((p) => p.updated && new Date(p.updated)).filter(Boolean).sort((a, b) => b - a)[0];
if (lastUpdate) signals.push(`- 最後に考察・RWTを更新してから ${days(lastUpdate)} 日`);

// 3. Grok の未処理レポート
const inbox = join(root, 'ideas', 'inbox');
const reports = existsSync(inbox) ? readdirSync(inbox).filter((f) => f.endsWith('.md')) : [];

console.log(`# tune の材料（${since.toISOString().slice(0, 10)} 以降、前回から ${days(since)} 日）\n`);
console.log(`## 本人の発言（${said.length}件）\n${said.join('\n') || '- なし'}\n`);
console.log(`## 利用の兆し\n${signals.join('\n') || '- 特になし'}\n`);
console.log(`## Grok の未処理レポート\n${reports.map((r) => `- ideas/inbox/${r}`).join('\n') || '- なし'}`);
