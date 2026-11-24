import { z } from 'zod';
import type { KnowledgeService } from '../../knowledge/knowledge.service';
import { defineTool } from './tool.types';

export const searchPoliciesTool = (knowledge: KnowledgeService) =>
  defineTool({
    name: 'search_policies',
    description:
      'Search the Shoplens store policy documents (shipping, returns and refunds, payments, warranty, account help). Use for any policy or how-to question. Returns the most relevant passages with their source.',
    statusLabel: 'Searching our policies…',
    schema: z.object({ query: z.string().trim().min(1).max(300) }),
    async run({ query }, ctx) {
      const hits = await knowledge.search(query);
      if (hits.length === 0) {
        return { results: [], note: 'No relevant policy text found. Say you do not know and offer a support ticket.' };
      }
      ctx.addSources(hits.map((h) => ({ source: h.source, section: h.section })));
      return { results: hits.map((h) => ({ source: h.source, section: h.section, text: h.text })) };
    },
  });
