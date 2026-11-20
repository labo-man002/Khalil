import './style.css';
import { chapter, exhibits, locations } from '../content/chapter.mjs';
import { evidence, evidenceTypes } from '../content/evidence.mjs';
import { currentBeats, newStory, transition } from '../engine/story.mjs';
import { loadSettings, loadStory, saveSettings, saveStory } from '../engine/save.mjs';
import { chime, setAudio } from '../render/audio.mjs';
import { cast, drawPortrait, drawScene } from '../render/art.mjs';
import { interpretationLabel, outcomes, summarize } from '../reflection/summary.mjs';

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
  if (!resume) {
    state = newStory();
    events = [];
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
  const toggle = dialog.querySelector('#sound');
  if (toggle) toggle.checked = false;
  const status = dialog.querySelector('#sound-status');
  if (status) status.textContent = 'الصوت ما خدمش في المتصفّح هذا.';
}

function stage(node, beat) {
  const spots = node.kind === 'explore' && !state.hotspot ? node.spots : [];
  return `<div class="stage" data-place="${node.place}">
    <canvas width="480" height="224" aria-hidden="true"></canvas>
    <div class="weather" aria-hidden="true"></div>
    <div class="stage-caption"><span class="map-pin" aria-hidden="true"></span>${locations[node.place]}</div>
    ${spots.map(spot => {
      const seen = state.inspected.includes(spot.id);
      return `<button class="spot" data-action="inspect" data-id="${spot.id}" style="--x:${spot.x}%;--y:${spot.y}%"
        ${seen ? 'disabled' : ''}><span aria-hidden="true">${seen ? '✓' : '+'}</span>${spot.label}</button>`;
    }).join('')}
    ${beat && state.hotspot ? `<span class="scene-speaker">${cast[beat.speaker][0]}</span>` : ''}
  </div>`;
}

function title() {
  return `<main class="title-screen">
    <canvas width="480" height="224" aria-hidden="true"></canvas><div class="title-weather weather" aria-hidden="true"></div>
    <div class="title-copy">
      <p class="english" lang="en" dir="ltr">Hidden Layers of Truth</p>
      <h1>طبقات الحقيقة</h1>
      <p class="chapter-name"><span></span> اللي ما تقالش</p>
      <p class="premise">تقرير تبدّل. كلمة دارت في الحومة. وسكات ما فهمتوش.</p>
      <div class="title-actions">
        ${state ? '<button class="primary" data-action="resume">نكمّل من وين وقفت</button>' : ''}
        <button class="${state ? '' : 'primary'}" data-action="start">نبدأ الحكاية</button>
        <button data-action="settings">الإعدادات</button>
        <button data-action="about">على الحكاية</button>
      </div>
      <p class="hint">إلمس العلامات ولا تنقّل بـ <bdi dir="ltr">Tab</bdi> وافتح بـ <bdi dir="ltr">Enter</bdi>.</p>
      ${notice ? `<p class="notice" role="status">${messages[notice]}</p>` : ''}
    </div>
  </main>`;
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
  return `<section class="story-panel dialogue" aria-labelledby="scene-title">
    <div class="speaker">
      <canvas width="48" height="48" aria-hidden="true"></canvas>
      <h1 tabindex="-1" id="scene-title">${cast[beat.speaker][0]}</h1>
    </div>
    <p class="line"><span id="animated-text" aria-hidden="true">${beat.text}</span><span class="sr-only">${beat.text}</span></p>
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
    <p class="line">${outcome.consequence}</p>
    <p>${summary.askedWitness
      ? state.actions.final === 'correct'
        ? 'آدم حضر التصحيح وقال قدّام المتطوّعين اللي كان يعرف بالتعديل. تفاصيل الإعانة بقات بيناتكم.'
        : 'آدم بعثلك شهادتو مكتوبة. خلّا لك القرار وين تستعملها.'
      : 'آدم خلّى الكلام للينا. كي تلاقَيتوا عند الباب، سلّم عليك من بعيد.'}
    ${state.actions.lead === 'records' && state.actions.final === 'correct' ? 'لينا زادت توقيت التعديل في الملحق من سجلّ الملف.' : ''}
    ${summary.passedRumor ? 'أمينة قالتلك اللي الميساج اللي دارتو قبل التثبّت مازال يتبعث.' : ''}</p>
    <div class="reflection">
      <h2>كي ترجع للي اخترتو</h2>
      <p><strong>أوّل سكوت.</strong> ${interpretationLabel(summary.opening)} · ${percent(summary.opening.confidence)}</p>
      <p>${summary.opening.interpretation === 'exclude'
      ? 'وقتها شفت قراءة الميساج والتصويرة. فكرة اللي قصدو ينحّيوك زادت على اللي ورّاتك التصويرة.'
      : 'وقتها التصويرة بيّنت شكون كان في القهوة. علاش آدم سكت توضّح بعد، كي فسّر خوفو في الحديث معاك.'}</p>
    <p><strong>قبل كشف الحساب.</strong> ${interpretationLabel(summary.before)} · ${percent(summary.before.confidence)}</p>
      <p><strong>بعد كشف الحساب.</strong> ${interpretationLabel(summary.after)} · ${percent(summary.after.confidence)}</p>
      <p class="hint">بين الحكمين قريت ${summary.added.map(id => evidence[id][1]).join('، ')}.</p>
      <p>${summary.update}</p>
      <p>${summary.passedRumor
        ? 'خلّيت أمينة تدوّر الكلام قبل ما يتثبّت المصدر. في الدفتر وقتها كان عندك كلام منقول، بلا تسجيل ولا نصّ.'
        : 'طلبت من أمينة ما تدوّرش الكلام. خليت باب التثبّت محلول قبل ما تعطي للرواية قوّة جديدة.'}</p>
      <p class="hint">هاذي قراءة لاختياراتك في الحكاية برك. شخصيّتك وإيمانك ما يتقاسوش باللعبة هاذي.</p>
    </div>
    <div class="toolbar"><button class="primary" data-action="start">نعاود نلعب</button>
      <button data-action="journal">نفتح الدفتر</button><button data-action="source">الآية والسياق</button></div>
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
    app.innerHTML = title();
    drawScene(app.querySelector('canvas'), 'street', 'title');
    app.querySelector(focus ?? 'h1')?.focus();
    return;
  }
  const node = chapter[state.sceneId];
  const beats = currentBeats(state);
  const beat = beats?.[state.beatIndex];
  const body = beat ? dialogue(beat, state.hotspot && state.beatIndex === beats.length - 1)
    : node.kind === 'explore' ? investigation(node) : node.kind === 'decision' ? decision(node) : finish();
  app.innerHTML = `<header class="top"><span class="brand">طبقات الحقيقة</span><div class="toolbar">
    <button data-action="journal">الدفتر <bdi>${state.evidence.length}</bdi></button>
    <button data-action="settings">الإعدادات</button><button data-action="menu">القائمة</button>
  </div></header><main class="game">${stage(node, beat)}${body}
  ${notice ? `<p class="notice" role="status">${messages[notice]}</p>` : ''}</main>`;
  animateStage(app.querySelector('.stage canvas'), node, beat, from);
  if (beat) {
    drawPortrait(app.querySelector('.speaker canvas'), beat.speaker, beat.mood);
    if (!settings.instantText && document.documentElement.dataset.still !== 'true') typeLine(beat.text);
  }
  let activeControl = '#scene-title';
  if (beat) activeControl = '[data-action="advance"]';
  else if (node.kind === 'explore') activeControl = '[data-action="inspect"]:not(:disabled)';
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
  openPanel('الإعدادات', `<div class="settings">
    <label><input type="checkbox" id="sound" ${settings.music ? 'checked' : ''}> الموسيقى والمؤثّرات</label>
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
  openPanel('الآية والسياق', `<blockquote lang="ar">﴿ٱجْتَنِبُوا۟ كَثِيرًۭا مِّنَ ٱلظَّنِّ إِنَّ بَعْضَ ٱلظَّنِّ إِثْمٌۭ﴾</blockquote>
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
    case 'close': dialog.close(); break;
    case 'settings': settingsPanel(); break;
    case 'journal': journal(); break;
    case 'source': source(); break;
    case 'about':
      openPanel('على الحكاية', '<p>إنت سامي، متطوّع في جمعيّة الجسر. دوّر في البلايص، اسمع للناس، وقارن الورق. اختيارك يبدّل شنوّة تعرف وشنوّة يصير.</p><p>الحفظ على المتصفّح هذا. <bdi dir="ltr">Tab</bdi> للتنقّل و<bdi dir="ltr">Enter</bdi> للاختيار.</p><button data-action="source">الآية والسياق</button>');
      break;
    case 'menu':
      openPanel('وقفنا الحكاية', '<p>تنجّم تكمّل من وين وقفت.</p><div class="toolbar"><button class="primary" data-action="close">نكمّل</button><button data-action="title">نرجع للعنوان</button><button data-action="start">نبدأ من اللّول</button></div>');
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
  const key = { sound: 'music', volume: 'volume', still: 'reducedMotion', instant: 'instantText' }[control.id];
  if (!key) return;
  settings = { ...settings, [key]: control.type === 'checkbox' ? control.checked : Number(control.value) };
  if (!saveSettings(storage, settings)) dialog.querySelector('#sound-status').textContent = messages.unsaved;
  updateMotion();
  if (key === 'music' || key === 'volume') syncSound();
});

updateMotion();
render();
