import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from './registry';
import { defineTool } from './tool.types';

const tool = (name: string) =>
  defineTool({
    name,
    description: `the ${name} tool`,
    statusLabel: 'Working…',
    schema: z.object({ q: z.string() }),
    async run() {
      return {};
    },
  });

describe('ToolRegistry.specs', () => {
  it('builds the JSON schemas once and reuses them for every model call', () => {
    const registry = new ToolRegistry([tool('a'), tool('b')]);
    const first = registry.specs();
    expect(registry.specs()).toBe(first); // the very same array, not rebuilt
    expect(registry.specs()).toBe(first);
  });

  it('still describes every tool correctly', () => {
    const specs = new ToolRegistry([tool('a'), tool('b')]).specs();
    expect(specs.map((s) => s.name)).toEqual(['a', 'b']);
    expect(specs[0]).toMatchObject({ description: 'the a tool', parameters: { type: 'object', properties: { q: { type: 'string' } } } });
    expect(specs[0]!.parameters).not.toHaveProperty('$schema');
  });
});
