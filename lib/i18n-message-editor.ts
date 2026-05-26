/** Flatten nested JSON to dot-path string leaves only (for translation editor). */

export type StringLeaf = { path: string; value: string };

export function flattenStringLeaves(node: unknown, parts: string[] = []): StringLeaf[] {
  if (node === null || node === undefined) return [];
  if (typeof node === 'string') {
    return [{ path: parts.join('.'), value: node }];
  }
  if (typeof node !== 'object') return [];
  if (Array.isArray(node)) {
    const out: StringLeaf[] = [];
    node.forEach((item, i) => {
      out.push(...flattenStringLeaves(item, [...parts, String(i)]));
    });
    return out;
  }
  const obj = node as Record<string, unknown>;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const out: StringLeaf[] = [];
  for (const k of keys) {
    out.push(...flattenStringLeaves(obj[k], [...parts, k]));
  }
  return out;
}

/** Rebuild tree from template, replacing every string leaf with values[path] when present. */
export function mergeStringLeaves(template: unknown, values: Record<string, string>): unknown {
  function walk(node: unknown, partPath: string[]): unknown {
    if (node === null || node === undefined) return node;
    if (typeof node === 'string') {
      const path = partPath.join('.');
      return Object.prototype.hasOwnProperty.call(values, path) ? values[path] : node;
    }
    if (Array.isArray(node)) {
      return node.map((item, i) => walk(item, [...partPath, String(i)]));
    }
    if (typeof node === 'object') {
      const o = node as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(o).sort((a, b) => a.localeCompare(b))) {
        out[k] = walk(o[k], [...partPath, k]);
      }
      return out;
    }
    return node;
  }
  return walk(template, []);
}
