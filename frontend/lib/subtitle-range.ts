export function moviePosition(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function subtitleRange<T extends { start_ms: number; end_ms: number }>(cues: T[], start: number, end: number): T[] {
  const roundedEnd = cues.reduce(
    (nearest, cue) => cue.end_ms >= end * 1000 ? Math.min(nearest, cue.end_ms) : nearest,
    Infinity,
  );
  return cues.filter((cue) => cue.end_ms > start * 1000 && cue.start_ms < roundedEnd);
}

export function subtitleReferences(
  cues: { id: string; text: string; start_ms: number; end_ms: number }[],
  segments: { id: string; text: string }[],
) {
  const source = cues.map((cue) => cue.text).join("\n\n");
  let cueIndex = 0;
  let cueStart = 0;
  let cursor = 0;
  return segments.map((segment) => {
    const start = source.indexOf(segment.text, cursor);
    while (cueIndex < cues.length && start >= cueStart + cues[cueIndex].text.length) {
      cueStart += cues[cueIndex].text.length + 2;
      cueIndex++;
    }
    const cue = cues[cueIndex];
    if (start < cueStart || !cue || start + segment.text.length > cueStart + cue.text.length)
      throw Error("Subtitle cues could not be matched to passages.");
    cursor = start + segment.text.length;
    return { sourceId: segment.id, cueId: cue.id, startMs: cue.start_ms, endMs: cue.end_ms };
  });
}
