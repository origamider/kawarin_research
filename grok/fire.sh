#!/bin/zsh
# 指示文なしのオンデマンド用 Grok Bot を Webhook で起動し、request_id を出力する。
# money-lab と同じ bot・同じキーチェーンの値を使う。役割と保存先は本文に入れる。
# 結果は Drive の kawarin-inbox/<request_id>.md に届く。読み方は .claude/skills/ask-grok/SKILL.md。
# 使い方: grok/fire.sh "調べてほしいこと"
set -eu

question="$1"

url=$(security find-generic-password -a money-lab -s grok-webhook-url -w)
key=$(security find-generic-password -a money-lab -s grok-webhook-key -w)

id="kawarin-$(date +%Y%m%d-%H%M%S)-$RANDOM"
role="あなたは、ML論文（特に世界モデル）を英語原文で読んでいる日本の学生の調査員です。依頼主は飽きやすく、Claude Code（skill・hook・サブエージェント）で読書と実装の環境を自分向けに改善し続けたいと考えています。Xとwebの両方で調べ、実際に試した人の具体例（設定・スクリプト・手順の実物）を優先してください。URLは実際に開いて確認したものだけを書き、確認できなかった事実には「未確認」、推測には「仮説」と書いてください。宣伝・情報商材・数字や手順のない煽りは除きます。出力は日本語で、結論を先に書いてください。"
deliver="調べ終わったら、結果をMarkdownにして、Google Driveの kawarin-inbox フォルダに ${id}.md という名前でアップロードしてください。先頭に project: kawarin / request_id / question の frontmatter をつけること。チャットへの返信だけで終わらせないこと。途中で失敗した場合も、何ができなかったかを書いた同じ名前のファイルをアップロードしてください。"
body=$(python3 -c 'import json,sys; print(json.dumps({"project": "kawarin", "request_id": sys.argv[1], "question": sys.argv[2], "role": sys.argv[3], "deliver": sys.argv[4], "task": sys.argv[3] + "\n\n" + sys.argv[2] + "\n\n" + sys.argv[4]}, ensure_ascii=False))' "$id" "$question" "$role" "$deliver")

http_code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$url" \
  -H "Authorization: Bearer $key" -H "Content-Type: application/json" -d "$body")
if [[ "$http_code" != 2* ]]; then
  echo "起動に失敗しました（HTTP $http_code）" >&2
  exit 1
fi
echo "起動しました: request_id=$id"
