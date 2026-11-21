import assert from 'node:assert/strict';
import test from 'node:test';
import { chapter, musicCue } from '../content/chapter.mjs';
import { evidence } from '../content/evidence.mjs';
import { newStory, currentBeats, transition } from '../engine/story.mjs';
import { loadStory, saveStory, loadSettings, saveSettings, defaults } from '../engine/save.mjs';
import { summarize } from '../reflection/summary.mjs';

function run(selection = {}) {
  let state = newStory();
  const events = [];
  const path = new Set();
  const follow = event => {
    const next = transition(state, event);
    assert.notEqual(next, state, JSON.stringify(event));
    events.push(event);
    state = next;
  };
  for (;;) {
    const { sceneId } = state;
    assert(!path.has(sceneId), `cycle at ${sceneId}`);
    path.add(sceneId);
    const node = chapter[sceneId];
    if (node.kind === 'end') return { state, events, path };
    if (node.kind === 'talk') {
      for (const _ of currentBeats(state)) follow({ type: 'advance' });
    } else if (node.kind === 'explore') {
      const ids = node.next ? node.required : [selection.lead ?? 'records'];
      for (const id of ids) {
        follow({ type: 'inspect', id });
        for (const _ of currentBeats(state)) follow({ type: 'advance' });
      }
      if (node.next) follow({ type: 'leave' });
    } else {
      follow({ type: 'choose', id: selection[sceneId] ?? node.options[0].id, confidence: sceneId === 'revision' ? 82 : 33 });
    }
  }
}

test('all scenes, hotspots, options, links and evidence declarations are valid', () => {
  const validTarget = id => assert(Object.hasOwn(chapter, id), `Unknown scene: ${id}`);
  const validEvidence = ids => ids?.forEach(id => assert(Object.hasOwn(evidence, id), `Unknown evidence: ${id}`));
  const unique = entries => assert.equal(new Set(entries.map(item => item.id)).size, entries.length);
  for (const node of Object.values(chapter)) {
    if (node.next) validTarget(node.next);
    if (node.kind === 'talk') assert(node.beats.length);
    validEvidence(node.collect);
    if (node.kind === 'decision') {
      unique(node.options);
      node.options.forEach(choice => validTarget(choice.next ?? node.next));
    }
    if (node.kind === 'explore') {
      unique(node.spots);
      assert(node.spots.length);
      for (const id of node.required) assert(node.spots.some(spot => spot.id === id));
      for (const spot of node.spots) {
        assert(spot.beats.length && spot.x > 0 && spot.x < 100 && spot.y > 0 && spot.y < 100);
        if (!node.next || spot.next) validTarget(spot.next);
        validEvidence(spot.collect);
      }
    }
  }
});

test('all branches and endings can be reached with intact evidence and independent judgments', () => {
  const visited = new Set();
  const leads = { records: 'records', adam: 'draft', youssef: 'explanation', witnesses: 'witnesses' };
  for (const lead of Object.keys(leads)) {
    for (const meeting of ['challenge', 'clarify', 'wait']) {
      for (const final of ['correct', 'internal', 'post']) {
        for (const adamReply of ['witness', 'boundary', 'cut']) {
          const { state, path } = run({ lead, meeting, final, adamReply, mirror: final === 'post' ? 'space' : 'listen' });
          for (const id of path) visited.add(id);
          assert.equal(state.actions.final, final);
          assert.equal(state.actions.adamReply, adamReply);
          assert.deepEqual(state.evidence.filter(id => Object.values(leads).includes(id)), [leads[lead]]);
          for (const id of ['meeting', 'versions', 'rumor', 'admission', 'maryam', 'transfer', 'approval']) {
            assert(state.evidence.includes(id), `missing ${id}`);
          }
          assert.equal(state.judgments.length, 3);
          assert.equal(state.judgments[2].revisedFrom, 'money');
          assert(!state.judgments[1].evidence.includes('transfer'));
          assert(state.judgments[2].evidence.includes('transfer'));
        }
      }
    }
  }
  assert.deepEqual([...visited].sort(), Object.keys(chapter).sort());
});

test('confidence is bounded and story prerequisites cannot be bypassed', () => {
  const start = newStory();
  const initial = [{ type: 'advance' }, { type: 'advance' }].reduce(transition, start);
  assert.equal(transition(initial,{ type: 'leave' }), initial);
  assert.equal(transition(initial,{ type: 'inspect', id: '__proto__' }), initial);
  assert.equal(transition(initial,{ type: 'advance' }), initial);
  assert.equal(transition(initial,{ type: 'choose', id: 'post' }), initial);
  const { events } = run();
  const index = events.findIndex(event => event.type === 'choose');
  const decision = events.slice(0, index).reduce(transition, start);
  for (const confidence of [-1, 101, '90', 4.3, NaN, undefined]) {
    assert.equal(transition(decision, { type: 'choose', id: 'unknown', confidence }), decision);
  }
  for (const confidence of [0, 100]) {
    assert.equal(transition(decision, { type: 'choose', id: 'unknown', confidence }).judgments[0].confidence, confidence);
  }
});

test('save replay preserves the exact scene and history, and recovers from old or corrupt saves', () => {
  const storage = { getItem: () => storage.raw, setItem: (_, value) => { storage.raw = value; } };
  const { events, state } = run({ revision: 'moved' });
  assert(saveStory(storage, events));
  assert.deepEqual(loadStory(storage), { events, state, notice: null });
  const checkpoint = events.slice(0, 2);
  assert(saveStory(storage, checkpoint));
  assert.deepEqual(loadStory(storage).state, checkpoint.reduce(transition, newStory()));
  for (const raw of ['{"version":1,"events":[null]}', '{"version":1,"events":[{"type":"leave"}]}', '{{']) {
    storage.raw = raw;
    assert.equal(loadStory(storage).notice, 'invalid');
  }
  storage.raw = '{"version":99,"events":[]}';
  assert.equal(loadStory(storage).notice, 'old');
  const legacy = { getItem: key => key === 'hlt-darja-v1' ? '{"id":"intro"}' : null };
  assert.equal(loadStory(legacy).notice, 'old');
  const denied = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
  assert.equal(saveStory(denied, []), false);
  assert.equal(loadStory(denied).state, null);
  assert.deepEqual(loadSettings(denied), defaults);
  storage.raw = null;
  assert.equal(loadSettings(storage).music, true);
  storage.raw = '{"volume":36}';
  assert.equal(loadSettings(storage).music, true);
  assert(saveSettings(storage, { ...defaults, music: false }));
  assert.deepEqual(loadSettings(storage), { ...defaults, music: false });
});

test('reflection quotes the same run and differentiates evidence-supported retention and revision', () => {
  const changed = summarize(run({ money:'missing', revision:'moved', rumor:'check' }).state);
  const retained = summarize(run({ money:'moved', revision:'moved', rumor:'share' }).state);
  assert.notEqual(changed.update, retained.update);
  assert.equal(changed.before.confidence, 33);
  assert.equal(changed.after.confidence, 82);
  assert.equal(changed.passedRumor, false);
  assert.equal(retained.passedRumor, true);
  assert(changed.added.includes('transfer'));
  assert.deepEqual(changed, summarize(run({ money:'missing', revision:'moved', rumor:'check' }).state));
});

test('music follows the new clue, confession and reveal without foreshadowing them', () => {
  const cue = (sceneId, evidence = [], hotspot = null) => musicCue({ sceneId, evidence, hotspot });
  assert.equal(cue('intro'), 'room');
  assert.equal(cue('intro', ['read']), 'doubt');
  assert.equal(cue('morning'), 'office');
  assert.equal(cue('cafe'), 'cafe');
  assert.equal(cue('cafe', [], 'adam'), 'admission');
  assert.equal(cue('adamReply'), 'admission');
  assert.equal(cue('proof'), 'office');
  assert.equal(cue('proof', ['transfer']), 'reveal');
  assert.equal(cue('revision'), 'reveal');
  assert.equal(cue('end'), 'end');
});

test('reflection reports the player’s actual pattern even when a revision contradicts the document', () => {
  const revised = summarize(run({ money: 'missing', revision: 'moved', rumor: 'share' }).state);
  const contrary = summarize(run({ money: 'moved', revision: 'missing', rumor: 'share' }).state);
  assert.equal(revised.patterns[1][0], 'الدليل بدّل وجهة نظرك');
  assert.equal(revised.patterns[2][0], 'تثبّتّ من الفلوس، واستعجلت في الكلام');
  assert.equal(contrary.patterns[1][0], 'الراي ما مشاش مع الكشف');
  assert.equal(contrary.patterns[2][0], 'الكلام دار قبل التثبّت');
});

test('ending reflects the confidence trajectory and exact choices across the run', () => {
  const a = run({ meeting: 'wait', lead: 'adam', rumor: 'hold', adamReply: 'cut', mirror: 'space', revision: 'moved', final: 'internal' }).state;
  const b = run({ meeting: 'clarify', lead: 'records', rumor: 'check', adamReply: 'witness', mirror: 'listen', revision: 'moved', final: 'correct' }).state;
  const waited = summarize(a);
  const asked = summarize(b);
  assert.deepEqual(waited.confidenceTrail.map(([, confidence]) => confidence), [33, 33, 82]);
  assert.match(waited.confidenceReading, /طلعت بـ49 نقطة/);
  assert.notEqual(waited.takeaway, asked.takeaway);
  assert.notEqual(waited.leadFeedback, asked.leadFeedback);
  assert.notEqual(waited.rumorFeedback, asked.rumorFeedback);
  assert.equal(waited.actionTrail.length, 3);
  waited.actionTrail.forEach((entry, i) => assert.notDeepEqual(entry, asked.actionTrail[i]));
  const lower = { ...a, judgments: a.judgments.map((entry, i) => i === 2 ? { ...entry, confidence: 10 } : entry) };
  assert.match(summarize(lower).confidenceReading, /هبطت بـ23 نقطة/);
});
