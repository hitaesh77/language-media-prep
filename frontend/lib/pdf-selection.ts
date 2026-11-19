import type { PageReference, Segment } from "./api/types";

export async function preparePdfSelection(
  segments: Segment[], pages: PageReference[] | undefined, selected: string[],
  parse: (text: string) => Promise<Segment[]>,
) {
  const chosen = segments.filter((segment) => selected.includes(segment.id));
  const text = chosen.map((segment) => segment.text).join("\n\n");
  const parsed = [...text].length > 20000 || chosen.length > 100 ? chosen : await parse(text);
  if (parsed.length !== chosen.length || parsed.some((segment, i) => segment.text !== chosen[i].text))
    throw Error("Selected passages could not be prepared. Please choose them again.");
  const ids = new Map(chosen.map((segment, i) => [segment.id, parsed[i].id]));
  return {
    text, segments: parsed, selected: parsed.map((segment) => segment.id),
    pages: pages?.map((page) => ({ ...page, segmentIds: page.segmentIds.flatMap((id) => ids.has(id) ? [ids.get(id)!] : []) })).filter((page) => page.segmentIds.length),
  };
}
