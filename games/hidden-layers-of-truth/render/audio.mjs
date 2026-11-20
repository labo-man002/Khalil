let context;
let master;
let revision = 0;
let phrase;

function note(time, frequency, duration, volume) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0, time);
  envelope.gain.linearRampToValueAtTime(volume, time + 0.08);
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
      for (const frequency of [55, 82.41]) {
        const voice = context.createOscillator();
        const gain = context.createGain();
        voice.frequency.value = frequency;
        gain.gain.value = 0.11;
        voice.connect(gain).connect(master);
        voice.start();
      }
    }
    if (music) await context.resume();
    if (request !== revision) return true;
    master.gain.setTargetAtTime(music ? 0.19 * volume / 100 : 0, context.currentTime, 0.1);
    if (!music) {
      clearInterval(phrase);
      phrase = undefined;
    } else if (!phrase) {
      const play = () => {
        [220, 164.81, 196, 146.83].forEach((frequency, i) =>
          note(context.currentTime + i * 0.8, frequency, 2.8, 0.13));
      };
      play();
      phrase = setInterval(play, 6900);
    }
    return true;
  } catch {
    return request !== revision;
  }
}

export function chime() {
  if (context?.state === 'running' && phrase) note(context.currentTime, 440, 0.35, 0.1);
}
