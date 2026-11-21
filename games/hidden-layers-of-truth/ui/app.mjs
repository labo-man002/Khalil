import './style.css';
import { chapter, decisionStakes, decisionTradeoffs, exhibits, locations, messagesOnPhone, musicCue, sceneTransitions } from '../content/chapter.mjs';
import { evidence, evidenceTypes } from '../content/evidence.mjs';
import { currentBeats, newStory, transition } from '../engine/story.mjs';
import { loadSettings, loadStory, saveSettings, saveStory } from '../engine/save.mjs';
import { chime, phoneBuzz, setAudio, setSceneMusic } from '../render/audio.mjs';
import { cast, drawPortrait, drawScene } from '../render/art.mjs';
import { caseRecap, interpretationLabel, outcomes, summarize } from '../reflection/summary.mjs';

const app = document.querySelector('#app');
const dialog = document.querySelector('#overlay');
const announcement = document.querySelector('#scene-announcement');
const storage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
let { state, events, notice } = loadStory(storage);
if (notice === 'old') notice = null;
let settings = loadSettings(storage);
let view = 'splash';
let typing;
let previousFocus;
let walkFrame;

const messages = {
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
  if (previous.sceneId === 'opening' && next.sceneId === 'intro') phoneBuzz();
  else if (next.evidence.length > state.evidence.length) chime();
  state = next;
  events.push(event);
  notice = saveStory(storage, events) ? null : 'unsaved';
  render(focus, event.type === 'inspect' || (previous.sceneId === 'opening' && next.sceneId === 'intro') ? previous : null);
}

function start(resume) {
  if (!resume) {
    events = [];
    state = newStory();
    notice = saveStory(storage, events) ? null : 'unsaved';
  }
  view = 'game';
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
    <div class="stage-caption"><span class="map-pin" aria-hidden="true"></span>${sceneTransitions[state.sceneId] ?? locations[node.place]}</div>
    ${spots.length ? `<div class="stage-actions" role="group" aria-label="شنوّة تنجّم تشوف">` : ''}
    ${spots.map(spot => {
      const seen = state.inspected.includes(spot.id);
      const required = node.required.includes(spot.id);
      return `<button class="spot${state.sceneId === 'intro' && !state.inspected.includes('phone') && spot.id === 'phone' ? ' first-clue' : ''}"
        data-action="inspect" data-id="${spot.id}" data-required="${required}" style="--x:${spot.x}%;--y:${spot.y}%"
        aria-label="${spot.label}${seen ? '، تفرّجت فيها' : required ? '، لازم تشوفها باش تكمّل' : ''}"
        ${seen ? 'disabled' : ''}><span aria-hidden="true">${seen ? '✓' : required ? '◆' : '+'}</span>${spot.label}</button>`;
    }).join('')}
    ${spots.length ? '</div>' : ''}
  </div>`;
}

function soundButton() {
  return `<button data-action="sound" class="sound-toggle" aria-pressed="${settings.music}">
    <span class="sound-indicator" aria-hidden="true">♫</span>الصوت
  </button>`;
}

function updateSoundButton() {
  const button = app.querySelector('[data-action="sound"]');
  if (!button) return;
  button.setAttribute('aria-pressed', settings.music);
}

function splash() {
  return `<main class="splash" aria-labelledby="game-title">
    <canvas width="480" height="224" aria-hidden="true"></canvas>
    <div class="splash-halo" aria-hidden="true"></div>
    <div class="splash-rain" aria-hidden="true">${Array.from({ length: 30 }, (_, i) => {
      const x = (i * 37 + 11) % 100;
      const delay = (i * 173) % 1750;
      return `<i style="--x:${x}%;--delay:-${delay}ms;--speed:${920 + (i % 5) * 190}ms"></i>`;
    }).join('')}</div>
    <div class="splash-audio">${soundButton()}</div>
    <div class="splash-menu">
      <p class="splash-series" lang="en" dir="ltr">Hidden Layers of Truth</p>
      <h1 id="game-title">بين <span>السطور</span></h1>
      <button class="primary splash-start" data-action="enter">إبدا</button>
    </div>
  </main>`;
}

function chapterMenu() {
  const current = state ? chapter[state.sceneId] : null;
  const finished = current?.kind === 'end';
  const action = state ? 'resume' : 'start';
  const label = finished ? 'نشوف النهاية' : state ? 'نكمّل اللعب' : 'نلعب الفصل';
  const progress = finished ? 'كمّلت الفصل' : current ? `وقفت في ${locations[current.place]}` : '';
  return `<main class="game chapter-menu" aria-labelledby="chapters-title">
    <div class="chapters-heading">
      <h1 id="chapters-title">الفصول</h1>
      <button class="chapter-back" data-action="splash">نرجع للبداية</button>
    </div>
    <article class="chapter-card" aria-labelledby="chapter-one-title">
      <div class="chapter-stage" aria-hidden="true">
        <canvas width="480" height="224"></canvas>
      </div>
      <div class="chapter-details">
        <p class="label">الفصل اللّول</p>
        <h2 id="chapter-one-title">اللّي ما تقالش</h2>
        <p class="chapter-description">بعثت ميساج لآدم باش يراجع حساب التبرّعات. قراه وما جاوبش. قبل ما تبعث التقرير، لينا تقلك تستنّى.</p>
        ${progress ? `<p class="chapter-progress">${progress}</p>` : ''}
        <div class="toolbar chapter-actions">
          <button class="primary" data-action="${action}">${label}</button>
          ${state ? '<button data-action="start">نعاود من اللّول</button>' : ''}
        </div>
      </div>
    </article>
    ${notice ? `<p class="notice" role="status">${messages[notice]}</p>` : ''}
  </main>`;
}

function gameHeader() {
  const inGame = view === 'game';
  return `<header class="top"><span class="brand">بين السطور</span><div class="toolbar">
    ${soundButton()}${inGame ? `<button data-action="journal">الدفتر <bdi>${state.evidence.length}</bdi></button>` : ''}
    <button data-action="settings">الضبط</button>
    <button data-action="${inGame ? 'menu' : 'about'}">${inGame ? 'القائمة' : 'على الحكاية'}</button>
  </div></header>`;
}

function exhibit() {
  const entry = ['archive', 'proof'].includes(state.sceneId) ? exhibits[state.hotspot] : null;
  if (!entry) return '';
  const [name, ...rows] = entry;
  return `<aside class="exhibit"><h3>${name}</h3><dl>${rows.map(([key, value]) =>
    `<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl></aside>`;
}

function phoneScreen(beat) {
  if (state.sceneId !== 'intro') return '';
  const first = state.beatIndex === 0;
  if (state.hotspot === 'phone') {
    const content = first
      ? `<p class="chat-bubble sent">${messagesOnPhone.adam}</p><p class="chat-status">قراه · <bdi>٢١:١٤</bdi></p>`
      : '<figure class="phone-story"><canvas width="480" height="224" aria-hidden="true"></canvas><figcaption>ستوري آدم مع يوسف في قهوة سي الطاهر</figcaption></figure>';
    return `<aside class="phone-screen"><h2>آدم</h2>${content}</aside>`;
  }
  if (state.hotspot !== 'inbox') return '';
  return `<aside class="phone-screen"><h2>لينا <bdi class="chat-time">٢٣:٥١</bdi></h2>
    ${first ? `<div class="chat-bubble incoming">${storyLine(beat.text)}</div>` : `<p class="chat-bubble sent">علاش؟</p>
    <div class="chat-typing" aria-hidden="true"><i></i><i></i><i></i></div>`}</aside>`;
}

function dialogue(beat, closing) {
  const [name, , , , role, accent] = cast[beat.speaker];
  const byMessage = state.sceneId === 'intro' && state.hotspot === 'inbox' && beat.speaker === 'lina';
  return `<section class="story-panel dialogue" aria-labelledby="scene-title" style="--speaker-accent:${accent}">
    <div class="dialogue-copy" tabindex="0" role="region" aria-labelledby="scene-title">
    <div class="speaker" data-speaker="${beat.speaker}">
      <canvas width="48" height="48" aria-hidden="true"></canvas>
      <div><h1 tabindex="-1" id="scene-title">${name}</h1><p>${byMessage ? 'ميساج من لينا' : role}</p></div>
    </div>
    ${phoneScreen(beat)}
    ${byMessage ? '' : storyLine(beat.text)}
    ${exhibit()}
    </div>
    <footer class="dialogue-actions"><button class="primary" data-action="advance">${closing ? 'نسكّر' : state.hotspot === 'phone' ? 'نشوف الستوري' : 'نكمل'} <span aria-hidden="true">←</span></button></footer>
  </section>`;
}

function storyLine(text) {
  return `<p class="line speech"><span id="animated-text" aria-hidden="true">${text}</span>
    <span class="line-size" aria-hidden="true">${text}</span><span class="sr-only">${text}</span></p>`;
}

function prologue(beat) {
  return `<section class="prologue" aria-labelledby="prologue-title">
    <div class="prologue-copy">
      <p class="label">نهار الخميس في الليل</p>
      <h1 id="prologue-title">أنا سامي</h1>
      ${storyLine(beat.text)}
    </div>
    <div class="toolbar prologue-actions">
      <button class="primary" data-action="advance">${state.beatIndex === 0 ? 'نكمل' : 'ندخل للدار'}</button>
      <button data-action="skip-opening">نتعدّى للّعب</button>
    </div>
  </section>`;
}

function investigation(node) {
  const remaining = node.spots.filter(spot => node.required.includes(spot.id) && !state.inspected.includes(spot.id));
  const ready = remaining.length === 0;
  return `<section class="story-panel">
    <h1 class="sr-only" id="scene-title" tabindex="-1">${locations[node.place]}</h1>
    <p class="line">${node.prompt}</p>
    ${ready ? '' : `<p class="investigation-progress" id="investigation-progress"><span aria-hidden="true">◆</span>
      مازال يلزمك تشوف ${remaining.map(spot => spot.label).join('، ')}.</p>`}
    ${node.next ? `<button class="primary next" data-action="leave" ${ready ? '' : 'disabled aria-describedby="investigation-progress"'}>${node.exit} <span aria-hidden="true">←</span></button>` : ''}
  </section>`;
}

function decision(node) {
  const before = state.sceneId === 'revision' ? state.judgments.find(entry => entry.sceneId === 'money') : null;
  return `<section class="story-panel">
    ${before ? `<p class="earlier"><strong>اللي خمّمتو قبل الكشف</strong> ${interpretationLabel(before)} · ${percent(before.confidence)}</p>` : ''}
    <h1 id="scene-title" tabindex="-1">${node.prompt}</h1>
    ${decisionStakes[state.sceneId] ? `<p class="stakes">${decisionStakes[state.sceneId]}</p>` : ''}
    <form id="decision"><fieldset><legend class="sr-only">اختيارك</legend>
      ${node.options.map(choice => `<label class="choice"><input type="radio" name="choice" value="${choice.id}" required><span>${choice.label}${decisionTradeoffs[state.sceneId]?.[choice.id]
        ? `<small class="tradeoff">${decisionTradeoffs[state.sceneId][choice.id]}</small>` : ''}</span></label>`).join('')}
    </fieldset>
    ${node.proposition ? `<div class="confidence"><label for="confidence">قدّاش واثق في رايك؟</label>
      <input type="range" name="confidence" id="confidence" min="0" max="100" value="50" dir="ltr">
      <output for="confidence" dir="ltr">50%</output></div>` : ''}
    <button type="submit" class="primary next">نثبّت ونكمّل <span aria-hidden="true">←</span></button></form>
  </section>`;
}

function messageMirror(opening) {
  const reply = chapter.mirror.options.find(choice => choice.id === state.actions.mirror);
  return `<section class="message-mirror" aria-labelledby="mirror-title">
    <h2 id="mirror-title">قرا الميساج وما جاوبش</h2>
    <div class="mirror-messages">
      <article class="phone-screen">
        <h3>من سامي لآدم</h3>
        <p class="chat-bubble">${messagesOnPhone.adam}</p>
        <p class="chat-status">آدم قراه وما جاوبش</p>
        <p class="mirror-response"><strong>شنوّة خمّمت وقتها</strong>${interpretationLabel(opening)}</p>
      </article>
      <article class="phone-screen">
        <h3>من مريم لسامي</h3>
        <p class="chat-bubble">${messagesOnPhone.maryam}</p>
        <p class="chat-status">سامي قراه وما جاوبش</p>
        <p class="mirror-response"><strong>شنوّة قلت لمريم</strong>${reply.label}</p>
      </article>
    </div>
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
    <section class="pattern-recap" aria-labelledby="pattern-title">
      <h2 id="pattern-title">شنوّة تكرّر في اختياراتك؟</h2>
      <dl>${summary.patterns.map(([label, example]) => `<div><dt>${label}</dt><dd>${example}</dd></div>`).join('')}</dl>
    </section>
    ${messageMirror(summary.opening)}
    <section class="lesson" aria-labelledby="lesson-title">
      <h2 id="lesson-title">العبرة من الحكاية</h2>
      ${verse()}
      <p>آدم قرا وما جاوبش، وسامي عمل نفس الشي مع مريم. في المرّتين شفنا نفس الحركة، والأسباب كانت مختلفة. تنجّم تقول «ما جاوبنيش» وتواجه المشكلة، وتستنّى قبل ما تقول «تعمّد يضرّني». وزادة كي يتصلّح غلطة في التقرير، ردّ بالك الكلام على شكون غلط ما يدورش قبل التثبّت.</p>
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
  const sceneId = state.sceneId;
  const portrait = beat ? app.querySelector('.speaker canvas') : null;
  const paint = (x, motion = 0, stride = 0, sceneTime = 0) => {
    drawScene(canvas, node.place, sceneId, beat?.speaker, x, motion, stride, sceneTime);
    if (portrait) drawPortrait(portrait, beat.speaker, beat.mood, motion);
  };
  const previous = from?.sceneId === 'opening' ? 45 : from ? position(node, from) : to;
  const hasAtmosphere = ['room', 'street', 'cafe'].includes(node.place) || ['morning', 'challenge', 'clarify', 'wait'].includes(sceneId);
  if (document.documentElement.dataset.still === 'true' || (!beat && previous === to && !hasAtmosphere)) {
    paint(to, 0, 0, sceneId === 'wait' ? 1500 : 0);
    return;
  }
  const start = performance.now();
  let lastFrame = -1;
  function step(now) {
    const elapsed = now - start;
    if (document.documentElement.dataset.still === 'true') {
      paint(to);
      return;
    }
    const frame = Math.floor(elapsed / 85);
    const walking = Math.min(elapsed / 420, 1);
    if (frame !== lastFrame) {
      lastFrame = frame;
      const talking = beat && elapsed < Math.min(3400, Math.max(1050, beat.text.length * 22));
      const stride = previous !== to && walking < 1 ? [0, 3, 0, -3][frame % 4] : 0;
      paint(Math.round(previous + (to - previous) * walking), talking ? frame + 1 : 0, stride, elapsed);
      if (walking === 1 && !talking && !hasAtmosphere) return;
    }
    walkFrame = requestAnimationFrame(step);
  }
  paint(previous);
  walkFrame = requestAnimationFrame(step);
}

function render(focus, from) {
  finishTyping();
  cancelAnimationFrame(walkFrame);
  if (view !== 'game') {
    document.body.classList.remove('playing');
    announcement.textContent = '';
    setSceneMusic(view === 'splash' ? 'title' : 'street');
    app.innerHTML = view === 'splash' ? splash() : gameHeader() + chapterMenu();
    const cover = app.querySelector('canvas');
    if (view === 'splash') drawScene(cover, 'street', 'splash', undefined, 205);
    else drawScene(cover, 'room', 'chapters');
    const target = focus ?? (view === 'splash' ? '[data-action="enter"]' : '.chapter-actions .primary');
    app.querySelector(target)?.focus({ preventScroll: true });
    return;
  }
  const node = chapter[state.sceneId];
  document.body.classList.add('playing');
  const opening = state.sceneId === 'opening';
  setSceneMusic(opening ? 'title' : musicCue(state), node.place);
  const beats = currentBeats(state);
  const beat = beats?.[state.beatIndex];
  const body = opening ? prologue(beat)
    : beat ? dialogue(beat, state.hotspot && state.beatIndex === beats.length - 1)
    : node.kind === 'explore' ? investigation(node) : node.kind === 'decision' ? decision(node) : finish();
  app.innerHTML = gameHeader() + `<main class="game play-layout${opening ? ' opening-layout' : ''}">${stage(node)}
    <div class="play-panel">${body}${notice ? `<p class="notice" role="status">${messages[notice]}</p>` : ''}</div>
  </main>`;
  announcement.textContent = beat ? `${cast[beat.speaker][0]}. ${beat.text}` : '';
  animateStage(app.querySelector('.stage canvas'), node, beat, from);
  const storyArt = app.querySelector('.phone-story canvas');
  if (storyArt) drawScene(storyArt, 'cafe', 'adam-story');
  if (beat && !settings.instantText && document.documentElement.dataset.still !== 'true') typeLine(beat.text);
  let activeControl = '#scene-title';
  if (beat) activeControl = '[data-action="advance"]';
  else if (node.kind === 'explore') {
    activeControl = [
      '.first-clue',
      '[data-required="true"]:not(:disabled)',
      '[data-action="leave"]:not(:disabled)',
      '[data-action="inspect"]:not(:disabled)',
    ].find(selector => app.querySelector(selector)) ?? activeControl;
  }
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
    <label><input type="checkbox" id="instant" ${settings.instantText ? 'checked' : ''}> ورّيني الكلام الكلّ من أوّل مرّة</label>
  </div>`);
}

function journal() {
  const cards = state.evidence.map(id => {
    const [type, title, source, description, question] = evidence[id];
    return `<article class="evidence-card" data-evidence="${id}" data-kind="${type}"><p class="label">${evidenceTypes[type]}</p>
      <h3>${title}</h3><p class="hint">${source}</p><p>${description}</p><p class="open-question">${question}</p></article>`;
  });
  const judgments = state.judgments.map(event =>
    `<li>${event.revisedFrom ? '<strong>رايي بعد كشف البنك </strong>' : ''}${interpretationLabel(event)} · ${percent(event.confidence)}
    <small>وقتها شفت ${event.evidence.map(id => evidence[id][1]).join('، ')}.</small></li>`);
  openPanel('دفتر سامي', `${cards.join('') || '<p>الدفتر مازال فارغ. تفقد البلاصة واحكي مع الناس.</p>'}
    ${judgments.length ? `<h3>أحكامي والثقة فيها</h3><ol class="judgments">${judgments.join('')}</ol>` : ''}`);
}

function verse() {
  return `<blockquote lang="ar">﴿ٱجْتَنِبُوا۟ كَثِيرًۭا مِّنَ ٱلظَّنِّ إِنَّ بَعْضَ ٱلظَّنِّ إِثْمٌۭ﴾</blockquote>
    <p class="hint">من سورة الحجرات، الآية <bdi dir="ltr">49:12</bdi>.</p>`;
}

function source() {
  openPanel('على الآية', `${verse()}
    <p>في الحكاية شفت ناس تسمع كلمة وتعاودها، وناس تشكّ وتسأل قبل ما تحكم. تنجّم تقرا الآية كاملة من اللينك.</p>
    <p><a href="https://quran.com/ar/49/12" target="_blank" rel="noopener noreferrer">نقرا الآية كاملة</a></p>`);
}

function confirmRestart() {
  openPanel('نرجعوا من اللّول؟', '<p>كان تعاود من اللّول، اللعب اللي تسجّل توّة يتفسخ.</p><button class="primary" data-action="restart">إي، نبدأ جولة جديدة</button>');
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  switch (control.dataset.action) {
    case 'enter':
      view = 'chapters';
      render();
      syncSound();
      break;
    case 'splash':
      view = 'splash';
      render();
      syncSound();
      break;
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
      view = 'chapters';
      render();
      break;
    case 'inspect': dispatch({ type: 'inspect', id: control.dataset.id }, '[data-action="advance"]'); break;
    case 'skip-opening':
      while (state.sceneId === 'opening') dispatch({ type: 'advance' });
      break;
    case 'advance':
      if (!finishTyping()) dispatch({ type: 'advance' });
      break;
    case 'leave': dispatch({ type: 'leave' }); break;
  }
});

document.addEventListener('keydown', event => {
  if (!['PageDown', 'PageUp'].includes(event.key) || !event.target.matches('.dialogue-actions button')) return;
  const copy = event.target.closest('.dialogue').querySelector('.dialogue-copy');
  if (copy.scrollHeight <= copy.clientHeight) return;
  copy.scrollBy({ top: (event.key === 'PageDown' ? 1 : -1) * copy.clientHeight });
  event.preventDefault();
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
