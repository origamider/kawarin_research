---
title: "World Models を CarRacing-v3 で再実装"
date: 2026-10-17
paper: world-models
tags: [world-model, vae, mdn-rnn, cma-es]
---

- 実装: [rl-algorithm-implementations/world-model](https://github.com/origamider/rl-algorithm-implementations/tree/main/world-model)
- 実験ログ（W&B）: [world-models-carracing / cvhfupcj](https://forge.coreweave.com/wandb/kawarin_origami-university-of-aizu/world-models-carracing/runs/cvhfupcj)

## 目的
論文の V（VAE）+ M（MDN-RNN）+ C（線形 Controller）を自分で組み、CarRacing で動かす。

## 設定
- データ: ランダム方策で 200 エピソード収集、64×64 にリサイズ
- V: latent 32, kl_min 16, batch 64, 50 epoch, lr 1e-4
- M: LSTM hidden 256, 混合ガウス 5, batch 32, 20 epoch, lr 1e-3
- C: a = W[z, h] + b（比較用に z のみ版も）, CMA-ES pop 32 × 4 コース, σ0 0.1, 200 世代
- 実験管理: W&B（project: world-models-carracing）

## 結果
W&B の run を参照（スコアはここに追記）

## 次にやりたい
- 夢の中（M のロールアウト）で C を学習する VizDoom 側の再現
