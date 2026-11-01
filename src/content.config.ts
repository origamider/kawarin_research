import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const step = z.object({
  name: z.string(),
  done: z.boolean().default(false),
  date: z.coerce.date().optional(),
  note: z.string().optional(),
});

const papers = defineCollection({
  loader: glob({ pattern: '*.md', base: './papers' }),
  schema: z.object({
    title: z.string(),
    arxiv: z.string().optional(),
    impl: z.string().url().optional(), // 自分の実装へのリンク
    authors: z.array(z.string()).default([]),
    year: z.number().optional(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['want', 'reading', 'done', 'dropped']).default('want'),
    priority: z.number().min(1).max(3).default(2),
    steps: z.array(step).default([]),
    related: z.array(z.string()).default([]),
    finished: z.coerce.date().optional(), // 読了日
    // Read → Write → Teach（wrap skill がセッション終了時に更新する）
    read: z.string().optional(), // 何を学んだか一言
    write: z.array(z.string()).default([]), // 疑問・仮説・世界モデルへの接続
    teach: z.string().optional(), // 人に説明する3行
    updated: z.coerce.date().optional(), // 考察を最後に書いた日（notes の並び順）
    draft: z.boolean().default(false),
  }),
});

const experiments = defineCollection({
  loader: glob({ pattern: '*.md', base: './experiments' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    paper: z.string().optional(),
    tags: z.array(z.string()).default([]),
    result: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// 論文以外で注目しているもの（プロジェクト・ブログ・リポジトリ）
const watch = defineCollection({
  loader: glob({ pattern: '*.md', base: './watch' }),
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    field: z.string().optional(), // 分野（例: Physical AI）
    added: z.coerce.date(),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const explainers = defineCollection({
  loader: glob({ pattern: '*/explainer-*.md', base: './papers' }),
  schema: z.object({
    title: z.string(),
    paper: z.string(),
    date: z.coerce.date().optional(), // 書いた日（成果ログに出る）
  }),
});

const tryIdeas = defineCollection({
  loader: glob({ pattern: '*.md', base: './try' }),
  schema: z.object({
    title: z.string(),
    added: z.coerce.date(),
    status: z.enum(['idea', 'doing', 'done', 'dropped']).default('idea'),
    why: z.string().optional(), // やりたい理由を一言
    started: z.coerce.date().optional(), // 着手した日（成果ログに出る）
    finished: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { papers, experiments, watch, explainers, try: tryIdeas };
