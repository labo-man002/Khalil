// Four bars per loop. Negative melody offsets are rests.
const cues = {
  title: { tonic: 45, beat: .84, bass: [0, 3, -2, -5], color: 'keys', space: .28, counter: [19, 15, 14, 19], melody: [24, -1, 19, 15, 23, -1, 19, 17, 24, 26, 27, -1, 19, 17, 15, -1] },
  street: { tonic: 50, beat: .78, bass: [0, -3, -5, -2], color: 'keys', melody: [12, -1, 15, 19, 17, -1, 15, 12, 10, 12, -1, 8, 10, -1, 14, -1] },
  room: { tonic: 57, beat: .74, bass: [0, -2, -5, -4], color: 'pluck', melody: [12, 15, -1, 19, 17, 15, -1, 12, 10, -1, 12, 15, 14, -1, 11, -1] },
  office: { tonic: 52, beat: .60, bass: [0, -1, -3, -5], color: 'pluck', percussion: [1, 3], melody: [19, -1, 15, 14, -1, 11, 14, -1, 15, 19, -1, 17, 12, -1, 10, -1] },
  cafe: { tonic: 53, beat: .82, bass: [0, -5, -3, -5], color: 'keys', percussion: [2], melody: [16, -1, 19, 24, 21, 19, -1, 16, 17, 21, -1, 19, 14, 17, 12, -1] },
  doubt: { tonic: 47, beat: .50, bass: [0, -1, -2, -1], color: 'pulse', space: .055, percussion: [0, 1, 3], melody: [6, -1, 1, 6, -1, 6, 5, 1, 6, -1, 1, -1, 5, 6, -1, -1] },
  admission: { tonic: 48, beat: .92, bass: [0, 0, -3, -5], color: 'bow', space: .19, melody: [19, -1, -1, 15, 17, -1, 15, -1, 10, -1, -1, 12, 14, -1, 12, -1] },
  reveal: { tonic: 60, beat: .72, bass: [0, -5, -2, 0], color: 'bell', space: .23, melody: [19, 16, 24, -1, 24, -1, 21, 19, 16, -1, 17, 19, 16, 14, 12, -1] },
  end: { tonic: 57, beat: .94, bass: [0, -5, -3, 0], color: 'keys', space: .22, counter: [16, 19, 16, 7], melody: [24, 19, 16, -1, 17, -1, 14, 17, 16, -1, 12, 9, 7, -1, 12, -1] },
};

const instruments = {
  pluck: { harmonics: [1, .29, .24, .12, .07, .035], attack: .018, length: 1.35, level: .30, chord: [7, 12], echo: .17 },
  keys: { harmonics: [1, .13, .055, .09], attack: .028, length: 1.85, level: .28, chord: [4, 7, 12], echo: .13 },
  pulse: { harmonics: [1, .44, .32, .16, .11], attack: .012, length: .72, level: .29, chord: [6], echo: 0 },
  bow: { harmonics: [1, .60, .20, .07], attack: .22, length: 2.85, level: .28, chord: [3, 7, 14], echo: 0 },
  bell: { harmonics: [1, .03, .58, .015, .19], attack: .009, length: 2.25, level: .29, chord: [4, 7, 14], echo: .28 },
};

let context;
let master;
let reverb;
let waves;
let revision = 0;
let cueName = 'street';
let score;
let enabled = false;

function note(bus, time, midi, duration, level, type = 'sine', attack = .06) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  if (waves[type]) oscillator.setPeriodicWave(waves[type]);
  else oscillator.type = type;
  oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  envelope.gain.setValueAtTime(.0001, time);
  envelope.gain.linearRampToValueAtTime(level, time + attack);
  envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
  oscillator.connect(envelope).connect(bus);
  oscillator.start(time);
  oscillator.stop(time + duration);
}

function makeReverb() {
  const seconds = .72;
  const frames = Math.ceil(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, frames, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const samples = impulse.getChannelData(channel);
    let seed = 131 + channel * 433;
    let filtered = 0;
    for (let i = 0; i < frames; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      filtered = filtered * .60 + (seed / 0x100000000 * 2 - 1) * .40;
      samples[i] = filtered * (1 - i / frames) ** 3.4;
    }
  }
  const node = context.createConvolver();
  node.buffer = impulse;
  node.connect(master);
  return node;
}

function stopScore() {
  if (!score) return;
  const { bus, reverbSend, timer } = score;
  clearTimeout(timer);
  bus.gain.setTargetAtTime(0, context.currentTime, .075);
  setTimeout(() => {
    bus.disconnect();
    reverbSend?.disconnect();
  }, 550);
  score = undefined;
}

function startScore() {
  const { tonic, beat, bass, melody, color, percussion = [], space = .10, counter } = cues[cueName];
  const { attack, length, level, chord, echo } = instruments[color];
  const bus = context.createGain();
  bus.gain.value = 0;
  bus.connect(master);
  const reverbSend = context.createGain();
  reverbSend.gain.value = space;
  bus.connect(reverbSend).connect(reverb);
  bus.gain.setTargetAtTime(1, context.currentTime, .06);
  score = { bus, reverbSend, timer: null };
  let nextBar = context.currentTime + .025;
  let index = 0;
  function plan() {
    if (nextBar < context.currentTime) nextBar = context.currentTime + .025;
    while (nextBar < context.currentTime + .22) {
      const root = tonic + bass[index];
      note(bus, nextBar, root - 12, beat * 3.9, .10, 'triangle', .14);
      chord.forEach((interval, voice) =>
        note(bus, nextBar + voice * .05, root + interval, beat * 4.25, .15 / chord.length, 'sine', .20));
      if (counter) note(bus, nextBar + beat * 2.5, tonic + counter[index], beat * 1.65, .062, 'keys', .035);
      for (const pulse of percussion) note(bus, nextBar + pulse * beat, root - 18, .19, .17, 'sine', .008);
      for (let step = 0; step < 4; step++) {
        const offset = melody[index * 4 + step];
        if (offset < 0) continue;
        const start = nextBar + step * beat;
        note(bus, start, tonic + offset, beat * length, level, color, attack);
        if (echo) note(bus, start + beat / 2, tonic + offset, beat * 1.45, level * echo, 'sine', .04);
      }
      index = (index + 1) % bass.length;
      nextBar += beat * 4;
    }
    score.timer = setTimeout(plan, 100);
  }
  plan();
}

export function setSceneMusic(name) {
  if (cueName === name) return;
  cueName = name;
  if (enabled) {
    stopScore();
    startScore();
  }
}

export async function setAudio({ music, volume }) {
  const request = ++revision;
  if (!music && !context) return true;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      reverb = makeReverb();
      waves = Object.fromEntries(Object.entries(instruments).map(([name, { harmonics }]) => [
        name,
        context.createPeriodicWave(new Float32Array(harmonics.length + 1), Float32Array.from([0, ...harmonics])),
      ]));
    }
    if (music) await context.resume();
    if (request !== revision) return true;
    enabled = music;
    master.gain.setTargetAtTime(music ? .59 * volume / 100 : 0, context.currentTime, .07);
    if (!enabled) stopScore();
    else if (!score) startScore();
    return true;
  } catch {
    return request !== revision;
  }
}

export function chime() {
  if (!enabled) return;
  const now = context.currentTime;
  note(master, now, 81, .23, .11);
  note(master, now + .065, 86, .30, .075);
}
