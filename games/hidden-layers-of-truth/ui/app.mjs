import './style.css';
import { chapter, exhibits, locations } from '../content/chapter.mjs';
import { evidence, evidenceTypes } from '../content/evidence.mjs';
import { currentBeats, newStory, transition } from '../engine/story.mjs';
import { loadSettings, loadStory, saveSettings, saveStory } from '../engine/save.mjs';
import { chime, setAudio, setSceneMusic } from '../render/audio.mjs';
import { cast, drawPortrait, drawScene } from '../render/art.mjs';
import { caseRecap, interpretationLabel, outcomes, summarize } from '../reflection/summary.mjs';

const app = document.querySelector('#app');
const dialog = document.querySelector('#overlay');
const storage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
let { state, events, notice } = loadStory(storage);
let settings = loadSettings(storage);
let inGame = false;
let typing;
let previousFocus;
let walkFrame;

const messages = {
  old: 'الحفظ القديم ما يتقراش في النسخة هاذي. تنجّم تبدأ الحكاية من جديد.',
  invalid: 'الحفظ ما تقراش. تنجّم تبدأ من جديد.',
  unsaved: 'المتصفّح ما خلّاناش نحفظوا. تنجّم تلعب، أما التقدّم ينجم يضيع كي تسكّر الصفحة.',
};
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const percent = number => `<bdi dir="ltr">${number}%</bdi>`;

function updateMotion() {
  document.documentElement.dataset.still = settings.reducedMotion || systemMotion.matches;
  if (document.documentElement.dataset.still === 'true') finishTyping();
}

systemMotion.addEventListener('change', updateMotion);

function dispatch(event, focus) {
  const previous = state;
  const next = transition(state, event);
  if (next === state) return;
  if (next.evidence.length > state.evidence.length) chime();
  state = next;
  events.push(event);
  notice = saveStory(storage, events) ? null : 'unsaved';
  render(focus, event.type === 'inspect' ? previous : null);
}

function start(resume) {
  if (!resume || state.sceneId === 'opening') {
    // The title is the opening shot. Keep its original events for existing saves.
    events = [{ type: 'advance' }, { type: 'advance' }];
    state = events.reduce(transition, newStory());
    notice = saveStory(storage, events) ? null : 'unsaved';
  }
  inGame = true;
  syncSound();
  render();
}

async function syncSound() {
  if (await setAudio(settings)) return;
  settings = { ...settings, music: false };
  saveSettings(storage, settings);
  updateSoundButton();
  const status = dialog.querySelector('#sound-status');
  if (status) status.textContent = 'الصوت ما خدمش في المتصفّح هذا.';
}

function stage(node) {
  const spots = node.kind === 'explore' && !state.hotspot ? node.spots : [];
  return `<div class="stage" data-place="${node.place}">
    <canvas width="480" height="224" aria-hidden="true"></canvas>
    <div class="weather" aria-hidden="true"></div>
    <div class="stage-caption"><span class="map-pin" aria-hidden="true"></span>${locations[node.place]}</div>
    ${spots.map(spot => {
      const seen = state.inspected.includes(spot.id);
      return `<button class="spot${state.sceneId === 'intro' && !state.inspected.includes('phone') && spot.id === 'phone' ? ' first-clue' : ''}" data-action="inspect" data-id="${spot.id}" style="--x:${spot.x}%;--y:${spot.y}%"
        ${seen ? 'disabled' : ''}><span aria-hidden="true">${seen ? '✓' : '+'}</span>${spot.label}</button>`;
    }).join('')}
  </div>`;
}

function soundButton() {
  return `<button data-action="sound" class="sound-toggle" aria-label="الموسيقى" aria-pressed="${settings.music}">
    <span aria-hidden="true">♫</span><span data-sound-label>${settings.music ? 'الموسيقى شاعلة' : 'الموسيقى طافية'}</span>
  </button>`;
}

function updateSoundButton() {
  const button = app.querySelector('[data-action="sound"]');
  button.setAttribute('aria-pressed', settings.music);
  button.querySelector('[data-sound-label]').textContent = settings.music ? 'الموسيقى شاعلة' : 'الموسيقى طافية';
}

function chapterMenu() {
  const finished = state && chapter[state.sceneId].kind === 'end';
  const action = !state ? 'start' : 'resume';
  const label = !state ? 'نلعب الفصل' : finished ? 'نشوف النهاية' : 'نكمّل من وين وقفت';
  return `<main class="game chapter-menu">
    <div class="stage chapter-stage" data-place="street">
      <canvas width="480" height="224" aria-hidden="true"></canvas>
      <div class="weather" aria-hidden="true"></div>
      <p class="stage-caption"><span class="map-pin" aria-hidden="true"></span>قدّام قهوة الحومة</p>
    </div>
    <section class="story-panel chapters" aria-labelledby="chapters-title">
      <h1 id="chapters-title">الفصول</h1>
      <article class="chapter-card">
        <div><p class="label">الفصل اللّول</p><h2>اللّي ما تقالش</h2><p>إنت سامي. قبل ما تبعث حساب التبرّعات، لينا تطلب منك تتثبّت في رقم.</p></div>
        <div class="toolbar chapter-actions">
          <button class="primary" data-action="${action}">${label}</button>
          ${state ? '<button data-action="start">نعاود الفصل</button>' : ''}
        </div>
      </article>
    </section>
    ${notice ? `<p class="notice" role="status">${messages[notice]}</p>` : ''}
  </main>`;
}

function gameHeader() {
  return `<header class="top"><span class="brand">طبقات الحقيقة</span><div class="toolbar">
    ${soundButton()}${inGame ? `<button data-action="journal">الدفتر <bdi>${state.evidence.length}</bdi></button>` : ''}
    <button data-action="settings">الضبط</button>
    <button data-action="${inGame ? 'menu' : 'about'}">${inGame ? 'القائمة' : 'على الحكاية'}</button>
  </div></header>`;
}

function exhibit() {
  const entry = state.sceneId === 'intro' ? exhibits[state.hotspot] :
    state.sceneId === 'archive' || state.sceneId === 'proof' ? exhibits[state.hotspot] : null;
  if (!entry) return '';
  const [name, ...rows] = entry;
  return `<aside class="exhibit"><h3>${name}</h3><dl>${rows.map(([key, value]) =>
    `<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl></aside>`;
}

function dialogue(beat, closing) {
  const [name, , , , role, accent] = cast[beat.speaker];
  const byMessage = state.sceneId === 'intro' && state.hotspot === 'inbox' && beat.speaker === 'lina';
  return `<section class="story-panel dialogue" aria-labelledby="scene-title" style="--speaker-accent:${accent}">
    <div class="speaker" data-speaker="${beat.speaker}" aria-live="polite" aria-atomic="true">
      <canvas width="48" height="48" aria-hidden="true"></canvas>
      <div><h1 tabindex="-1" id="scene-title">${name}</h1><p>${byMessage ? 'ميساج من لينا' : role}</p></div>
    </div>
    <p class="line speech"><span id="animated-text" aria-hidden="true">${beat.text}</span><span class="sr-only">${beat.text}</span></p>
    ${exhibit()}
    <button class="primary next" data-action="advance">${closing ? 'نسكّر' : 'نكمل'} <span aria-hidden="true">←</span></button>
  </section>`;
}

function investigation(node) {
  const ready = node.required.every(id => state.inspected.includes(id));
  return `<section class="story-panel">
    <h1 class="sr-only" id="scene-title" tabindex="-1">${locations[node.place]}</h1>
    <p class="line">${node.prompt}</p>
    ${node.next ? `<button class="primary next" data-action="leave" ${ready ? '' : 'disabled'}>${node.exit} <span aria-hidden="true">←</span></button>` : ''}
  </section>`;
}

function decision(node) {
  const before = state.sceneId === 'revision' ? state.judgments.find(entry => entry.sceneId === 'money') : null;
  return `<section class="story-panel">
    ${before ? `<p class="earlier"><strong>اللي خمّمتو قبل الكشف</strong> ${interpretationLabel(before)} · ${percent(before.confidence)}</p>` : ''}
    <h1 id="scene-title" tabindex="-1">${node.prompt}</h1>
    <form id="decision"><fieldset><legend class="sr-only">اختيارك</legend>
      ${node.options.map(choice => `<label class="choice"><input type="radio" name="choice" value="${choice.id}" required><span>${choice.label}</span></label>`).join('')}
    </fieldset>
    ${node.proposition ? `<div class="confidence"><label for="confidence">قدّاش واثق في رايك؟</label>
      <input type="range" name="confidence" id="confidence" min="0" max="100" value="50" dir="ltr">
      <output for="confidence" dir="ltr">50%</output></div>` : ''}
    <button type="submit" class="primary next">نثبّت ونكمّل <span aria-hidden="true">←</span></button></form>
  </section>`;
}

function finish() {
  const outcome = outcomes[state.actions.final];
  const summary = summarize(state);
  return `<section class="story-panel ending">
    <p class="label">نهاية الفصل</p>
    <h1 id="scene-title" tabindex="-1">${outcome.title}</h1>
    <section class="case-recap" aria-labelledby="case-title">
      <h2 id="case-title">شنوّة صار بالحقّ؟</h2>
      <dl>${caseRecap.map(([question, answer]) => `<div><dt>${question}</dt><dd>${answer}</dd></div>`).join('')}</dl>
    </section>
    <section class="case-recap" aria-labelledby="outcome-title">
      <h2 id="outcome-title">شنوّة تبدّل باختيارك؟</h2>
      <p>${outcome.consequence}</p>
      <p>${summary.askedWitness
        ? state.actions.final === 'correct'
          ? 'آدم شهد قدّام الناس اللي كان يعرف بالتبديل. حكاية خوّه بقات بيناتكم.'
          : 'آدم بعثلك كلامو مكتوب. خلّى لك القرار وين تستعملو.'
        : 'التصحيح بقى على لينا. آدم سلّم عليك من بعيد.'}
      ${state.actions.lead === 'records' && state.actions.final === 'correct' ? 'لينا زادت في الورقة وقتاش تبدّل الملفّ.' : ''}
      ${summary.passedRumor ? 'أمينة قالتلك اللي الكلام اللي عاودتو مازال يدور.' : ''}</p>
    </section>
    <section class="reflection" aria-labelledby="reflection-title">
      <h2 id="reflection-title">شنوّة تنجّم تتعلّم من اختياراتك؟</h2>
      <div class="feedback">
        <h3>كي آدم ما جاوبكش</h3>
        <p class="hint">${interpretationLabel(summary.opening)} · ${percent(summary.opening.confidence)}</p>
        <p>${summary.openingFeedback}</p>
      </div>
      <div class="feedback">
        <h3>كي فتّشت على الفلوس</h3>
        <p>${summary.leadFeedback}</p>
        <p class="hint">قبل كشف البنك <strong>${percent(summary.before.confidence)}</strong> · ${interpretationLabel(summary.before)}<br>
          بعد كشف البنك <strong>${percent(summary.after.confidence)}</strong> · ${interpretationLabel(summary.after)}</p>
        <p>${summary.update}</p>
      </div>
      <div class="feedback">
        <h3>كي أمينة جابتلك الكلام</h3>
        <p>${summary.rumorFeedback}</p>
      </div>
      <p class="hint">الكلام هذا على اختياراتك في الحكاية برك.</p>
    </section>
    <div class="toolbar"><button class="primary" data-action="start">نعاود نلعب</button>
      <button data-action="journal">نفتح الدفتر</button><button data-action="source">على الآية</button></div>
  </section>`;
}

function position(node, current) {
  const spot = node.spots?.find(item => item.id === (current.hotspot ?? current.inspected.at(-1)));
  return spot ? Math.round(spot.x * 4.8) : node.place === 'room' ? 249 : 145;
}

function animateStage(canvas, node, beat, from) {
  const to = position(node, state);
  const paint = x => drawScene(canvas, node.place, state.sceneId, beat?.speaker, x);
  const previous = from ? position(node, from) : to;
  if (previous === to || document.documentElement.dataset.still === 'true') {
    paint(to);
    return;
  }
  const start = performance.now();
  function step(now) {
    const elapsed = Math.min((now - start) / 350, 1);
    paint(Math.round(previous + (to - previous) * elapsed));
    if (elapsed < 1) walkFrame = requestAnimationFrame(step);
  }
  paint(previous);
  walkFrame = requestAnimationFrame(step);
}

function render(focus, from) {
  finishTyping();
  cancelAnimationFrame(walkFrame);
  if (!inGame) {
    setSceneMusic('street');
    app.innerHTML = gameHeader() + chapterMenu();
    drawScene(app.querySelector('canvas'), 'street', 'title');
    if (focus) app.querySelector(focus)?.focus();
    return;
  }
  const node = chapter[state.sceneId];
  setSceneMusic(node.kind === 'end' ? 'end' : node.place);
  const beats = currentBeats(state);
  const beat = beats?.[state.beatIndex];
  const body = beat ? dialogue(beat, state.hotspot && state.beatIndex === beats.length - 1)
    : node.kind === 'explore' ? investigation(node) : node.kind === 'decision' ? decision(node) : finish();
  app.innerHTML = gameHeader() + `<main class="game">${stage(node)}${body}
  ${notice ? `<p class="notice" role="status">${messages[notice]}</p>` : ''}</main>`;
  animateStage(app.querySelector('.stage canvas'), node, beat, from);
  if (beat) {
    drawPortrait(app.querySelector('.speaker canvas'), beat.speaker, beat.mood);
    if (!settings.instantText && document.documentElement.dataset.still !== 'true') typeLine(beat.text);
  }
  let activeControl = '#scene-title';
  if (beat) activeControl = '[data-action="advance"]';
  else if (node.kind === 'explore') activeControl = app.querySelector('.first-clue') ? '.first-clue' : '[data-action="inspect"]:not(:disabled)';
  const target = (focus ? app.querySelector(focus) : null) ?? app.querySelector(activeControl) ?? app.querySelector('#scene-title');
  target?.focus({ preventScroll: true });
  const bounds = target?.getBoundingClientRect();
  if (bounds && (bounds.top < 0 || bounds.bottom > innerHeight)) target.scrollIntoView({ block: 'nearest' });
}

function typeLine(text) {
  const target = app.querySelector('#animated-text');
  const start = performance.now();
  typing = { target, text, frame: 0 };
  function step(now) {
    const count = Math.floor((now - start) / 16);
    target.textContent = text.slice(0, count);
    if (count < text.length) typing.frame = requestAnimationFrame(step);
    else typing = undefined;
  }
  target.textContent = '';
  typing.frame = requestAnimationFrame(step);
}

function finishTyping() {
  if (!typing) return false;
  cancelAnimationFrame(typing.frame);
  typing.target.textContent = typing.text;
  typing = undefined;
  return true;
}

function openPanel(name, contents) {
  finishTyping();
  if (!dialog.open) previousFocus = document.activeElement;
  dialog.innerHTML = `<header class="panel-header"><h2 id="overlay-title">${name}</h2>
    <button data-action="close" autofocus>نسكّر <span aria-hidden="true">×</span></button></header>${contents}`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('[data-action="close"]').focus();
}

dialog.addEventListener('close', () => previousFocus?.isConnected && previousFocus.focus());

function settingsPanel() {
  openPanel('الضبط', `<div class="settings">
    <div class="confidence"><label for="volume">قوّة الصوت</label>
      <input type="range" id="volume" min="0" max="100" dir="ltr" value="${settings.volume}">
      <output for="volume" dir="ltr">${settings.volume}%</output></div>
    <p class="hint" role="status" id="sound-status"></p>
    <label><input type="checkbox" id="still" ${settings.reducedMotion ? 'checked' : ''}> نقص الحركة</label>
    <label><input type="checkbox" id="instant" ${settings.instantText ? 'checked' : ''}> ورّيني الحوار كامل على طول</label>
  </div>`);
}

function journal() {
  const cards = state.evidence.map(id => {
    const [type, title, source, description, question] = evidence[id];
    return `<article class="evidence-card" data-evidence="${id}" data-kind="${type}"><p class="label">${evidenceTypes[type]}</p>
      <h3>${title}</h3><p class="hint">${source}</p><p>${description}</p><p class="open-question">${question}</p></article>`;
  });
  const judgments = state.judgments.map(event =>
    `<li>${event.revisedFrom ? '<strong>مراجعة بعد الكشف </strong>' : ''}${interpretationLabel(event)} · ${percent(event.confidence)}
    <small>وقتها شفت ${event.evidence.map(id => evidence[id][1]).join('، ')}.</small></li>`);
  openPanel('دفتر سامي', `${cards.join('') || '<p>الدفتر مازال فارغ. تفقد البلاصة واحكي مع الناس.</p>'}
    ${judgments.length ? `<h3>أحكامي والثقة فيها</h3><ol class="judgments">${judgments.join('')}</ol>` : ''}`);
}

function source() {
  openPanel('على الآية', `<blockquote lang="ar">﴿ٱجْتَنِبُوا۟ كَثِيرًۭا مِّنَ ٱلظَّنِّ إِنَّ بَعْضَ ٱلظَّنِّ إِثْمٌۭ﴾</blockquote>
    <p>مقتطف من سورة الحجرات، الآية <bdi dir="ltr">49:12</bdi>.</p>
    <p>الحكاية تخلّيك تتأمّل في الفرق بين الحذر، والحكم على النيّة، والكلام اللي يتنقل على الناس.</p>
    <p><a href="https://quran.com/ar/49/12" target="_blank" rel="noopener noreferrer">نقرا الآية كاملة والسياق</a></p>`);
}

function confirmRestart() {
  openPanel('نرجعوا من اللّول؟', '<p>التقدّم والاختيارات في الجولة هاذي يتبدّلوا بحفظ جديد.</p><button class="primary" data-action="restart">إي، نبدأ جولة جديدة</button>');
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  switch (control.dataset.action) {
    case 'start':
      if (state) confirmRestart();
      else start(false);
      break;
    case 'restart':
      dialog.close();
      start(false);
      break;
    case 'resume': start(true); break;
    case 'sound':
      settings = { ...settings, music: !settings.music };
      saveSettings(storage, settings);
      updateSoundButton();
      syncSound();
      break;
    case 'close': dialog.close(); break;
    case 'settings': settingsPanel(); break;
    case 'journal': journal(); break;
    case 'source': source(); break;
    case 'about':
      openPanel('على الحكاية', '<p>إنت سامي، متطوّع في جمعيّة الجسر. دوّر في البلايص، اسمع للناس، وقارن الورق. اختيارك يبدّل شنوّة تعرف وشنوّة يصير.</p><p>الحفظ على المتصفّح هذا. <bdi dir="ltr">Tab</bdi> للتنقّل و<bdi dir="ltr">Enter</bdi> للاختيار.</p><button data-action="source">على الآية</button>');
      break;
    case 'menu':
      openPanel('وقفنا الحكاية', '<p>تنجّم تكمّل من وين وقفت.</p><div class="toolbar"><button class="primary" data-action="close">نكمّل</button><button data-action="title">نرجع للفصول</button><button data-action="start">نبدأ من اللّول</button></div>');
      break;
    case 'title':
      dialog.close();
      inGame = false;
      render('[data-action="resume"]');
      break;
    case 'inspect': dispatch({ type: 'inspect', id: control.dataset.id }, '[data-action="advance"]'); break;
    case 'advance':
      if (!finishTyping()) {
        const leavingDialogue = state.beatIndex + 1 === currentBeats(state).length;
        const previousHotspot = state.hotspot;
        dispatch({ type: 'advance' }, leavingDialogue && previousHotspot
          ? '[data-action="inspect"]:not(:disabled), [data-action="leave"]:not(:disabled)' : undefined);
      }
      break;
    case 'leave': dispatch({ type: 'leave' }); break;
  }
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'decision') return;
  event.preventDefault();
  const form = new FormData(event.target);
  const choice = { type: 'choose', id: form.get('choice') };
  if (form.has('confidence')) choice.confidence = Number(form.get('confidence'));
  dispatch(choice);
});

document.addEventListener('input', event => {
  const control = event.target;
  if (control.type === 'range') control.parentElement.querySelector('output').textContent = `${control.value}%`;
  const key = { volume: 'volume', still: 'reducedMotion', instant: 'instantText' }[control.id];
  if (!key) return;
  settings = { ...settings, [key]: control.type === 'checkbox' ? control.checked : Number(control.value) };
  if (!saveSettings(storage, settings)) dialog.querySelector('#sound-status').textContent = messages.unsaved;
  updateMotion();
  if (key === 'volume') syncSound();
});

updateMotion();
render();
