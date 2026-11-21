import { chapter, openingTones } from '../content/chapter.mjs';

export const newStory = () => ({
  sceneId: 'opening',
  beatIndex: 0,
  hotspot: null,
  inspected: [],
  evidence: [],
  actions: {},
  judgments: [],
});

function collect(state, ids) {
  return { ...state, evidence: [...new Set([...state.evidence, ...ids])] };
}

function enter(state, sceneId) {
  const next = { ...state, sceneId, beatIndex: 0, hotspot: null, inspected: [] };
  return collect(next, chapter[sceneId].collect ?? []);
}

export function currentBeats(state) {
  const node = chapter[state.sceneId];
  if (state.hotspot) return node.spots.find(spot => spot.id === state.hotspot).beats;
  if (state.sceneId === 'morning') {
    return [...node.beats.slice(0, 2), openingTones[state.judgments[0].interpretation], ...node.beats.slice(2)];
  }
  return node.beats;
}

// A rejected action returns the same state, including during save replay.
export function transition(state, event) {
  const node = chapter[state.sceneId];
  switch (event.type) {
    case 'inspect': {
      if (node.kind !== 'explore' || state.hotspot || typeof event.id !== 'string') return state;
      const spot = node.spots.find(item => item.id === event.id);
      if (!spot || state.inspected.includes(spot.id)) return state;
      return collect({ ...state, hotspot: spot.id }, spot.collect);
    }
    case 'advance': {
      const beats = currentBeats(state);
      if (!beats) return state;
      if (state.beatIndex + 1 < beats.length) return { ...state, beatIndex: state.beatIndex + 1 };
      if (!state.hotspot) return enter(state, node.next);

      const spot = node.spots.find(item => item.id === state.hotspot);
      if (spot.next) return enter({ ...state, actions: { ...state.actions, lead: spot.id } }, spot.next);
      return { ...state, hotspot: null, beatIndex: 0, inspected: [...new Set([...state.inspected, spot.id])] };
    }
    case 'leave':
      if (node.kind !== 'explore' || !node.next || state.hotspot ||
          !node.required.every(id => state.inspected.includes(id))) return state;
      return enter(state, node.next);
    case 'choose': {
      if (node.kind !== 'decision' || typeof event.id !== 'string') return state;
      const choice = node.options.find(item => item.id === event.id);
      if (!choice) return state;
      if (!node.proposition) {
        return enter({ ...state, actions: { ...state.actions, [state.sceneId]: choice.id } }, choice.next ?? node.next);
      }
      if (!Number.isInteger(event.confidence) || event.confidence < 0 || event.confidence > 100) return state;
      const prior = state.judgments.find(item => item.proposition === node.proposition);
      const judgment = {
        sceneId: state.sceneId,
        proposition: node.proposition,
        interpretation: choice.id,
        confidence: event.confidence,
        evidence: [...state.evidence],
        revisedFrom: prior?.sceneId,
      };
      const updated = { ...state, judgments: [...state.judgments, judgment] };
      return enter(choice.id === 'exclude' ? collect(updated, ['exclusion']) : updated, node.next);
    }
    default:
      return state;
  }
}
