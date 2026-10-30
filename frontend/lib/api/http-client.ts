import {
  invalid,
  metadata,
  object,
  readPages,
  readSegments,
  string,
  validText,
} from "./contracts";
import { Library, type BrowserStorage } from "./storage";
import type { GenerateRequest, PrepClient, SavedSet, SourceContent } from "./types";

type Options = {
  baseUrl?: string;
  fetch?: typeof fetch;
  storage?: BrowserStorage;
  timeoutMs?: number;
};
const levels: Record<string, string> = {
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
};
const varieties: Record<string, string> = {
  "Modern Standard Arabic (MSA)": "Modern Standard Arabic",
  MSA: "Modern Standard Arabic",
  "Egyptian Arabic": "Egyptian",
  "Levantine Arabic": "Levantine",
};

export function createHttpClient(options: Options = {}): PrepClient {
  const library = new Library(options.storage);
  const pending = new Set<AbortController>();
  const base = (
    options.baseUrl ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000"
  ).replace(/\/$/, "");
  async function post(path: string, body: BodyInit, json = false): Promise<unknown> {
    const controller = new AbortController();
    pending.add(controller);
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? (path === "/api/generate" ? 100000 : 25000),
    );
    try {
      const response = await (options.fetch ?? fetch)(base + path, {
        method: "POST",
        body,
        signal: controller.signal,
        ...(json ? { headers: { "Content-Type": "application/json" } } : {}),
      });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok) {
        if (response.status === 413)
          throw Error(
            "Content is too large. Choose a PDF up to 4 MiB or a shorter passage.",
          );
        const detail =
          data && typeof data === "object" && "detail" in data ? data.detail : undefined;
        if (typeof detail === "string") throw Error(detail.slice(0, 1500));
        if (Array.isArray(detail)) {
          const messages = detail.flatMap((v) =>
            v && typeof v.msg === "string" ? [v.msg] : [],
          );
          if (messages.length) throw Error(messages.join(" ").slice(0, 1500));
        }
        throw Error(
          `The backend could not complete this request (${response.status}). Please try again.`,
        );
      }
      if (data === null) return invalid();
      return data;
    } catch (error) {
      if (controller.signal.aborted)
        throw Error(
          controller.signal.reason === "navigation"
            ? "Request cancelled."
            : "The backend request timed out. Try again; no automatic retry was made.",
        );
      if (error instanceof TypeError)
        throw Error(
          "Cannot connect to the backend. Check that it is running and its URL and allowed frontend origin are configured.",
        );
      throw error;
    } finally {
      clearTimeout(timeout);
      pending.delete(controller);
    }
  }
  const parse = async (text: string) =>
    readSegments(await post("/api/segments", JSON.stringify({ text }), true), text);
  const find = (id: string) => {
    const set = library.read().find((s) => s.id === id);
    if (!set) throw Error("Set not found. Return home and try another.");
    return set;
  };
  return {
    cancelPending() {
      for (const controller of pending) controller.abort("navigation");
    },
    async deleteSet(id) {
      const sets = library.read();
      if (sets.some((s) => s.id === id)) library.write(sets.filter((s) => s.id !== id));
    },
    async listSets() {
      return library.read();
    },
    async getSet(id) {
      return find(id);
    },
    async updateFamiliar(id, itemIds) {
      const sets = library.read(),
        set = sets.find((s) => s.id === id);
      if (!set) throw Error("Set not found.");
      if (itemIds.some((id) => !set.vocabulary.some((v) => v.id === id)))
        throw Error("Unknown vocabulary item. Reopen the set and retry.");
      const updated = {
        ...set,
        vocabulary: set.vocabulary.map((v) => ({
          ...v,
          familiar: itemIds.includes(v.id),
        })),
      };
      library.write(sets.map((s) => (s.id === id ? updated : s)));
      return updated;
    },
    async processContent(text, file): Promise<SourceContent> {
      if (file) {
        if (
          !file.name.toLowerCase().endsWith(".pdf") ||
          (file.type &&
            !["application/pdf", "application/octet-stream"].includes(file.type))
        )
          throw Error("Choose a PDF file.");
        if (!file.size || file.size > 4 * 1024 * 1024)
          throw Error("Choose a nonempty PDF no larger than 4 MiB.");
        const form = new FormData();
        form.append("file", file);
        const data = object(await post("/api/pdf/extract", form));
        text = string(data.text);
        validText(text);
        const segments = readSegments(data.segments, text),
          pages = readPages(data.pages, segments);
        if (!pages) return invalid();
        return { text, segments, pages };
      }
      validText(text);
      return { text, segments: await parse(text) };
    },
    async generateVocabulary(request: GenerateRequest) {
      validText(request.text);
      const name = request.name.trim();
      const { level, variety, language } = request.preferences;
      if (
        !Object.hasOwn(levels, level) ||
        !Object.hasOwn(varieties, variety) ||
        !["English", "Arabic"].includes(language)
      )
        throw Error("Choose supported learner preferences.");
      if (!name || [...name].length > 200)
        throw Error("Enter a source name of 1–200 characters.");
      if (
        !request.selected.length ||
        request.selected.length > 100 ||
        new Set(request.selected).size !== request.selected.length
      )
        throw Error("Select between 1 and 100 unique valid passages.");
      const count = request.preferences.cardsPerPassage;
      if (
        count !== undefined &&
        (!Number.isInteger(count) ||
          count < 1 ||
          count > 15 ||
          count * request.selected.length > 300)
      )
        throw Error("Choose 1-15 cards per passage, with at most 300 cards in total.");
      const previous = request.id ? find(request.id) : undefined;
      if (!previous) library.read();
      const segments = await parse(request.text);
      let old;
      try {
        old = readSegments(request.segments, request.text);
      } catch {
        throw Error("Source passages changed. Review and select the source again.");
      }
      if (
        old.length !== segments.length ||
        old.some((s, i) => s.text !== segments[i].text)
      )
        throw Error("Source passages changed. Review and select the source again.");
      const selected = request.selected.map((id) => {
        const index = old.findIndex((s) => s.id === id);
        if (index < 0) throw Error("Select valid source passages again.");
        return segments[index].id;
      });
      const oldPages = readPages(request.pages, old);
      const pages = oldPages?.map((p) => ({
        ...p,
        segmentIds: p.segmentIds.map(
          (id) => segments[old.findIndex((s) => s.id === id)].id,
        ),
      }));
      const data = object(
        await post(
          "/api/generate",
          JSON.stringify({
            text: request.text,
            segment_ids: selected,
            proficiency: levels[level],
            variety: varieties[variety],
            explanation_language: language,
            mode: "llm",
            ...(count !== undefined ? { cards_per_passage: count } : {}),
          }),
          true,
        ),
      );
      const generation = metadata(data);
      if (!Array.isArray(data.cards) || !data.cards.length || data.cards.length > 300)
        return invalid();
      const seen = new Set<string>();
      const vocabulary = data.cards.map((value) => {
        const c = object(value),
          expression = string(c.expression, 200),
          sourceId = string(c.segment_id, 128),
          context = string(c.context);
        const source = segments.find((s) => s.id === sourceId);
        if (
          !source ||
          !selected.includes(sourceId) ||
          context !== source.text ||
          !source.text.includes(expression) ||
          seen.has(JSON.stringify([sourceId, expression]))
        )
          return invalid();
        seen.add(JSON.stringify([sourceId, expression]));
        return {
          id: JSON.stringify([sourceId, expression]),
          expression,
          meaning: string(c.meaning, 1500),
          sourceId,
          context,
          familiar: false,
        };
      });
      if (
        count !== undefined &&
        selected.some((id) => vocabulary.filter((v) => v.sourceId === id).length > count)
      )
        return invalid();
      const set: SavedSet = {
        id: previous?.id ?? crypto.randomUUID(),
        name,
        type: request.type,
        text: request.text,
        segments,
        selected,
        preferences: {
          level,
          variety,
          language,
          ...(count !== undefined ? { cardsPerPassage: count } : {}),
        },
        vocabulary,
        createdAt: previous?.createdAt ?? new Date().toISOString(),
        generation,
        ...(pages ? { pages } : {}),
      };
      const latest = library.read();
      if (
        previous &&
        JSON.stringify(latest.find((s) => s.id === previous.id)) !==
          JSON.stringify(previous)
      )
        throw Error("This set changed in another tab. Reopen it before regenerating.");
      library.write([...latest.filter((s) => s.id !== set.id), set]);
      return set;
    },
  };
}
