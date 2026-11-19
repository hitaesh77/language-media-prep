require("./load-ts.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { preparePdfSelection } = require("../lib/pdf-selection.ts");

test("selected PDF passages retain exact text and map nonadjacent pages", async () => {
  const segments = [{ id: "a", text: "one" }, { id: "b", text: "two" }, { id: "c", text: "one" }];
  const pages = segments.map((s, i) => ({ page: i + 1, segmentIds: [s.id] }));
  const result = await preparePdfSelection(segments, pages, ["a", "c"], async (text) =>
    text.split("\n\n").map((text, i) => ({ id: `new:${i}`, text })));
  assert.equal(result.text, "one\n\none");
  assert.deepEqual(result.selected, ["new:0", "new:1"]);
  assert.deepEqual(result.pages, [{ page: 1, segmentIds: ["new:0"] }, { page: 3, segmentIds: ["new:1"] }]);
  assert.deepEqual(require("../lib/api/contracts.ts").readPages(result.pages, result.segments), result.pages);
});


test("large PDF selection keeps source IDs without one oversized parse request", async () => {
  const segments = Array.from({ length: 101 }, (_, i) => ({ id: `p:${i}`, text: "\u0627".repeat(210) }));
  const selected = segments.map((segment) => segment.id);
  const result = await preparePdfSelection(segments, undefined, selected, async () => { throw Error("unexpected parse"); });
  assert.deepEqual(result.selected, selected);
  assert.ok(result.text.length > 20000);
});
