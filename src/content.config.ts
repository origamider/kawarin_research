import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const chunk = z.object({
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
    authors: z.array(z.string()).default([]),
    year: z.number().optional(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['want', 'reading', 'done', 'dropped']).default('want'),
    priority: z.number().min(1).max(3).default(2),
    chunks: z.array(chunk).default([]),
    related: z.array(z.string()).default([]),
    field: z.string().optional(),
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

export const collections = { papers, experiments };
