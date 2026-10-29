---
name: add-paper
description: 読みたい論文を papers/ に追加する。「〇〇読みたい」「この論文追加して」「arXiv URL を貼られた」とき、または論文を section 単位の15分チャンク（todo）に分けてと頼まれたときに使う。
---

# 論文を追加する / チャンクに分ける

## 追加
1. arXiv ID・タイトル・著者・年を確認する（URL が無ければ検索して原典の arXiv を特定。推測で埋めない）
2. slug は短い kebab-case（例: `dreamer-v3`）。既に `papers/<slug>.md` があれば追加せず知らせる
3. 以下の frontmatter で `papers/<slug>.md` を作る。本文は `## メモ` と `## Insights` の見出しだけ
   ```yaml
   title, arxiv, authors, year, tags, status: want, priority: 1-3,
   field: <読了で解放されるフィールド名>, related: [既存 slug]
   ```
4. `field` は論文の雰囲気に合う英語 kebab-case の名前。対応する `fields/<field>.json` を作る
   （16×11 程度、`#`壁 `.`床 `*`報酬(最大8個) `^`トゲ `~`沼 `S`スタート1つ、外周は壁、全報酬に到達可能であること）
5. 追加したらユーザーに一行で報告（タイトル・priority・解放されるフィールド名）

## チャンク分割（ユーザーに頼まれたら）
- `pdfs/<slug>.pdf` があればそれを読み、無ければ arXiv の HTML/abs を読む
- 1チャンク = 15分で終わる大きさ（section の一部、式1つ、図1枚）。名前は「何をつかめば完了か」が分かる日本語
- frontmatter の `chunks:` に `- { name: "..." }` で追記。status を `reading` に
- チャンクを完了したと言われたら `done: true, date: YYYY-MM-DD` と一言 `note` を付ける。全部終わったら status を `done` にするか聞く
