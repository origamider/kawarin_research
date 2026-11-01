---
title: "Learning Latent Dynamics for Planning from Pixels (PlaNet)"
arxiv: "1811.04551"
authors: ["Danijar Hafner", "et al."]
year: 2018
tags: [world-model, rssm, planning, cem]
status: reading
priority: 1
related: [world-models, dreamer-v1]
write:
  - "encoder を q(s_t | h_t, o_t) ではなく q(s_t | h_t) の掛け算にしてはダメなのか？ → o_t を外すと事前分布 p(s_t | h_t) と同じものになり、本物の画像がモデルに入る経路がなくなる"
---

## メモ
- World Models（実装済み）との対応: V+M → RSSM（1つのモデルで同時に学習）、C+CMA-ES → 方策なしで CEM による MPC

## Insights

- p（遷移モデル・事前分布）と q（encoder・近似事後分布）の違いは o_t を入力に持つかどうかだけ。KL(q‖p) で「見る前の予測」を「見た後の推定」に寄せることで遷移モデルが鍛えられる
