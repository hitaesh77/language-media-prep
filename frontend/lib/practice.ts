import type { SavedSet, Vocabulary } from "./api/types";

export function practiceBatches(set: SavedSet): Vocabulary[][] {
  return set.segments.flatMap((segment) => {
    const cards = set.vocabulary.filter((v) => v.sourceId === segment.id && !v.familiar);
    return Array.from({ length: Math.ceil(cards.length / 10) }, (_, i) =>
      cards.slice(i * 10, i * 10 + 10),
    );
  });
}

export function shortContext(context: string, expression: string): string {
  // shortcut: punctuation-based sentences; upgrade if Arabic review finds ambiguous boundaries.
  const escaped = expression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const at = context.search(
    new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escaped}(?![\\p{L}\\p{M}\\p{N}])`, "u"),
  );
  if (at < 0) return "";
  const sentences = [...context.matchAll(/[^.!?\u061f\u061b\n]+[.!?\u061f\u061b]?/gu)];
  const sentence = sentences.find(
    (s) => s.index! <= at && s.index! + s[0].length >= at + expression.length,
  );
  const text = sentence?.[0] ?? context;
  const offset = sentence?.index ?? 0;
  const words = [...text.matchAll(/\S+/gu)];
  if (words.length <= 24) return text.trim();
  const first = words.findIndex((w) => w.index! + w[0].length > at - offset);
  const last = words.findIndex(
    (w) => w.index! + w[0].length >= at - offset + expression.length,
  );
  const start = Math.max(0, first - 4);
  const end = Math.min(words.length - 1, last + 4);
  return (
    (start ? "\u2026 " : "") +
    text.slice(words[start].index!, words[end].index! + words[end][0].length) +
    (end < words.length - 1 ? " \u2026" : "")
  );
}
