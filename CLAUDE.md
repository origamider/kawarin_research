# kawarin research

ML（特に世界モデル）の論文読み進捗ダッシュボード。Astro で静的生成し GitHub Pages に公開する。

## ユーザーについて
- ドーパミン駆動で飽きやすい。長文より「次の一手が1つ」だけ見える返答を好む
- 論文は英語原文で読み、詰まった箇所だけ解説を頼む

## ファイル規約
- `papers/<slug>.md` 論文1本。frontmatter のスキーマは `src/content.config.ts`
- `papers/<slug>/explainer-<topic>.md` 解説書（`ml-paper-tutor` skill を使って作る）。新しくわかった知見は論文本文の `## Insights` に1〜2行で追記
- `experiments/` 実験ログ（`exp-log` skill）
- `fields/<name>.json` RL フィールド。論文の `field` と一致する名前は読了で解放。`default: true` は最初から解放
- `pdfs/` 論文PDF（gitignore 済み・公開しない）
- `src/rl/` sim（連続空間・描画非依存）/ policy（MLP）/ es（進化戦略）/ scene（Three.js）を分離。方策は `act(params, obs)` の形を守れば差し替え可能

## 運用
- 論文追加・チャンク分割は `add-paper` skill
- チャンク（15分単位）を1つ終えたら `done: true, date, note` を付ける。返答では次のチャンクを1つだけ示す
- 公開サイトなので、非公開にしたいものは `draft: true`

## コマンド
- `npm run dev` / `npm run build` / `npm run next`（次のチャンク表示）
