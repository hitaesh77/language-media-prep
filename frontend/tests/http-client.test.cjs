require("./load-ts.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHttpClient } = require("../lib/api/http-client.ts");
const { StorageError } = require("../lib/api/storage.ts");
const { SAMPLE } = require("../lib/sample.ts");

const TEXT = "قرأ الطالب كتابا.\n\nوجد الطالب قصة جميلة.";
const segments = TEXT.split("\n\n").map((text, i) => ({ id: `canonical:${i}`, text }));
const preferences = {
  level: "Advanced",
  variety: "Egyptian Arabic",
  language: "Arabic",
};
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const output = () => ({
  cards: [
    {
      expression: "الطالب",
      meaning: "el estudiante",
      segment_id: segments[0].id,
      context: segments[0].text,
    },
  ],
  mode: "llm",
  elapsed_ms: 12,
  usage: { total_tokens: 100 },
  cost: null,
  notice: "AI meanings need review.",
});
function setup() {
  const saved = new Map();
  const storage = {
    getItem: (k) => saved.get(k) ?? null,
    setItem: (k, v) => saved.set(k, v),
    removeItem: (k) => saved.delete(k),
  };
  const calls = [];
  const state = { generation: () => response(output()), parse: () => response(segments) };
  const api = createHttpClient({
    baseUrl: "http://backend.invalid",
    storage,
    fetch: async (url, init) => {
      calls.push({ url, ...init });
      return url.endsWith("/api/segments") ? state.parse(init) : state.generation(init);
    },
    timeoutMs: 20,
  });
  return { api, saved, storage, calls, state };
}
const request = () => ({
  name: "My source",
  type: "Pasted text",
  text: TEXT,
  segments,
  selected: [segments[0].id],
  preferences,
});

test("fresh library is empty and offline; text calls FastAPI with unchanged source", async () => {
  const { api, calls } = setup();
  assert.deepEqual(await api.listSets(), []);
  assert.equal(calls.length, 0);
  assert.deepEqual(await api.processContent(TEXT), { text: TEXT, segments });
  assert.equal(calls[0].url, "http://backend.invalid/api/segments");
  assert.deepEqual(JSON.parse(calls[0].body), { text: TEXT });
});

test("generation maps settings, explicitly requests llm and persists safe response metadata", async () => {
  const { api, calls } = setup();
  const set = await api.generateVocabulary(request());
  const call = calls.find((c) => c.url.endsWith("/api/generate"));
  assert.deepEqual(JSON.parse(call.body), {
    text: TEXT,
    segment_ids: [segments[0].id],
    proficiency: "advanced",
    variety: "Egyptian",
    explanation_language: "Arabic",
    mode: "llm",
  });
  assert.equal(set.vocabulary[0].sourceId, segments[0].id);
  assert.equal(set.vocabulary[0].familiar, false);
  assert.equal(set.generation.usage.total_tokens, 100);
  assert.equal(set.generation.notice, "AI meanings need review.");
  assert.deepEqual(await api.getSet(set.id), set);
});

test("familiar replacement, missing IDs and regeneration semantics", async () => {
  const { api } = setup();
  const set = await api.generateVocabulary(request());
  const known = await api.updateFamiliar(set.id, [set.vocabulary[0].id]);
  assert.equal(known.vocabulary.filter((v) => !v.familiar).length, 0);
  assert.equal((await api.updateFamiliar(set.id, [])).vocabulary[0].familiar, false);
  await assert.rejects(api.updateFamiliar(set.id, ["unknown"]), /unknown/i);
  await assert.rejects(api.getSet("missing"), /not found/i);
  const regenerated = await api.generateVocabulary({ ...request(), id: set.id });
  assert.equal(regenerated.id, set.id);
  assert.equal(regenerated.createdAt, set.createdAt);
  assert.equal(regenerated.vocabulary[0].id, set.vocabulary[0].id);
  assert.equal(regenerated.vocabulary[0].familiar, false);
  assert.equal((await api.listSets()).length, 1);
});

test("failed provider and failed local save leave previous set intact", async () => {
  const { api, saved, state, storage } = setup();
  const set = await api.generateVocabulary(request());
  const before = saved.get("sahih-sets-v1");
  state.generation = () => response({ detail: "AI generation failed." }, 502);
  await assert.rejects(
    api.generateVocabulary({ ...request(), id: set.id }),
    /AI generation failed/,
  );
  assert.equal(saved.get("sahih-sets-v1"), before);
  state.generation = () => response(output());
  storage.setItem = () => {
    throw Error("quota");
  };
  await assert.rejects(
    api.generateVocabulary({ ...request(), id: set.id }),
    /save.*browser/i,
  );
  assert.equal(saved.get("sahih-sets-v1"), before);
});

test("legacy IDs remap by full ordered paragraph sequence including duplicates", async () => {
  const { api, calls } = setup();
  const oldSegments = segments.map((s, i) => ({ ...s, id: `legacy-${i}` }));
  await api.generateVocabulary({
    ...request(),
    segments: oldSegments,
    selected: ["legacy-0"],
  });
  const body = JSON.parse(calls.find((c) => c.url.endsWith("/api/generate")).body);
  assert.deepEqual(body.segment_ids, [segments[0].id]);
  const count = calls.length;
  await assert.rejects(
    api.generateVocabulary({
      ...request(),
      segments: [oldSegments[1], oldSegments[0]],
      selected: ["legacy-0"],
    }),
    /source|passage/i,
  );
  assert.equal(
    calls.slice(count).filter((c) => c.url.endsWith("/api/generate")).length,
    0,
  );
});

test("PDF bytes are sent as multipart and provenance survives saving", async () => {
  const { api, state, calls } = setup();
  const pages = [{ page: 1, segmentIds: segments.map((s) => s.id) }];
  state.generation = () => response({ text: TEXT, segments, pages });
  const { PDFDocument } = require("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const file = new File([await pdf.save()], "source.pdf", { type: "application/pdf" });
  const source = await api.processContent("ignored", file);
  assert.deepEqual(source, { text: TEXT, segments, pages });
  assert.equal(calls[0].url, "http://backend.invalid/api/pdf/extract");
  assert.ok(calls[0].body instanceof FormData);
  assert.equal(
    (
      await PDFDocument.load(await calls[0].body.get("file").arrayBuffer())
    ).getPageCount(),
    1,
  );
  assert.equal(calls[0].headers?.["Content-Type"], undefined);
  state.generation = () => response(output());
  const set = await api.generateVocabulary({ ...request(), type: "PDF", pages });
  assert.deepEqual((await api.getSet(set.id)).pages, pages);
});

test("invalid files/preferences/selections fail before paid generation", async () => {
  const { api, calls } = setup();
  await assert.rejects(api.processContent("", new File(["x"], "bad.txt")), /PDF/);
  await assert.rejects(
    api.processContent(
      "",
      new File([new Uint8Array(50 * 1024 * 1024 + 1)], "big.pdf", {
        type: "application/pdf",
      }),
    ),
    /50 MiB/,
  );
  await assert.rejects(
    api.generateVocabulary({
      ...request(),
      preferences: { ...preferences, language: "unknown" },
    }),
    /preference/i,
  );
  await assert.rejects(
    api.generateVocabulary({ ...request(), selected: [segments[0].id, segments[0].id] }),
    /passage/i,
  );
  assert.equal(calls.filter((c) => c.url.endsWith("/api/generate")).length, 0);
});

test("untrusted HTTP output is rejected before storage", async () => {
  for (const mutate of [
    (d) => {
      d.cards[0].context = "forged";
    },
    (d) => {
      d.cards[0].segment_id = segments[1].id;
    },
    (d) => {
      d.cards[0].expression = "invented";
    },
    (d) => {
      d.mode = "baseline";
    },
  ]) {
    const { api, state, saved } = setup();
    const data = output();
    mutate(data);
    state.generation = () => response(data);
    await assert.rejects(api.generateVocabulary(request()), /invalid|unexpected/i);
    assert.equal(saved.size, 0);
  }
});

test("validation arrays, platform HTML, offline and timeout errors are actionable", async () => {
  const { api, state } = setup();
  state.parse = () =>
    response(
      { detail: [{ msg: "Select a valid passage.", input: "secret-source" }] },
      422,
    );
  await assert.rejects(
    api.processContent(TEXT),
    (e) => /Select a valid/.test(e.message) && !e.message.includes("secret-source"),
  );
  state.parse = () => new Response("<html>private traceback</html>", { status: 413 });
  await assert.rejects(api.processContent(TEXT), /too large/i);
  state.parse = () => {
    throw TypeError("Failed to fetch");
  };
  await assert.rejects(api.processContent(TEXT), /backend|connect/i);
  state.parse = (init) =>
    new Promise((_, reject) =>
      init.signal.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")),
      ),
    );
  await assert.rejects(api.processContent(TEXT), /timed out/i);
});

test("corrupt storage is distinguishable from unavailable storage; legacy data is retained", async () => {
  const { api, saved, storage } = setup();
  saved.set("sahih-sets-v1", "broken");
  await assert.rejects(
    api.listSets(),
    (e) => e instanceof StorageError && e.kind === "corrupt",
  );
  assert.equal(saved.get("sahih-sets-v1"), "broken");
  storage.getItem = () => {
    throw Error("blocked");
  };
  await assert.rejects(
    api.listSets(),
    (e) => e instanceof StorageError && e.kind === "unavailable",
  );
});

test("repeated legacy paragraphs map by occurrence, not first text match", async () => {
  const { api, state, calls } = setup();
  const paragraph = "قرأ الطالب كتابا.";
  const repeated = [
    { id: "server:0", text: paragraph },
    { id: "server:1", text: paragraph },
  ];
  state.parse = () => response(repeated);
  state.generation = () =>
    response({
      ...output(),
      cards: [
        {
          expression: "الطالب",
          meaning: "the student",
          segment_id: "server:1",
          context: paragraph,
        },
      ],
    });
  const set = await api.generateVocabulary({
    ...request(),
    text: paragraph + "\n\n" + paragraph,
    segments: [
      { id: "old-0", text: paragraph },
      { id: "old-1", text: paragraph },
    ],
    selected: ["old-1"],
  });
  assert.deepEqual(set.selected, ["server:1"]);
  assert.deepEqual(JSON.parse(calls.at(-1).body).segment_ids, ["server:1"]);
});

test("legacy saved sets are preserved without claiming AI provenance", async () => {
  const { api, saved } = setup();
  const set = await api.generateVocabulary(request());
  delete set.generation;
  saved.set("sahih-sets-v1", JSON.stringify([set]));
  assert.equal((await api.listSets())[0].generation, undefined);
  assert.deepEqual((await api.getSet(set.id)).vocabulary, set.vocabulary);
});

test("UI and API use code-point length, including supplementary characters", async () => {
  const { api, state } = setup();
  const text = "ا".repeat(19999) + "😀";
  state.parse = () => response([{ id: "unicode:0", text }]);
  assert.equal((await api.processContent(text)).text, text);
  await assert.rejects(api.processContent(text + "ا"), /20,000/);
});

test("delete removes only the chosen set, persists, and keeps data on write failure", async () => {
  const { api, storage, saved } = setup();
  const first = await api.generateVocabulary(request());
  const second = await api.generateVocabulary({ ...request(), name: "Keep me" });
  const before = saved.get("sahih-sets-v1");
  const write = storage.setItem;
  storage.setItem = () => {
    throw Error("blocked");
  };
  await assert.rejects(api.deleteSet(first.id), /save/i);
  assert.equal(saved.get("sahih-sets-v1"), before);
  storage.setItem = write;
  await api.deleteSet(first.id);
  await api.deleteSet(first.id);
  assert.deepEqual(
    (await api.listSets()).map((s) => s.id),
    [second.id],
  );
});

test("untouched built-in seeds are removed without deleting user sets or edited demos", async () => {
  const { api, saved } = setup();
  const user = await api.generateVocabulary(request());
  const parts = SAMPLE.split("\n\n").map((text, i) => ({ id: `old-${i}`, text }));
  const seed = {
    ...user,
    id: "sample-0",
    name: "The Little Prince",
    type: "PDF",
    createdAt: "2026-10-28T00:00:00Z",
    text: SAMPLE,
    segments: parts,
    selected: parts.map((s) => s.id),
    preferences: {
      level: "Intermediate",
      variety: "Modern Standard Arabic (MSA)",
      language: "English",
    },
    vocabulary: [
      {
        id: "old-word",
        expression: "صباح",
        meaning: "morning",
        sourceId: parts[0].id,
        context: parts[0].text,
        familiar: false,
      },
    ],
  };
  delete seed.generation;
  const edited = {
    ...seed,
    id: "sample-2",
    name: "Arabic Short Story",
    vocabulary: seed.vocabulary.map((v) => ({ ...v, familiar: true })),
  };
  saved.set("sahih-sets-v1", JSON.stringify([seed, user, edited]));
  assert.deepEqual(
    (await api.listSets()).map((s) => s.id),
    [user.id, edited.id],
  );
  assert.equal(JSON.parse(saved.get("sahih-sets-v1")).length, 2);
});

test("Home can cancel a pending HTTP request without retrying", async () => {
  const { api, state, calls } = setup();
  state.parse = (init) =>
    new Promise((_, reject) =>
      init.signal.addEventListener("abort", () =>
        reject(new DOMException("cancelled", "AbortError")),
      ),
    );
  const pending = api.processContent(TEXT);
  api.cancelPending();
  await assert.rejects(pending, /cancelled/i);
  assert.equal(calls.length, 1);
});

test("per-passage card target is forwarded and survives browser storage", async () => {
  const { api, calls } = setup();
  const req = request();
  req.preferences = { ...req.preferences, cardsPerPassage: 3 };
  const set = await api.generateVocabulary(req);
  assert.equal(JSON.parse(calls.find((c) => c.url.endsWith("/api/generate")).body).cards_per_passage, 3);
  assert.equal((await api.getSet(set.id)).preferences.cardsPerPassage, 3);
});
test("unsupported language and invalid card budgets fail before requests", async () => {
  for (const patch of [
    { language: "Spanish" },
    { cardsPerPassage: 0 },
    { cardsPerPassage: 1.5 },
    { cardsPerPassage: 16 },
  ]) {
    const { api, calls } = setup();
    const req = request();
    req.preferences = { ...req.preferences, ...patch };
    await assert.rejects(api.generateVocabulary(req));
    assert.equal(calls.length, 0);
  }
});

test("fifty cards across ten passages save and reopen with passage provenance", async () => {
  const { api, state, calls } = setup();
  const source = TEXT.split("\n\n")[0];
  const many = Array.from({ length: 10 }, (_, i) => ({ id: `many:${i}`, text: source }));
  const words = source.split(" ");
  const expressions = [...words, words.slice(0, 2).join(" "), source];
  state.parse = () => response(many);
  state.generation = () =>
    response({
      ...output(),
      cards: many.flatMap((s) =>
        expressions.map((expression) => ({
          expression,
          meaning: "fixture meaning",
          segment_id: s.id,
          context: s.text,
        })),
      ),
    });
  const set = await api.generateVocabulary({
    ...request(),
    text: many.map((s) => s.text).join("\n\n"),
    segments: many,
    selected: many.map((s) => s.id),
    preferences: { ...preferences, cardsPerPassage: 5 },
  });
  assert.equal(set.vocabulary.length, 50);
  assert.equal(JSON.parse(calls.at(-1).body).cards_per_passage, 5);
  assert.equal((await api.getSet(set.id)).vocabulary.length, 50);
  for (const s of many)
    assert.equal(set.vocabulary.filter((v) => v.sourceId === s.id).length, 5);
});

test("category selection persists through reopen, is forwarded, and rejects invalid selections", async () => {
  const { api, calls } = setup();
  const categories = ["nouns", "verbs", "roots"];
  const req = { ...request(), preferences: { ...preferences, categories } };
  const set = await api.generateVocabulary(req);
  assert.deepEqual((await api.getSet(set.id)).preferences.categories, categories);
  assert.deepEqual(
    JSON.parse(calls.find((c) => c.url.endsWith("/api/generate")).body).categories,
    categories,
  );
  for (const categories of [[], ["nouns", "nouns"], ["adverbs"]]) {
    await assert.rejects(
      api.generateVocabulary({ ...req, preferences: { ...preferences, categories } }),
      /categor/i,
    );
  }
});

test("stars persist without changing content, survive regeneration, and fail safely", async () => {
  const { api, calls, storage } = setup();
  const set = await api.generateVocabulary(request());
  const beforeCalls = calls.length;
  const starred = await api.updateStarred(set.id, true);
  assert.deepEqual(starred, { ...set, starred: true });
  assert.equal(calls.length, beforeCalls);
  const reopened = createHttpClient({ storage });
  assert.equal((await reopened.getSet(set.id)).starred, true);
  const regenerated = await api.generateVocabulary({ ...request(), id: set.id });
  assert.equal(regenerated.starred, true);
  const originalWrite = storage.setItem;
  storage.setItem = () => {
    throw Error("quota");
  };
  await assert.rejects(api.updateStarred(set.id, false), /Could not save/);
  assert.equal((await api.getSet(set.id)).starred, true);
  storage.setItem = originalWrite;
  assert.equal((await api.updateStarred(set.id, false)).starred, false);
  await assert.rejects(api.updateStarred("missing", true), /not found/i);
  await assert.rejects(api.updateStarred(set.id, "yes"), /valid star/i);
});

test("invalid saved star values are rejected without overwriting the library", async () => {
  const { api, saved } = setup();
  const set = await api.generateVocabulary(request());
  const raw = JSON.stringify([{ ...set, starred: "yes" }]);
  saved.set("sahih-sets-v1", raw);
  await assert.rejects(api.listSets(), /could not be read/i);
  assert.equal(saved.get("sahih-sets-v1"), raw);
});

test("book page ranges merge in order with canonical IDs and preserve repeated passages", async () => {
  const { PDFDocument } = require("pdf-lib");
  const { File } = require("node:buffer");
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 55; i++) pdf.addPage();
  const file = new File([await pdf.save()], "book.pdf", { type: "application/pdf" });
  let active = 0,
    maxActive = 0,
    calls = 0;
  const api = createHttpClient({
    fetch: async (url, init) => {
      if (url.endsWith("/api/segments")) {
        const text = JSON.parse(init.body).text;
        return response(
          text.split("\n\n").map((text, i) => ({ id: `combined:${i}`, text })),
        );
      }
      active++;
      maxActive = Math.max(maxActive, active);
      calls++;
      const part = await PDFDocument.load(await init.body.get("file").arrayBuffer());
      const count = part.getPageCount();
      await new Promise((resolve) => setTimeout(resolve, count === 10 ? 15 : 1));
      active--;
      const segments = Array.from({ length: count }, (_, i) => ({
        id: `local:${i}`,
        text: "كلمة عربية",
      }));
      return response({
        text: segments.map((s) => s.text).join("\n\n"),
        segments,
        pages: segments.map((s, i) => ({ page: i + 1, segmentIds: [s.id] })),
      });
    },
  });
  const result = await api.processContent("", file, { start: 3, end: 13 });
  assert.equal(calls, 2);
  assert.equal(maxActive, 2);
  assert.equal(result.segments.length, 11);
  assert.deepEqual(
    result.pages.map((p) => p.page),
    Array.from({ length: 11 }, (_, i) => i + 3),
  );
  assert.deepEqual(
    result.pages.flatMap((p) => p.segmentIds),
    result.segments.map((s) => s.id),
  );
  assert.equal(new Set(result.segments.map((s) => s.id)).size, 11);
  const defaultRange = await api.processContent("", file, { start: 6 });
  assert.deepEqual(defaultRange.pages.map((p) => p.page), [6, 7, 8, 9, 10]);
  const large = await api.processContent("", file, { start: 6, end: 55 });
  assert.equal(large.pages.length, 50);
  assert.equal(large.pages[0].page, 6);
  assert.equal(large.pages[49].page, 55);
  assert.deepEqual(large.pages.flatMap((p) => p.segmentIds), large.segments.map((s) => s.id));
  assert.deepEqual(require('../lib/api/contracts.ts').readPages(large.pages, large.segments), large.pages);
  await assert.rejects(api.processContent("", file, { start: 1, end: 51 }), /range/i);
});

test("PDF extraction errors identify the original page", async () => {
  const { PDFDocument } = require("pdf-lib");
  const { File } = require("node:buffer");
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 10; i++) pdf.addPage();
  const file = new File([await pdf.save()], "book.pdf", { type: "application/pdf" });
  const api = createHttpClient({ fetch: async () => response({ detail: "Page 3 of this PDF chunk: PDF text encoding is unusable." }, 422) });
  await assert.rejects(api.processContent("", file, { start: 5, end: 10 }), /PDF page 7: PDF text encoding is unusable/);
});

test("subtitle timestamps survive saving and regeneration", async () => {
  const { api } = setup();
  const subtitles = segments.map((s, i) => ({
    sourceId: s.id,
    cueId: `cue:${i}`,
    startMs: i * 1000,
    endMs: i * 1000 + 900,
  }));
  const set = await api.generateVocabulary({ ...request(), subtitles });
  assert.deepEqual((await api.getSet(set.id)).subtitles, subtitles);
  assert.deepEqual(
    (await api.generateVocabulary({ ...request(), id: set.id, subtitles })).subtitles,
    subtitles,
  );
  await assert.rejects(
    api.generateVocabulary({
      ...request(),
      subtitles: [{ ...subtitles[0], endMs: -1 }, subtitles[1]],
    }),
    /invalid/i,
  );
});


test("automatic PDF import preserves successful pages and retries only failures", async () => {
  const { PDFDocument } = require("pdf-lib");
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 3; i++) pdf.addPage();
  const file = new File([await pdf.save()], "book.pdf", { type: "application/pdf" });
  let calls = 0;
  const progress = [];
  const api = createHttpClient({ fetch: async () => {
    const call = ++calls;
    if (call === 2) return response({ detail: "bad page" }, 422);
    const text = "\u0643\u0644\u0645\u0629 \u0639\u0631\u0628\u064a\u0629";
    const segments = [{ id: "same:0", text }];
    return response({ text, segments, pages: [{ page: 1, segmentIds: ["same:0"] }] });
  }});
  const first = await api.importPdf(file, (done, total) => progress.push([done, total]));
  assert.deepEqual(first.pages.map((p) => p.page), [1, 3]);
  assert.deepEqual(first.failedPages.map((p) => p.page), [2]);
  assert.equal(new Set(first.segments.map((s) => s.id)).size, 2);
  assert.deepEqual(progress.at(-1), [3, 3]);
  const retry = await api.importPdf(file, () => {});
  assert.equal(calls, 4);
  assert.deepEqual(retry.pages.map((p) => p.page), [1, 2, 3]);
  assert.deepEqual(retry.failedPages, []);
  assert.equal(retry.segments[0].id, first.segments[0].id);
  assert.equal(retry.segments[2].id, first.segments[1].id);
});


test("automatic PDF import accepts more than 50 pages and 20,000 total characters", async () => {
  const { PDFDocument } = require("pdf-lib");
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 51; i++) pdf.addPage();
  const file = new File([await pdf.save()], "book.pdf", { type: "application/pdf" });
  const text = "\u0627".repeat(400);
  const api = createHttpClient({ fetch: async () => response({
    text, segments: [{ id: "page:0", text }], pages: [{ page: 1, segmentIds: ["page:0"] }],
  }) });
  const result = await api.importPdf(file, () => {});
  assert.equal(result.pages.length, 51);
  assert.ok(result.text.length > 20000);
  assert.equal(result.failedPages.length, 0);
});


test("automatic PDF import rejects originals larger than 20 MiB before reading", async () => {
  const api = createHttpClient();
  await assert.rejects(api.importPdf({ name: "large.pdf", type: "application/pdf", size: 20 * 1024 * 1024 + 1 }, () => {}), /20 MiB/);
});


test("large PDF generation batches and preserves source references and prior saved data on failure", async () => {
  const saved = new Map();
  const storage = { getItem: (k) => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
  let calls = 0, failAt = 0;
  const arabic = "\u0639\u0631\u0628\u064a";
  const segments = Array.from({ length: 101 }, (_, i) => ({ id: `original:${i}`, text: arabic + String(i).padEnd(210, "x") }));
  const text = segments.map((s) => s.text).join("\n\n");
  const pages = segments.map((s, i) => ({ page: i + 1, segmentIds: [s.id] }));
  const api = createHttpClient({ storage, fetch: async (url, init) => {
    const data = JSON.parse(init.body);
    if (url.endsWith("/api/segments")) return response(data.text.split("\n\n").map((text, i) => ({ id: `parsed:${i}`, text })));
    calls++;
    if (calls === failAt) return response({ detail: "batch failed" }, 502);
    const first = data.text.split("\n\n")[0];
    return response({ cards: [{ expression: arabic, meaning: "meaning", segment_id: data.segment_ids[0], context: first }], mode: "llm", elapsed_ms: 2, usage: null, cost: null, notice: "Review meanings" });
  }});
  const request = { name: "Large book", type: "PDF", text, segments, selected: segments.map((s) => s.id), pages, preferences };
  const result = await api.generateVocabulary(request);
  assert.equal(calls, 11);
  assert.equal(result.vocabulary.length, 11);
  assert.equal(result.vocabulary[1].sourceId, "original:10");
  assert.equal(result.pages[100].page, 101);
  assert.deepEqual(await api.getSet(result.id), result);
  const before = saved.get("sahih-sets-v1");
  failAt = calls + 2;
  await assert.rejects(api.generateVocabulary({ ...request, id: result.id }), /batch failed/);
  assert.equal(saved.get("sahih-sets-v1"), before);
  const failedCalls = calls;
  const resumed = await api.generateVocabulary({ ...request, id: result.id });
  assert.equal(calls - failedCalls, 10);
  assert.equal(resumed.vocabulary.length, 11);
});

test("batch retries malformed model output once", async () => {
  let calls = 0;
  const saved = new Map();
  const segments = Array.from({ length: 11 }, (_, i) => ({ id: `s:${i}`, text: "عربي" + i }));
  const api = createHttpClient({ storage: { getItem: (k) => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) }, fetch: async (url, init) => {
    const data = JSON.parse(init.body);
    if (url.endsWith("/api/segments")) return response(data.text.split("\n\n").map((text, i) => ({ id: `p:${i}`, text })));
    calls++;
    if (calls === 1) return response({ detail: "AI generation did not match the required vocabulary format. Try again." }, 502);
    return response({ cards: [{ expression: "عربي", meaning: "meaning", segment_id: data.segment_ids[0], context: data.text.split("\n\n")[0] }], mode: "llm", elapsed_ms: 2, usage: null, cost: null, notice: "Review meanings" });
  }});
  const set = await api.generateVocabulary({ name: "Movie", type: "Pasted text", text: segments.map((s) => s.text).join("\n\n"), segments, selected: segments.map((s) => s.id), subtitles: segments.map((s, i) => ({ sourceId: s.id, cueId: `c:${i}`, startMs: i * 1000, endMs: i * 1000 + 900 })), preferences });
  assert.equal(calls, 3);
  assert.equal(set.vocabulary.length, 2);
});

test("an empty numeric batch does not prevent later batches from generating", async () => {
  const saved = new Map();
  const segments = Array.from({ length: 11 }, (_, i) => ({ id: `s:${i}`, text: "عربي" + i }));
  let calls = 0;
  const api = createHttpClient({ storage: { getItem: (k) => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) }, fetch: async (url, init) => {
    const data = JSON.parse(init.body);
    if (url.endsWith("/api/segments")) return response(data.text.split("\n\n").map((text, i) => ({ id: `p:${i}`, text })));
    if (url.endsWith("/api/generate/fill")) return response({ detail: "No vocabulary candidates found. Try a longer Arabic passage." }, 422);
    if (++calls === 1) return response({ detail: "No vocabulary candidates found. Try a longer Arabic passage." }, 422);
    return response({ cards: [{ expression: "عربي", meaning: "meaning", segment_id: data.segment_ids[0], context: data.text }], mode: "llm", elapsed_ms: 2, usage: null, cost: null, notice: "Review meanings" });
  }});
  const set = await api.generateVocabulary({ name: "Movie", type: "Pasted text", text: segments.map((s) => s.text).join("\n\n"), segments, selected: segments.map((s) => s.id), subtitles: segments.map((s, i) => ({ sourceId: s.id, cueId: `c:${i}`, startMs: i * 1000, endMs: i * 1000 + 900 })), preferences: { ...preferences, cardsPerPassage: 3 } });
  assert.equal(calls, 2);
  assert.equal(set.vocabulary.length, 1);
  assert.match(set.generation.notice, /10 selected passages have no cards/);
});

test("fill pass reaches the total using additional words from another passage", async () => {
  const saved = new Map();
  const parts = ["عربي بيت جميل", "عربي كتاب كبير"];
  let fillCalls = 0;
  const api = createHttpClient({ storage: { getItem: (k) => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) }, fetch: async (url, init) => {
    const data = JSON.parse(init.body);
    if (url.endsWith("/api/segments")) return response(data.text.split("\n\n").map((text, i) => ({ id: `p:${i}`, text })));
    const base = { mode: "llm", elapsed_ms: 2, usage: { total_tokens: 2 }, cost: null, notice: "Review meanings" };
    if (url.endsWith("/api/generate/fill")) {
      fillCalls++;
      assert.equal(data.target, 2);
      assert.equal(data.existing.length, 2);
      return response({ ...base, cards: ["كتاب", "كبير"].map((expression) => ({ expression, meaning: "meaning", segment_id: "p:1", context: parts[1] })) });
    }
    return response({ ...base, cards: parts.map((text, i) => ({ expression: "عربي", meaning: "meaning", segment_id: `p:${i}`, context: text })) });
  }});
  const set = await api.generateVocabulary({ name: "Movie", type: "Pasted text", text: parts.join("\n\n"), segments: parts.map((text, i) => ({ id: `p:${i}`, text })), selected: ["p:0", "p:1"], preferences: { ...preferences, cardsPerPassage: 2 } });
  assert.equal(fillCalls, 1);
  assert.equal(set.vocabulary.length, 4);
  assert.equal(set.vocabulary.filter((v) => v.sourceId === "p:1").length, 3);
  assert.match(set.generation.notice, /4 of 4 requested/);
  assert.equal(set.generation.usage.total_tokens, 4);
});

test("failed fill preserves first-pass cards and reports the shortfall", async () => {
  const { api, state } = setup();
  state.generation = (init) => JSON.parse(init.body).target
    ? response({ detail: "provider unavailable" }, 502)
    : response(output());
  const set = await api.generateVocabulary({ ...request(), preferences: { ...preferences, cardsPerPassage: 3 } });
  assert.equal(set.vocabulary.length, 1);
  assert.match(set.generation.notice, /1 of 3 requested.*additional generation failed/);
  assert.equal((await api.getSet(set.id)).vocabulary.length, 1);
});

test("duplicate fill output is rejected without losing first-pass cards", async () => {
  const { api } = setup();
  const set = await api.generateVocabulary({ ...request(), preferences: { ...preferences, cardsPerPassage: 3 } });
  assert.equal(set.vocabulary.length, 1);
  assert.match(set.generation.notice, /additional generation failed/);
});

test("fill redistributes a shortfall across movie batches", async () => {
  const saved = new Map();
  const segments = Array.from({ length: 11 }, (_, i) => ({ id: `s:${i}`, text: `عربي بيت ${i}` }));
  let firstPass = 0, fillPass = 0;
  const api = createHttpClient({ storage: { getItem: (k) => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) }, fetch: async (url, init) => {
    const data = JSON.parse(init.body);
    if (url.endsWith("/api/segments")) return response(data.text.split("\n\n").map((text, i) => ({ id: `p:${i}`, text })));
    const meta = { mode: "llm", elapsed_ms: 1, usage: null, cost: null, notice: "Review" };
    if (url.endsWith("/api/generate/fill")) {
      fillPass++;
      if (fillPass > 1) return response({ detail: "No vocabulary candidates found. Try a longer Arabic passage." }, 422);
      return response({ ...meta, cards: [{ expression: "بيت", meaning: "house", segment_id: "p:0", context: data.text.split("\n\n")[0] }] });
    }
    if (++firstPass === 1) return response({ detail: "No vocabulary candidates found. Try a longer Arabic passage." }, 422);
    return response({ ...meta, cards: [{ expression: "عربي", meaning: "Arabic", segment_id: "p:0", context: data.text }] });
  }});
  const set = await api.generateVocabulary({ name: "Movie", type: "Pasted text", text: segments.map((s) => s.text).join("\n\n"), segments, selected: segments.map((s) => s.id), subtitles: segments.map((s, i) => ({ sourceId: s.id, cueId: `c:${i}`, startMs: i * 1000, endMs: i * 1000 + 900 })), preferences: { ...preferences, cardsPerPassage: 2 } });
  assert.equal(set.vocabulary.length, 2);
  assert.deepEqual(set.vocabulary.map((v) => v.sourceId), ["s:0", "s:10"]);
  assert.match(set.generation.notice, /2 of 22 requested/);
});


test("large subtitle selections batch and retain timing through regeneration", async () => {
  const saved = new Map();
  const storage = { getItem: (k) => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
  const segments = Array.from({ length: 101 }, (_, i) => ({ id: `subtitle:${i}`, text: "\u0639\u0631\u0628\u064a" + i }));
  const subtitles = segments.map((s, i) => ({ sourceId: s.id, cueId: `cue:${i}`, startMs: i * 1000, endMs: i * 1000 + 900 }));
  const api = createHttpClient({ storage, fetch: async (url, init) => {
    const data = JSON.parse(init.body);
    if (url.endsWith("/api/segments")) return response(data.text.split("\n\n").map((text, i) => ({ id: `parsed:${i}`, text })));
    return response({ cards: [{ expression: "\u0639\u0631\u0628\u064a", meaning: "meaning", segment_id: data.segment_ids[0], context: data.text.split("\n\n")[0] }], mode: "llm", elapsed_ms: 2, usage: null, cost: null, notice: "Review meanings" });
  }});
  const request = { name: "Movie", type: "Pasted text", text: segments.map((s) => s.text).join("\n\n"), segments, selected: segments.map((s) => s.id), subtitles, preferences: { ...preferences, cardsPerPassage: 5 } };
  const set = await api.generateVocabulary(request);
  assert.equal(set.vocabulary.length, 11);
  assert.deepEqual(set.subtitles, subtitles);
  assert.deepEqual(await api.getSet(set.id), set);
  const regenerated = await api.generateVocabulary({ ...request, id: set.id });
  assert.deepEqual(regenerated.subtitles, subtitles);
});
