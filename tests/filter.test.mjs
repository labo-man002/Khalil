import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesPost } from '../src/lib/filter.mjs';
const post = { search: 'How a job becomes an allocation. PostgreSQL and architecture.', tags: ['Architecture', 'Placement'] };
test('search is case-insensitive and requires all terms', () => {
  assert.equal(matchesPost(post, '  JOB   postgresql '), true);
  assert.equal(matchesPost(post, 'job telemetry'), false);
});
test('a selected topic intersects the search result', () => {
  assert.equal(matchesPost(post, 'job', 'Architecture'), true);
  assert.equal(matchesPost(post, 'job', 'Networking'), false);
  assert.equal(matchesPost(post, 'missing', 'Architecture'), false);
});
test('empty search includes matching topics, literal punctuation is safe', () => {
  assert.equal(matchesPost(post, ''), true);
  assert.equal(matchesPost(post, ' ', 'Placement'), true);
  assert.equal(matchesPost(post, '[.*]'), false);
});
