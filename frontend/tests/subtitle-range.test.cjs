require('./load-ts.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { subtitleRange, subtitleReferences } = require('../lib/subtitle-range.ts');

test('rounds the end up to a whole cue, including across a gap', () => {
  const cues = [{ start_ms: 0, end_ms: 1000 }, { start_ms: 3000, end_ms: 5000 }];
  assert.deepEqual(subtitleRange(cues, 0, 0.5), [cues[0]]);
  assert.deepEqual(subtitleRange(cues, 0, 1), [cues[0]]);
  assert.deepEqual(subtitleRange(cues, 0, 2), cues);
  assert.deepEqual(subtitleRange(cues, 1, 10), [cues[1]]);
});

test('maps paragraphs inside one cue to its original timing without changing text', () => {
  const cues = [{ id: 'a', text: 'مرحبا\n\n\nكيف الحال', start_ms: 10, end_ms: 20 }, { id: 'b', text: 'مرحبا', start_ms: 30, end_ms: 40 }];
  const segments = [{ id: '1', text: 'مرحبا' }, { id: '2', text: 'كيف الحال' }, { id: '3', text: 'مرحبا' }];
  assert.deepEqual(subtitleReferences(cues, segments), [
    { sourceId: '1', cueId: 'a', startMs: 10, endMs: 20 },
    { sourceId: '2', cueId: 'a', startMs: 10, endMs: 20 },
    { sourceId: '3', cueId: 'b', startMs: 30, endMs: 40 },
  ]);
  assert.throws(() => subtitleReferences(cues, [{ id: 'bad', text: 'not present' }]));
});
