---
name: add-paper
description: 読みたい論文を papers/ に追加する。「〇〇読みたい」「この論文追加して」「arXiv URL を貼られた」とき、または論文の読み方・ステップ（todo）の分け方を相談したいと言われたときに使う。
---

# 論文を追加する / ステップを相談して決める

## 追加
1. arXiv ID・タイトル・著者・年を確認する（URL が無ければ検索して原典の arXiv を特定。推測で埋めない）
2. slug は短い kebab-case（例: `dreamer-v3`）。既に `papers/<slug>.md` があれば追加せず知らせる
3. 以下の frontmatter で `papers/<slug>.md` を作る。本文は `## メモ` と `## Insights` の見出しだけ
   ```yaml
   title, arxiv, authors, year, tags, status: want, priority: 1-3,
   related: [既存 slug]
   ```
4. 追加したらユーザーに一行で報告（タイトル・priority）

## ステップ（todo）の分け方 — 勝手に分けない
ステップは時間単位ではなく「何がわかれば一区切りか」の単位。**必ずユーザーと相談して決める。**

1. `pdfs/<slug>.pdf` があればそれを、無ければ arXiv を読み、章立てを把握する
2. 分け方の案を 2〜3 個、各1行で出して選んでもらう。例:
   - 章ごと（2章 / 3章 / 4章 / 実験）
   - 問いごと（「World Models と何が違う？」「なぜ RSSM は決定論と確率の両方？」…）
   - 実装ごと（自分で書くならどの部品から？）
3. ユーザーが「もう読んだ」部分は done で入れる（日付は聞かずに空でよい）
4. 決まったら frontmatter の `steps:` に `- { name: "..." }` で書き、status を `reading` に
5. ステップを終えたと言われたら `done: true, date: YYYY-MM-DD` と一言 `note`。全部終わったら status を `done` にするか聞く
