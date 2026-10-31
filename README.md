# kawarin research

世界モデル中心の ML 論文読み進捗ダッシュボード → https://origamider.github.io/kawarin_research/

## 使い方（Claude Code のチャットで言うだけ）

| やりたいこと | 言い方の例 |
|---|---|
| 論文を追加 | 「DreamerV3 読みたい」「(arXiv URL) 追加して」 |
| 読み始める | 「PlaNet の分け方を相談したい」→ 案から選ぶ |
| 進捗を付ける | 「PlaNet の 3 章まで読んだ」「ステップ終わった」 |
| 詰まった | 「RSSM の deterministic path がわからん」→ 解説書を作る |
| 考察を残す | 思ったことをそのまま話す → `## 考察` にブログ調で残る |
| 実験を残す | 「実験ログ残して」 |
| 終わる | 「今日はここまで」→ 進捗・Read/Write/Teach・次の一手を更新して commit / push |

- セッションを開くと、次の一歩が表示される（SessionStart hook）
- 論文 PDF は `pdfs/<slug>.pdf` に置けば Claude が参照する（公開されない）
- 論文を読了（`status: done`）すると、トップ下の「ひと休み」の世界に木が増える

## 開発
```
npm install
npm run dev
```
