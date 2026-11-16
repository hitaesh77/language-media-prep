require("./load-ts.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { practiceBatches, shortContext } = require("../lib/practice.ts");
test("practice groups by passage, excludes familiar cards and caps batches at ten", () => {
  const a = Array.from({ length: 23 }, (_, i) => ({
    id: `a${i}`,
    sourceId: "a",
    familiar: i === 0,
  }));
  const b = [{ id: "b1", sourceId: "b", familiar: false }];
  const batches = practiceBatches({
    segments: [{ id: "a" }, { id: "b" }],
    vocabulary: [...b, ...a],
  });
  assert.deepEqual(
    batches.map((b) => b.length),
    [10, 10, 2, 1],
  );
  assert.equal(new Set(batches.flat().map((c) => c.id)).size, 23);
  assert.ok(batches.every((b) => new Set(b.map((c) => c.sourceId)).size === 1));
  assert.deepEqual(
    practiceBatches({
      segments: [{ id: "a" }],
      vocabulary: a.map((c) => ({ ...c, familiar: true })),
    }),
    [],
  );
});
test("context uses the containing sentence and crops long sentences around the expression", () => {
  assert.equal(
    shortContext("First sentence. The target word is here! Last sentence.", "target"),
    "The target word is here!",
  );
  const words = Array.from({ length: 40 }, (_, i) => `word${i}`);
  const excerpt = shortContext(words.join(" "), "word20");
  assert.equal(excerpt, "\u2026 " + words.slice(16, 25).join(" ") + " \u2026");
  assert.equal(shortContext("Nothing here.", "missing"), "");
  assert.equal(
    shortContext("word0 " + words.join(" "), "word0").startsWith("word0"),
    true,
  );
});

test("context skips substring matches inside a different word", () => {
  assert.equal(shortContext("Bookshelf first. Book here.", "Book"), "Book here.");
  assert.equal(
    shortContext(
      "\u0645\u0643\u062a\u0628\u0629 \u0642\u062f\u064a\u0645\u0629\u061f \u0643\u062a\u0628 \u0642\u062f\u064a\u0645\u0629.",
      "\u0643\u062a\u0628",
    ),
    "\u0643\u062a\u0628 \u0642\u062f\u064a\u0645\u0629.",
  );
});
