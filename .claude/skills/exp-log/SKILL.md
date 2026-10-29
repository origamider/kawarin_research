---
name: exp-log
description: 実験ログを experiments/ に作る・追記する。「実験ログ残して」「この結果メモして」「実験した」と言われたとき、または論文の再現・RLキャラの改造を試したときに使う。
---

# 実験ログ

- ファイル: `experiments/YYYY-MM-DD-<slug>.md`（同じ実験の続きなら既存ファイルに `## YYYY-MM-DD 追記` で足す）
- frontmatter: `title, date, paper(任意: papers の slug), tags, result(一行の結論)`
- 本文の見出し: `## 目的` `## 設定` `## 結果` `## 次にやりたい`
- 数値・ハイパラ・コマンドは実際に使ったものだけを書く。結果が出ていなければ `result` は空のまま
- 公開したくない内容は `draft: true`
