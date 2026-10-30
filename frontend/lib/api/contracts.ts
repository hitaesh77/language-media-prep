import type { GenerationMetadata, PageReference, SavedSet, Segment } from "./types";

export function invalid(): never {
  throw Error("The backend returned invalid or unexpected data. Please try again.");
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
export function string(value: unknown, max = 20000): string {
  if (typeof value !== "string" || !value.trim() || [...value].length > max)
    return invalid();
  return value;
}
export function validText(text: string) {
  if (!text.trim() || [...text].length > 20000)
    throw Error("Enter between 1 and 20,000 characters.");
  if (!/[\u0621-\u064a]/.test(text))
    throw Error("Please include Arabic text in your passage.");
}
export function readSegments(value: unknown, text: string): Segment[] {
  if (!Array.isArray(value) || !value.length || value.length > 10000) return invalid();
  const segments = value.map((v) => {
    const s = object(v);
    return { id: string(s.id, 128), text: string(s.text) };
  });
  if (new Set(segments.map((s) => s.id)).size !== segments.length) return invalid();
  let cursor = 0;
  for (const s of segments) {
    const start = text.indexOf(s.text, cursor);
    if (start < 0 || text.slice(cursor, start).trim()) return invalid();
    cursor = start + s.text.length;
  }
  if (text.slice(cursor).trim()) return invalid();
  return segments;
}
export function readPages(
  value: unknown,
  segments: Segment[],
): PageReference[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return invalid();
  const pages = value.map((v, i) => {
    const p = object(v);
    if (p.page !== i + 1 || !Array.isArray(p.segmentIds)) return invalid();
    return { page: i + 1, segmentIds: p.segmentIds.map((id) => string(id, 128)) };
  });
  if (
    JSON.stringify(pages.flatMap((p) => p.segmentIds)) !==
    JSON.stringify(segments.map((s) => s.id))
  )
    return invalid();
  return pages;
}
export function metadata(value: unknown): GenerationMetadata {
  const d = object(value);
  if (
    d.mode !== "llm" ||
    !Number.isInteger(d.elapsed_ms) ||
    (d.elapsed_ms as number) < 0 ||
    d.cost !== null
  )
    return invalid();
  let usage: Record<string, number> | null = null;
  if (d.usage !== null) {
    usage = {};
    for (const [k, v] of Object.entries(object(d.usage))) {
      if (
        !["prompt_tokens", "completion_tokens", "total_tokens"].includes(k) ||
        !Number.isSafeInteger(v) ||
        (v as number) < 0
      )
        return invalid();
      usage[k] = v as number;
    }
  }
  return {
    mode: "llm",
    elapsedMs: d.elapsed_ms as number,
    usage,
    cost: null,
    notice: string(d.notice, 10000),
  };
}
export function readSavedSet(value: unknown): SavedSet {
  const s = object(value);
  const text = string(s.text);
  validText(text);
  const segments = readSegments(s.segments, text);
  const id = string(s.id, 200),
    name = string(s.name, 200);
  if (s.type !== "PDF" && s.type !== "Pasted text") return invalid();
  if (typeof s.createdAt !== "string" || !Number.isFinite(Date.parse(s.createdAt)))
    return invalid();
  if (
    !Array.isArray(s.selected) ||
    !s.selected.length ||
    s.selected.some((id) => !segments.some((p) => p.id === id)) ||
    new Set(s.selected).size !== s.selected.length
  )
    return invalid();
  const selected = s.selected as string[];
  const preferences = object(s.preferences);
  const count = preferences.cardsPerPassage;
  if (
    count !== undefined &&
    (typeof count !== "number" ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 15 ||
      count * selected.length > 300)
  )
    return invalid();
  const prefs = {
    level: string(preferences.level, 100),
    variety: string(preferences.variety, 100),
    language: string(preferences.language, 100),
    ...(count !== undefined ? { cardsPerPassage: count as number } : {}),
  };
  if (!Array.isArray(s.vocabulary) || !s.vocabulary.length || s.vocabulary.length > 300)
    return invalid();
  const vocabulary = s.vocabulary.map((value) => {
    const v = object(value),
      sourceId = string(v.sourceId, 128);
    const source = segments.find((p) => p.id === sourceId);
    const expression = string(v.expression, 200),
      context = string(v.context);
    if (
      !source ||
      !selected.includes(sourceId) ||
      context !== source.text ||
      !context.includes(expression) ||
      typeof v.familiar !== "boolean"
    )
      return invalid();
    return {
      id: string(v.id, 1000),
      expression,
      meaning: string(v.meaning, 1500),
      context,
      sourceId,
      familiar: v.familiar,
    };
  });
  if (new Set(vocabulary.map((v) => v.id)).size !== vocabulary.length) return invalid();
  const pages = readPages(s.pages, segments);
  let generation: GenerationMetadata | undefined;
  if (s.generation !== undefined) {
    const g = object(s.generation);
    generation = metadata({ ...g, elapsed_ms: g.elapsedMs });
  }
  return {
    id,
    name,
    type: s.type,
    text,
    segments,
    selected,
    preferences: prefs,
    vocabulary,
    createdAt: s.createdAt,
    ...(pages ? { pages } : {}),
    ...(generation ? { generation } : {}),
  };
}
