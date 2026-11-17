import { CATEGORIES } from "./types";
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
  let cancelled = 0;
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
            "A PDF chunk is too large or the text is too long. Choose fewer pages.",
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
      cancelled++;
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
    async updateStarred(id, starred) {
      if (typeof starred !== "boolean") throw Error("Choose a valid star status.");
      const sets = library.read();
      const set = sets.find((s) => s.id === id);
      if (!set) throw Error("Set not found.");
      const updated = { ...set, starred };
      library.write(sets.map((s) => (s.id === id ? updated : s)));
      return updated;
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
    async processContent(text, file, range): Promise<SourceContent> {
      if (file) {
        if (
          !file.name.toLowerCase().endsWith(".pdf") ||
          (file.type &&
            !["application/pdf", "application/octet-stream"].includes(file.type))
        )
          throw Error("Choose a PDF file.");
        if (!file.size || file.size > 50 * 1024 * 1024)
          throw Error("Choose a nonempty PDF no larger than 50 MiB.");
        const operation = cancelled;
        const check = () => {
          if (operation !== cancelled) throw Error("Request cancelled.");
        };
        const { PDFDocument } = await import("pdf-lib");
        let pdf: import("pdf-lib").PDFDocument;
        try {
          pdf = await PDFDocument.load(await file.arrayBuffer());
        } catch {
          throw Error("Cannot open this PDF. Choose a valid, unencrypted PDF.");
        }
        check();
        const start = range?.start ?? 1;
        const end = range?.end ?? Math.min(start + 19, pdf.getPageCount());
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start < 1 ||
          end < start ||
          end > pdf.getPageCount() ||
          end - start >= 20
        )
          throw Error("Choose a valid range of at most 20 pages in this PDF.");
        const chunks: { first: number; count: number; bytes: Uint8Array }[] = [];
        async function split(first: number, count: number): Promise<void> {
          check();
          const part = await PDFDocument.create();
          const pages = await part.copyPages(
            pdf,
            Array.from({ length: count }, (_, i) => first - 1 + i),
          );
          pages.forEach((page) => part.addPage(page));
          const bytes = await part.save();
          check();
          if (bytes.length > 4 * 1024 * 1024) {
            if (count === 1)
              throw Error(`Page ${first} exceeds the 4 MiB extraction limit.`);
            const half = Math.floor(count / 2);
            await split(first, half);
            await split(first + half, count - half);
          } else chunks.push({ first, count, bytes });
        }
        // Split into at least two requests when possible, with bounded parallelism.
        for (let first = start; first <= end; first += 10)
          await split(first, Math.min(10, end - first + 1));
        const results: {
          text: string;
          segments: { id: string; text: string }[];
          pages: NonNullable<SourceContent["pages"]>;
        }[] = [];
        try {
          for (let i = 0; i < chunks.length; i += 2) {
            const batch = await Promise.all(
              chunks.slice(i, i + 2).map(async (chunk) => {
                check();
                const form = new FormData();
                form.append(
                  "file",
                  new Blob([new Uint8Array(chunk.bytes)], { type: "application/pdf" }),
                  "pages.pdf",
                );
                const data = object(await post("/api/pdf/extract", form));
                const text = string(data.text);
                validText(text);
                const segments = readSegments(data.segments, text),
                  pages = readPages(data.pages, segments);
                if (!pages || pages.length !== chunk.count) return invalid();
                return { text, segments, pages };
              }),
            );
            results.push(...batch);
          }
        } catch (error) {
          for (const controller of pending) controller.abort("navigation");
          throw error;
        }
        check();
        text = results.map((r) => r.text).join("\n\n");
        if ([...text].length > 20000)
          throw Error("Extracted text exceeds 20,000 characters. Choose fewer pages.");
        validText(text);
        const segments = await parse(text);
        check();
        const original = results.flatMap((r) => r.segments);
        if (
          original.length !== segments.length ||
          original.some((s, i) => s.text !== segments[i].text)
        )
          return invalid();
        let index = 0;
        const pages = results.flatMap((r, i) =>
          r.pages.map((page) => ({
            page: chunks[i].first + page.page - 1,
            segmentIds: page.segmentIds.map(() => segments[index++].id),
          })),
        );
        return { text, segments, pages };
      }
      validText(text);
      return { text, segments: await parse(text) };
    },
    async generateVocabulary(request: GenerateRequest) {
      validText(request.text);
      const name = request.name.trim();
      const { level, variety, language, categories } = request.preferences;
      if (
        categories !== undefined &&
        (!Array.isArray(categories) ||
          !categories.length ||
          categories.length > 5 ||
          new Set(categories).size !== categories.length ||
          categories.some((c) => !CATEGORIES.includes(c)))
      )
        throw Error("Choose at least one supported vocabulary category.");
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
            ...(categories ? { categories } : {}),
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
          (categories !== undefined && expression.trim().split(/\s+/u).length !== 1) ||
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
          ...(categories ? { categories } : {}),
          variety,
          language,
          ...(count !== undefined ? { cardsPerPassage: count } : {}),
        },
        vocabulary,
        createdAt: previous?.createdAt ?? new Date().toISOString(),
        ...(previous?.starred !== undefined ? { starred: previous.starred } : {}),
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
