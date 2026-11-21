// Four-bar themes with an answering phrase on the second pass. Negative offsets are rests.
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

const arrangements = {
  title: { thirds: [3, 4, 4, 4], answer: [12, 16, 14, 11] },
  street: { thirds: [0, 0, 0, 0], answer: [7, 12, 10, 14] },
  room: { answer: [19, 12, 15, 11], swing: .07 },
  office: { lift: [1.5, 3.25], swing: .035 },
  cafe: { thirds: [4, 4, 3, 4], lift: [.65, 1.65, 3.3], answer: [19, 16, 19, 17], swing: .13 },
  doubt: { lift: [.65, 2.5], swing: .085 },
  admission: { answer: [12, 15, 10, 12] },
  reveal: { thirds: [4, 4, 3, 4], answer: [12, 16, 14, 19] },
  end: { thirds: [3, 4, 4, 3], answer: [12, 14, 16, 12] },
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
let softNoise;
let locationSound;
let ambience;
let nearWindow = false;
let waves;
let revision = 0;
let cueName = 'street';
let score;
let enabled = false;
let volumeLevel = 0;

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

const atmosphere = {
  street: { level: .29, cutoff: 4300, pan: -.12 },
  room: { level: .12, cutoff: 1320, pan: .19 },
  cafe: { level: .085, cutoff: 760, pan: -.18 },
  office: { level: .065, cutoff: 570, pan: .12 },
};

function panTo(bus, position) {
  if (!context.createStereoPanner || position === 0) return bus;
  const pan = context.createStereoPanner();
  pan.pan.value = position;
  pan.connect(bus);
  return pan;
}

function tuneAtmosphere() {
  if (!ambience) return;
  const profile = atmosphere[ambience.place];
  const close = ambience.place === 'room' && nearWindow;
  const now = context.currentTime;
  ambience.level.gain.setTargetAtTime(close ? .40 : profile.level, now, .21);
  ambience.filter.frequency.setTargetAtTime(close ? 3850 : profile.cutoff, now, .18);
}

function syncAtmosphere() {
  const place = enabled && !document.hidden ? locationSound : undefined;
  if (ambience?.place === place) return;
  const previous = ambience;
  ambience = undefined;
  if (previous) {
    clearTimeout(previous.timer);
    previous.level.gain.setTargetAtTime(0, context.currentTime, .14);
    previous.bed.stop(context.currentTime + .8);
    setTimeout(() => previous.pan.disconnect(), 850);
  }
  const profile = atmosphere[place];
  if (!profile) return;

  const bed = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const level = context.createGain();
  const pan = panTo(master, profile.pan);
  bed.buffer = softNoise;
  bed.loop = true;
  filter.type = 'lowpass';
  filter.frequency.value = profile.cutoff;
  level.gain.value = 0;
  bed.connect(filter).connect(level).connect(pan);
  bed.start();
  const layer = { place, level, filter, bed, pan: pan === master ? level : pan };
  ambience = layer;
  tuneAtmosphere();

  function accent() {
    if (ambience !== layer) return;
    const time = context.currentTime;
    // Let the room own its timing instead of syncing to the music.
    if (place === 'cafe') {
      note(level, time, 90, .21, .30, 'bell', .01);
      texture(time + .09, .19, .36, 1900, 'bandpass', level);
    } else if (place === 'office') {
      texture(time, .20, .40, 970, 'bandpass', level);
      note(level, time + .14, 44, .11, .24, 'triangle', .012);
    } else if (place === 'street' || nearWindow) {
      texture(time, .38, .26, 1900, 'bandpass', level);
    }
    layer.timer = setTimeout(accent, 1750 + Math.random() * 3000);
  }
  layer.timer = setTimeout(accent, 950);
}

function startScore() {
  const { tonic, beat, bass, melody, color, percussion = [], space = .10, counter } = cues[cueName];
  const { attack, length, level, chord, echo } = instruments[color];
  const { thirds, swing = 0, lift = [], answer } = arrangements[cueName];
  const bus = context.createGain();
  bus.gain.value = 0;
  bus.connect(master);
  const reverbSend = context.createGain();
  reverbSend.gain.value = space;
  bus.connect(reverbSend).connect(reverb);
  bus.gain.setTargetAtTime(1, context.currentTime, .06);
  score = { bus, reverbSend, timer: null };
  let nextBar = context.currentTime + .025;
  let bar = 0;
  function plan() {
    if (nextBar < context.currentTime) nextBar = context.currentTime + .025;
    while (nextBar < context.currentTime + .22) {
      const index = bar % bass.length;
      const reply = bar >= bass.length;
      const root = tonic + bass[index];
      const bassLength = lift.length ? beat * 1.35 : beat * 3.65;
      note(bus, nextBar, root - 12, bassLength, .094, 'triangle', .09);
      if (lift.length) note(bus, nextBar + beat * 2.15, root - 5, beat * 1.25, .055, 'triangle', .065);
      const voicing = thirds ? [thirds[index], 7, 12] : chord;
      voicing.forEach((interval, voice) =>
        note(bus, nextBar + voice * .066, root + interval, beat * 3.95, .125 / voicing.length, 'sine', .19));
      if (counter) note(bus, nextBar + beat * 2.5, tonic + counter[index], beat * 1.65, .062, 'keys', .035);
      for (const pulse of percussion) note(bus, nextBar + pulse * beat, root - 18, .17, .13, 'sine', .008);
      for (const accent of lift) texture(nextBar + accent * beat, .105, .073, 2300, 'bandpass', bus);
      if (reply && answer) {
        note(bus, nextBar + beat * 1.55, tonic + answer[index], beat * .95, .080, 'pluck', .02);
      }
      for (let step = 0; step < 4; step++) {
        const offset = melody[index * 4 + step];
        if (offset < 0) continue;
        const start = nextBar + (step + (step % 2 ? swing : 0)) * beat;
        const emphasis = [1, .74, .89, .68][step];
        const duration = beat * length * (reply && step === 3 ? .70 : 1);
        note(bus, start, tonic + offset, duration, level * emphasis, color, Math.min(attack, duration * .4));
        if (echo && !(reply && step % 2)) note(bus, start + beat / 2, tonic + offset, beat * 1.45, level * emphasis * echo, 'sine', .04);
      }
      bar = (bar + 1) % (bass.length * 2);
      nextBar += beat * 4;
    }
    score.timer = setTimeout(plan, 100);
  }
  plan();
}

export function setSceneMusic(name, place) {
  locationSound = place;
  syncAtmosphere();
  if (cueName === name) return;
  cueName = name;
  if (enabled && !document.hidden) {
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
      softNoise = context.createBuffer(1, Math.ceil(context.sampleRate * 2.4), context.sampleRate);
      const samples = softNoise.getChannelData(0);
      let filtered = 0;
      for (let i = 0; i < samples.length; i++) {
        filtered = .78 * filtered + .22 * (Math.random() * 2 - 1);
        samples[i] = filtered;
      }
      waves = Object.fromEntries(Object.entries(instruments).map(([name, { harmonics }]) => [
        name,
        context.createPeriodicWave(new Float32Array(harmonics.length + 1), Float32Array.from([0, ...harmonics])),
      ]));
    }
    if (music) await context.resume();
    if (request !== revision) return true;
    enabled = music;
    volumeLevel = .59 * volume / 100;
    master.gain.setTargetAtTime(music && !listening ? volumeLevel : 0, context.currentTime, .07);
    if (!enabled) stopScore();
    else if (!score && !document.hidden) startScore();
    syncAtmosphere();
    return true;
  } catch {
    return request !== revision;
  }
}

document.addEventListener('visibilitychange', () => {
  if (!enabled) return;
  if (document.hidden) stopScore();
  else if (!score) startScore();
  syncAtmosphere();
});

export function chime() {
  if (!enabled || listening) return;
  const now = context.currentTime;
  note(master, now, 81, .23, .11);
  note(master, now + .065, 86, .30, .075);
}

export function phoneBuzz(delay = 0) {
  if (!enabled || listening) return;
  const now = context.currentTime + delay;
  note(master, now, 45, .13, .17, 'pulse', .015);
  note(master, now + .19, 45, .12, .13, 'pulse', .015);
}

let listening = false;

export function setRecitationActive(active) {
  listening = active;
  if (!context) return;
  master.gain.cancelScheduledValues(context.currentTime);
  if (active) master.gain.setValueAtTime(0, context.currentTime);
  else master.gain.setTargetAtTime(enabled ? volumeLevel : 0, context.currentTime, .07);
}

function texture(time, duration, level, frequency, type, bus = master) {
  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  noise.buffer = softNoise;
  filter.type = type;
  filter.frequency.value = frequency;
  envelope.gain.setValueAtTime(.0001, time);
  envelope.gain.linearRampToValueAtTime(level, time + Math.min(.025, duration / 3));
  envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
  noise.connect(filter).connect(envelope).connect(bus);
  noise.start(time, Math.random() * .7, duration);
}

let alternateStep = false;

export function sceneSound(action, place, position = 0) {
  if (!enabled || listening || document.hidden) return;
  const now = context.currentTime;
  const bus = panTo(master, position);
  if (bus !== master) setTimeout(() => bus.disconnect(), 1150);
  if (action === 'step') {
    alternateStep = !alternateStep;
    const outside = place === 'street';
    const floor = outside ? 31 : place === 'cafe' ? 38 : 35;
    note(bus, now, floor + (alternateStep ? 0 : 3), .13, alternateStep ? .20 : .15, 'triangle', .011);
    texture(now + .013, .14, .28, outside ? 2200 : 670, 'lowpass', bus);
    if (outside) texture(now + .043, .105, .15, 2900, 'bandpass', bus);
  } else if (action === 'chair') {
    texture(now, .45, .42, 620, 'bandpass', bus);
    texture(now + .13, .22, .20, 1300, 'bandpass', bus);
    note(bus, now + .31, 40, .17, .19, 'triangle', .015);
  } else if (action === 'cup') {
    note(bus, now, 93, .18, .115, 'bell', .009);
    texture(now + .24, .28, .19, 1160, 'bandpass', bus);
    note(bus, now + .72, 94, .25, .12, 'bell', .009);
    note(bus, now + .76, 101, .17, .07, 'sine', .013);
  } else if (action === 'door') {
    texture(now, .19, .23, 1200, 'bandpass', bus);
    note(bus, now + .07, 93, .17, .085, 'bell', .01);
    note(bus, now + .26, 36, .22, .16, 'triangle', .018);
  } else if (action === 'paper') {
    texture(now, .20, .45, 2550, 'bandpass', bus);
    texture(now + .12, .17, .28, 3900, 'bandpass', bus);
  } else if (action === 'tap') {
    texture(now, .085, .24, 1750, 'bandpass', bus);
    note(bus, now, 62, .066, .065, 'triangle', .009);
  }
}

export function setWindowRain(near) {
  nearWindow = near;
  tuneAtmosphere();
}
