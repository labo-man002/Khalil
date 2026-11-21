import { newStory, transition } from './story.mjs';

const SAVE_KEY = 'hidden-layers:chapter-one';
const SETTINGS_KEY = 'hidden-layers:settings';
const LEGACY_KEY = 'hlt-darja-v1';
const VERSION = 1;

export const defaults = { music: true, volume: 55, reducedMotion: false, instantText: false };

export function loadStory(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { state: null, events: [], notice: storage.getItem(LEGACY_KEY) ? 'old' : null };
    const save = JSON.parse(raw);
    if (save.version !== VERSION) return { state: null, events: [], notice: 'old' };
    if (!Array.isArray(save.events) || save.events.length > 2000) throw new Error('Invalid event list');
    let state = newStory();
    for (const event of save.events) {
      if (!event || typeof event !== 'object') throw new Error('Invalid event');
      const next = transition(state, event);
      if (next === state) throw new Error('Invalid transition');
      state = next;
    }
    return { state, events: save.events, notice: null };
  } catch {
    return { state: null, events: [], notice: 'invalid' };
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function saveStory(storage, events) {
  return write(storage, SAVE_KEY, { version: VERSION, events });
}

export function loadSettings(storage) {
  try {
    const settings = JSON.parse(storage.getItem(SETTINGS_KEY)) ?? {};
    return {
      music: typeof settings.music === 'boolean' ? settings.music : defaults.music,
      volume: Number.isInteger(settings.volume) && settings.volume >= 0 && settings.volume <= 100
        ? settings.volume : defaults.volume,
      reducedMotion: settings.reducedMotion === true,
      instantText: settings.instantText === true,
    };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(storage, settings) {
  return write(storage, SETTINGS_KEY, settings);
}
