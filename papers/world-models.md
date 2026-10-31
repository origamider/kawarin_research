---
title: "World Models"
arxiv: "1803.10122"
authors: ["David Ha", "Jürgen Schmidhuber"]
year: 2018
tags: [world-model, vae, rnn, cma-es]
status: done
finished: 2026-10-17
priority: 1
impl: "https://github.com/origamider/rl-algorithm-implementations/tree/main/world-model"
related: [planet, dreamer-v1]
updated: 2026-10-29
write:
  - "現在の状態から次の報酬が最大になる行動を取り続ければいい、という話ではないのでは？ 長期的にはこちらの方がいい、という選択肢もあるはず"
read: "V で画像を z に圧縮し、M が z の未来を予測、C は [z, h] だけ見る小さな線形方策で済む"
teach: |
  カメラ画像をそのまま扱うと重いので、VAE で 32 次元の z に圧縮する。
  MDN-RNN が「次の z」を確率的に予測し、その隠れ状態 h に未来の手がかりが入る。
  だから行動を決める C は [z, h] を見る線形層だけでよく、CMA-ES で直接最適化できる。
---

## 考察

### なぜ VAE が必要なのか
高次元の画像をそのまま使って次の状態を学習させることもできる。でもそれはとても時間がかかるし、計算量が半端ない。
そこで、低次元の潜在状態に圧縮して、「次の潜在状態」を予測する状態遷移確率をモデル化し、それを強化学習に使う。

### 世界モデルでどうやってゲームを学習するのか
仕組みはシンプルで、現在の状態があって、次の状態遷移確率がわかっていれば、それぞれの次の状態に対する報酬が simulator を通して求められる。
だから報酬が最大になる次の状態に対応する行動をすればいい。ただ、それを状態そのままでやるのは計算が大変なので VAE を使っている、というだけ。

### Controller と進化戦略
強化学習にはそもそも信用割り当て問題があり、報酬がどの行動に影響しているかを求めるのが難しい。
そこで今回はパラメータを小さくし、進化戦略を使って、パラメータを全探索のような要領でどんどん報酬が最大になるように最適化している。

### 疑問
やっぱり単純に「現在の状態から次の状態への報酬が最大になるような行動を取り続ければいい」という話じゃなくない？
長期的にはこちらの方がいい、みたいな選択肢もあるはず。

## メモ
- 実装: [rl-algorithm-implementations/world-model](https://github.com/origamider/rl-algorithm-implementations/tree/main/world-model)（CarRacing-v3, W&B で実験管理）

## Insights
