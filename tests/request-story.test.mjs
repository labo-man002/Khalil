import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseUnits, inventory } from '../src/lib/request-story.mjs';
test('the story reproduces the article’s two different placements', () => {
  assert.deepEqual(chooseUnits('pack'), [87, 91]);
  assert.deepEqual(chooseUnits('spread'), [95, 91]);
  assert.deepEqual(inventory.map(n => n.node), [11,12,13,14]);
});
test('without an occupied reference both policies use deterministic node order', () => {
  const nodes = inventory.map(n => ({ ...n, free: true })).reverse();
  assert.deepEqual(chooseUnits('pack', nodes), [71,87]);
  assert.deepEqual(chooseUnits('spread', nodes), [71,87]);
});
test('occupied units never become candidates', () => {
  assert.deepEqual(chooseUnits('pack', inventory.map(n => ({...n, free:false}))), []);
});
