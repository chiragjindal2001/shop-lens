export interface TextChunk {
  source: string;
  section: string;
  text: string;
}

const TARGET_MAX_CHARS = 1400; // ~350 tokens
const TARGET_MIN_CHARS = 200; // ~50 tokens: smaller pieces are merged into their neighbour

/**
 * Splits a Markdown document into chunks by heading. `# Title` becomes the source name, each `## Section`
 * becomes a chunk (long ones are split on paragraph boundaries). Every chunk text is prefixed with
 * "Title: Section" so it still makes sense, and embeds well, on its own.
 */
export function chunkMarkdown(markdown: string, fallbackTitle: string): TextChunk[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let title = fallbackTitle;
  const sections: { heading: string; body: string[] }[] = [{ heading: 'Overview', body: [] }];

  for (const line of lines) {
    const h1 = /^#\s+(.+)$/.exec(line);
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h1 && title === fallbackTitle) title = h1[1]!.trim();
    else if (h2) sections.push({ heading: h2[1]!.trim(), body: [] });
    else if (!h1) sections[sections.length - 1]!.body.push(line);
  }

  const chunks: TextChunk[] = [];
  for (const sec of sections) {
    const body = sec.body.join('\n').trim();
    if (!body) continue;
    for (const piece of splitByParagraph(body, TARGET_MAX_CHARS)) {
      chunks.push({ source: title, section: sec.heading, text: `${title}: ${sec.heading}\n${piece}` });
    }
  }
  return mergeTiny(chunks);
}

function splitByParagraph(body: string, max: number): string[] {
  if (body.length <= max) return [body];
  const out: string[] = [];
  let cur = '';
  for (const para of body.split(/\n{2,}/)) {
    if (cur && cur.length + para.length + 2 > max) {
      out.push(cur);
      cur = para;
    } else cur = cur ? `${cur}\n\n${para}` : para;
  }
  if (cur) out.push(cur);
  return out;
}

/** Folds a very short chunk into the previous chunk of the same document so it isn't searched in isolation. */
function mergeTiny(chunks: TextChunk[]): TextChunk[] {
  const out: TextChunk[] = [];
  for (const c of chunks) {
    const prev = out[out.length - 1];
    if (prev && prev.source === c.source && c.text.length < TARGET_MIN_CHARS && prev.text.length + c.text.length < TARGET_MAX_CHARS) {
      prev.text += `\n\n${c.section}: ${c.text.split('\n').slice(1).join('\n')}`;
    } else out.push({ ...c });
  }
  return out;
}
