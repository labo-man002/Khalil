// Four bars per loop. Negative melody offsets are rests.
const cues = {
  street: { tonic: 50, beat: .77, bass: [0, -3, -5, -2], melody: [12, -1, 15, 19, 17, -1, 15, 12, 10, 12, -1, 8, 10, -1, 14, -1] },
  room: { tonic: 57, beat: .74, bass: [0, -2, -5, -4], melody: [12, 15, -1, 19, 17, 15, -1, 12, 10, -1, 12, 15, 14, -1, 11, -1] },
  office: { tonic: 52, beat: .62, bass: [0, -1, -3, -5], melody: [12, -1, 15, 14, -1, 11, 14, -1, 15, 19, -1, 17, 12, -1, 10, -1] },
  cafe: { tonic: 53, beat: .82, bass: [0, -5, -3, -5], melody: [16, -1, 19, 24, 21, 19, -1, 16, 17, 21, -1, 19, 14, 17, 12, -1] },
  doubt: { tonic: 50, beat: .64, bass: [0, -1, -2, -1], melody: [12, -1, 13, 16, 19, -1, 16, 13, 12, -1, 10, -1, 13, 12, -1, -1], lead: .28, accent: [0, 3] },
  admission: { tonic: 53, beat: .94, bass: [0, 0, -3, -5], melody: [12, -1, -1, 15, 17, -1, 15, -1, 10, -1, -1, 12, 14, -1, 12, -1], lead: .23, pad: .62 },
  reveal: { tonic: 57, beat: .81, bass: [0, -5, -2, 0], melody: [12, -1, 16, 19, 24, -1, 21, 19, 16, -1, 17, 19, 16, 14, 12, -1], lead: .26, pad: 1.1 },
  end: { tonic: 57, beat: .94, bass: [0, -5, -3, 0], melody: [12, 16, 19, -1, 17, -1, 14, 17, 16, -1, 12, 9, 7, -1, 12, -1] },
};

let context;
let master;
let pluck;
let revision = 0;
let cueName = 'street';
let score;
let enabled = false;

function note(bus, time, midi, duration, level, type = 'sine', attack = .06) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  if (type === 'pluck') oscillator.setPeriodicWave(pluck);
  else oscillator.type = type;
  oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  envelope.gain.setValueAtTime(.0001, time);
  envelope.gain.linearRampToValueAtTime(level, time + attack);
  envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
  oscillator.connect(envelope).connect(bus);
  oscillator.start(time);
  oscillator.stop(time + duration);
}

function stopScore() {
  if (!score) return;
  const { bus, timer } = score;
  clearTimeout(timer);
  bus.gain.setTargetAtTime(0, context.currentTime, .15);
  setTimeout(() => bus.disconnect(), 1050);
  score = undefined;
}

function startScore() {
  const { tonic, beat, bass, melody, lead = .30, pad = 1, accent = [] } = cues[cueName];
  const bus = context.createGain();
  bus.gain.value = 0;
  bus.connect(master);
  bus.gain.setTargetAtTime(1, context.currentTime, .14);
  score = { bus, timer: null };
  let nextBar = context.currentTime + .025;
  let index = 0;
  function plan() {
    if (nextBar < context.currentTime) nextBar = context.currentTime + .025;
    while (nextBar < context.currentTime + .22) {
      const root = tonic + bass[index];
      note(bus, nextBar, root - 12, beat * 3.9, .09, 'triangle', .28);
      note(bus, nextBar, root + 7, beat * 4.4, .14 * pad, 'sine', .44);
      note(bus, nextBar + beat * 1.5, root + 12, beat * 3.1, .07 * pad, 'sine', .55);
      for (const pulse of accent) note(bus, nextBar + pulse * beat, root - 7, .17, .10, 'sine', .02);
      for (let step = 0; step < 4; step++) {
        const offset = melody[index * 4 + step];
        if (offset < 0) continue;
        const start = nextBar + step * beat;
        note(bus, start, tonic + offset, beat * 1.75, lead, 'pluck', .018);
        note(bus, start + beat / 2, tonic + offset, beat * 1.45, lead * .20, 'sine', .06);
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
      pluck = context.createPeriodicWave(
        new Float32Array(7), new Float32Array([0, 1, .29, .24, .12, .07, .035]),
      );
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
  if (enabled) note(master, context.currentTime, 81, .36, .14);
}
