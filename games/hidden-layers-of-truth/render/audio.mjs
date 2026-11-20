let context;
let master;
let revision = 0;
let phrase;

function note(time, frequency, duration, volume, tone = 'sine', attack = 0.08) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = tone;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0, time);
  envelope.gain.linearRampToValueAtTime(volume, time + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(envelope).connect(master);
  oscillator.start(time);
  oscillator.stop(time + duration);
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
    }
    if (music) await context.resume();
    if (request !== revision) return true;
    master.gain.setTargetAtTime(music ? 0.52 * volume / 100 : 0, context.currentTime, 0.1);
    if (!music) {
      clearInterval(phrase);
      phrase = undefined;
    } else if (!phrase) {
      const play = () => {
        const start = context.currentTime + 0.015;
        for (const [offset, chord] of [[0, [110, 164.81, 261.63]], [4, [98, 146.83, 246.94]]]) {
          for (const frequency of chord) note(start + offset, frequency, 4.2, 0.17, 'sine', 0.32);
        }
        [329.63, 293.66, 261.63, 246.94, 293.66, 220].forEach((frequency, i) =>
          note(start + i * 1.18, frequency, 2.2, 0.31, 'triangle', 0.035));
      };
      play();
      phrase = setInterval(play, 8000);
    }
    return true;
  } catch {
    return request !== revision;
  }
}

export function chime() {
  if (context?.state === 'running' && phrase) note(context.currentTime, 440, 0.35, 0.1);
}
