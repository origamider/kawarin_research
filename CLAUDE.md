# kawarin research

ML（特に世界モデル）の論文読み進捗ダッシュボード。Astro で静的生成し GitHub Pages に公開する。

## ユーザーについて
- ドーパミン駆動で飽きやすい。長文より「次の一手が1つ」だけ見える返答を好む
- UI・見た目の提案は言葉だけで出さず、**完成図（実際の描画）つきで複数案**を見せて選んでもらう
- 論文は英語原文で読み、詰まった箇所だけ解説を頼む

## ユーザーの技術的な前提（説明はここに接続させる）
- 『ゼロから作るDeep Learning ❹（強化学習）❺（生成モデル）』を読了
- 実装済み（[rl-algorithm-implementations](https://github.com/origamider/rl-algorithm-implementations)）: MC / TD / Q学習 / SARSA / DP / DQN / Double DQN / DDPG、VAE、混合ガウス
- **World Models を CarRacing で再実装済み**（VAE + MDN-RNN + 線形C + CMA-ES、W&B で管理）。ただし本質理解は「まだ完全ではない」と本人談
- 新しい論文は「World Models のどこがどう変わったか」で説明すると入りやすい

## ファイル規約
- `papers/<slug>.md` 論文1本。frontmatter のスキーマは `src/content.config.ts`
- `papers/<slug>/explainer-<topic>.md` 解説書（`ml-paper-tutor` skill を使って作る）。新しくわかった知見は論文本文の `## Insights` に1〜2行で追記
- `experiments/` 実験ログ（`exp-log` skill）
- `watch/<slug>.md` 論文以外で注目しているもの（プロジェクト・ブログ等）。「気になる」「注目したい」と言われたらここに保存し、papers ページ下部に出る
- `pdfs/` 論文PDF（gitignore 済み・公開しない）
- `src/world/` トップの観賞用3D世界（地形生成・太陽・光）。地形の好みは ♥ ボタンで学習（ブラウザごと）

## 運用
- **セッションを終えるときは必ず `wrap` skill を実行する**（「今日はここまで」等の合図、または作業がひと区切りしたら提案する）。進捗・Read/Write/Teach・次の一手を更新し、確認のうえ commit / push する
- 論文ファイルの `read`（学んだこと一言）/ `write`（疑問・仮説の配列）/ `teach`（3行説明）はトップの3カラムに出る。teach と解説書は `explain-before-shorten` の流れで書く
- 論文追加とステップの決め方は `add-paper` skill。**ステップ（todo）は勝手に分けず、案を出してユーザーと相談して決める**
- 「成果を残したい」「記録して」と言われたら、書く前に**思い出しタイム**として要点を1〜2問だけ聞く。答えられなくても責めずに軽く解説し、本人の答え＋補足を論文本文の `## Insights` に残す（自動では書かない。細かい運用は本人の指示に合わせる）
- ステップを終えたら `done: true, date, note`。返答では次の一歩を1つだけ示す
- ユーザーの深い考察は論文本文の `## 考察` に、本人の言葉を活かしてブログ調で残す（主張を勝手に足さない）。notes ページに並ぶ
- 公開サイトなので、非公開にしたいものは `draft: true`

## コマンド
- `npm run dev` / `npm run build` / `npm run next`（次の一歩を表示）
