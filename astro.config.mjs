import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// GitHub Pages: ユーザーサイト(origamider.github.io)なら BASE は "/"、
// プロジェクトサイトならリポジトリ名。独自ドメイン取得時は SITE を差し替える。
export default defineConfig({
  site: process.env.SITE ?? 'https://origamider.github.io',
  base: process.env.BASE ?? '/',
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
