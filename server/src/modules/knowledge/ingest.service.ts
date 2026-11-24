import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../lib/logger';
import type { LlmClient } from '../ai/llm-client';
import { chunkMarkdown } from './chunker';
import type { KnowledgeStore } from './knowledge-store';

const EMBED_BATCH = 64;

export class IngestService {
  constructor(
    private readonly llm: LlmClient,
    private readonly store: KnowledgeStore,
    private readonly kbDir?: string,
  ) {}

  /** Ingests only when the store is empty (startup). */
  async ingestIfEmpty(): Promise<number> {
    if ((await this.store.count()) > 0) return 0;
    return this.ingest();
  }

  /** Reads server/kb/*.md, chunks by heading, embeds in batches and replaces the stored chunks. */
  async ingest(): Promise<number> {
    const dir = this.resolveDir();
    const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
    const chunks = [];
    for (const file of files) {
      const md = await readFile(path.join(dir, file), 'utf8');
      chunks.push(...chunkMarkdown(md, titleFromFile(file)));
    }
    if (chunks.length === 0) throw new Error(`No knowledge-base chunks found in ${dir}`);

    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      embeddings.push(...(await this.llm.embed(chunks.slice(i, i + EMBED_BATCH).map((c) => c.text))));
    }
    await this.store.replaceAll(chunks.map((c, i) => ({ ...c, embedding: embeddings[i]! })));
    logger.info({ files: files.length, chunks: chunks.length }, 'knowledge base ingested');
    return chunks.length;
  }

  private resolveDir(): string {
    const candidates = [this.kbDir, 'kb', path.join('server', 'kb')].filter((d): d is string => !!d);
    const found = candidates.map((d) => path.resolve(d)).find((d) => existsSync(d));
    if (!found) throw new Error(`Knowledge-base folder not found (looked in: ${candidates.join(', ')})`);
    return found;
  }
}

const titleFromFile = (file: string) =>
  file.replace(/\.md$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
