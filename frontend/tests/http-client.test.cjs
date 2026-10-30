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
  const file = new File(["%PDF-test"], "source.pdf", { type: "application/pdf" });
  const source = await api.processContent("ignored", file);
  assert.deepEqual(source, { text: TEXT, segments, pages });
  assert.equal(calls[0].url, "http://backend.invalid/api/pdf/extract");
  assert.ok(calls[0].body instanceof FormData);
  assert.equal(await calls[0].body.get("file").text(), "%PDF-test");
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
      new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.pdf", {
        type: "application/pdf",
      }),
    ),
    /4 MiB/,
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
  assert.equal(JSON.parse(calls.at(-1).body).cards_per_passage, 3);
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
