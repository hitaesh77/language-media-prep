const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const filename = path.resolve(__dirname, "../lib/api/mock-client.ts");
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = module.paths;
mod._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);
const { mockClient: api, segmentText, SAMPLE } = mod.exports;
const data = new Map();
global.localStorage = {
  getItem: (k) => data.get(k) ?? null,
  setItem: (k, v) => data.set(k, v),
  removeItem: (k) => data.delete(k),
};
test("source preservation, stable IDs, grounding, persistence, validation and regeneration", async () => {
  const parsed = await api.processContent(SAMPLE);
  assert.deepEqual(parsed.segments, await segmentText(SAMPLE));
  assert.equal(parsed.segments.map((s) => s.text).join("\n\n"), SAMPLE);
  await assert.rejects(() => api.processContent("English only"), /Arabic/);
  await assert.rejects(
    () => api.processContent("", { name: "bad.txt", type: "text/plain", size: 2 }),
    /PDF/,
  );
  await assert.rejects(
    () =>
      api.processContent("", {
        name: "large.pdf",
        type: "application/pdf",
        size: 6000000,
      }),
    /5 MB/,
  );
  const request = {
    name: "Test source",
    type: "Pasted text",
    text: SAMPLE,
    segments: parsed.segments,
    selected: [parsed.segments[0].id],
    preferences: { level: "Intermediate", variety: "MSA", language: "English" },
  };
  const set = await api.generateVocabulary(request);
  assert.ok(set.vocabulary.length > 0);
  for (const card of set.vocabulary) {
    assert.equal(card.sourceId, parsed.segments[0].id);
    assert.ok(card.context.includes(card.expression));
  }
  const updated = await api.updateFamiliar(set.id, [set.vocabulary[0].id]);
  assert.equal(
    updated.vocabulary.filter((v) => !v.familiar).length,
    set.vocabulary.length - 1,
  );
  assert.equal((await api.getSet(set.id)).vocabulary[0].familiar, true);
  const regenerated = await api.generateVocabulary({ ...request, id: set.id });
  assert.equal((await api.listSets()).filter((s) => s.id === regenerated.id).length, 1);
  await assert.rejects(
    () => api.generateVocabulary({ ...request, selected: ["stale"] }),
    /valid passage/,
  );
  data.set("sahih-sets-v1", "broken");
  await assert.rejects(() => api.listSets(), /Reset/);
});
