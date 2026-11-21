import './style.css';
import { chapter, characterIntroductions, decisionStakes, decisionTradeoffs, exhibits, locations, messagesOnPhone, musicCue, sceneTransitions } from '../content/chapter.mjs';
import { evidence, evidenceTypes } from '../content/evidence.mjs';
import { currentBeats, newStory, transition } from '../engine/story.mjs';
import { loadSettings, loadStory, saveSettings, saveStory } from '../engine/save.mjs';
import { chime, phoneBuzz, sceneSound, setAudio, setRecitationActive, setSceneMusic, setWindowRain } from '../render/audio.mjs';
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
let sceneEntered = 0;
let recitation;

const confidenceLevels = [
  [0, 'ما عنديش ثقة في التفسير هذا'], [25, 'ثقتي ضعيفة'], [50, 'نصّ نصّ'],
  [75, 'شبه متأكّد'], [100, 'متأكّد بالكلّ'],
];

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

const paperHotspots = new Set(['folder', 'statement', 'annex']);
const digitalHotspots = new Set(['laptop', 'phone', 'inbox', 'records']);

function dispatch(event, focus) {
  const previous = state;
  const next = transition(state, event);
  if (next === state) return;
  const node = chapter[next.sceneId];
  if (previous.sceneId !== next.sceneId && ['intro', 'cafe', 'home'].includes(next.sceneId)) {
    sceneSound('door', node.place, -.65);
  }
  if (previous.sceneId === 'opening' && next.sceneId === 'intro') phoneBuzz(.35);
  else if (next.evidence.length > previous.evidence.length) chime();
  if (event.type === 'inspect') {
    const pan = stagePan(position(node, next));
    if (paperHotspots.has(event.id)) sceneSound('paper', node.place, pan);
    if (digitalHotspots.has(event.id)) sceneSound('tap', node.place, pan);
  }
  state = next;
  events.push(event);
  notice = saveStory(storage, events) ? null : 'unsaved';
  render(focus, previous);
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
  if (await setAudio(settings)) {
    setWindowRain(view === 'game' && state.hotspot === 'window');
    return;
  }
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
  const label = finished ? 'نشوف النهاية' : state ? 'نكمّل اللعب' : 'نلعب الحكاية';
  const progress = finished ? 'كمّلت الحكاية' : current ? `وقفت في ${locations[current.place]}` : '';
  return `<main class="game chapter-menu" aria-labelledby="chapters-title">
    <div class="chapters-heading">
      <h1 id="chapters-title">الحكايات</h1>
      <button class="chapter-back" data-action="splash">نرجع للبداية</button>
    </div>
    <article class="chapter-card" aria-labelledby="chapter-one-title">
      <div class="chapter-stage" aria-hidden="true">
        <canvas width="480" height="224"></canvas>
      </div>
      <div class="chapter-details">
        <p class="label">الحكاية اللّولة</p>
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

function introduction(id) {
  return `<p class="character-intro"><strong>${cast[id][0]}</strong> · ${characterIntroductions[id]}</p>`;
}

function phoneScreen(beat) {
  if (state.sceneId !== 'intro') return '';
  const first = state.beatIndex === 0;
  if (state.hotspot === 'phone') {
    const content = first
      ? `<p class="chat-bubble sent">${messagesOnPhone.adam}</p><p class="chat-status">قراه · <bdi>٢١:١٤</bdi></p>`
      : '<figure class="phone-story"><canvas width="480" height="224" aria-hidden="true"></canvas><figcaption>ستوري آدم مع يوسف في قهوة سي الطاهر</figcaption></figure>';
    return `<aside class="phone-screen"><h2>آدم</h2>${content}${introduction(first ? 'adam' : 'youssef')}</aside>`;
  }
  if (state.hotspot !== 'inbox') return '';
  return `<aside class="phone-screen"><h2>لينا <bdi class="chat-time">٢٣:٥١</bdi></h2>
    ${first ? `<div class="chat-bubble incoming">${storyLine(beat.text)}</div>${introduction('lina')}` : `<p class="chat-bubble sent">علاش؟</p>
    <div class="chat-typing" aria-hidden="true"><i></i><i></i><i></i></div>`}</aside>`;
}

function firstSpeakerCard(beat) {
  const { sceneId, hotspot, beatIndex } = state;
  const first = (sceneId === 'street' && hotspot === 'amina' && beatIndex === 0)
    || (sceneId === 'home' && hotspot === 'maryam' && beatIndex === 0)
    || (sceneId === 'leads' && hotspot === 'witnesses');
  return first ? introduction(beat.speaker) : '';
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
    ${state.sceneId === 'morning' && state.beatIndex === 0
      ? '<p class="room-chatter">من آخر القاعة · «سيّب كرسي لهنا، بالله.»</p>' : ''}
    ${firstSpeakerCard(beat)}
    ${exhibit()}
    </div>
    <footer class="dialogue-actions">${state.hotspot === 'cup'
      ? '<button data-action="sip">رشفة أخرى</button>' : ''}<button class="primary" data-action="advance">${closing ? 'نسكّر' : state.hotspot === 'phone' ? 'نشوف الستوري' : 'نكمل'} <span aria-hidden="true">←</span></button></footer>
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
    <form id="decision"><fieldset><legend class="${node.proposition ? 'step-title' : 'sr-only'}">${node.proposition ? '١. اختار تفسيرك' : 'اختيارك'}</legend>
      ${node.options.map(choice => `<label class="choice"><input type="radio" name="choice" value="${choice.id}" required><span>${choice.label}${decisionTradeoffs[state.sceneId]?.[choice.id]
        ? `<small class="tradeoff">${decisionTradeoffs[state.sceneId][choice.id]}</small>` : ''}</span></label>`).join('')}
    </fieldset>
    ${node.proposition ? `<fieldset class="certainty" aria-describedby="confidence-hint">
      <legend class="step-title">٢. قدّاش إنت واثق في تفسيرك؟</legend>
      <p id="confidence-hint">اختار نسبة باش تكمّل. ${state.sceneId === 'silence' ? 'قدّاش التفسير هذا يقنعك توّة؟' : 'باش تقارن ثقتك قبل كشف البنك وبعدو.'}</p>
      <div class="certainty-options">${confidenceLevels.map(([value, label]) => `<label title="${label}">
        <input type="radio" name="confidence" value="${value}" required aria-label="${value}%، ${label}">
        <bdi>${value}%</bdi></label>`).join('')}</div>
    </fieldset>` : ''}
    <button type="submit" class="primary next">${node.proposition ? 'نسجّل رايي وثقتي' : 'نثبّت ونكمّل'} <span aria-hidden="true">←</span></button></form>
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

const endingPages = [
  ['case', 'الحكاية'],
  ['insights', 'اختياراتك'],
  ['verse', 'الآية'],
];

function finish() {
  const outcome = outcomes[state.actions.final];
  const summary = summarize(state);
  const reasons = [
    ['أوّل إشارة', interpretationLabel(summary.opening)],
    ['كي بان الدليل', interpretationLabel(summary.after)],
    ['من الراي للفعل', chapter.final.options.find(option => option.id === state.actions.final).label],
  ];
  return `<main class="finale" data-outcome="${state.actions.final}">
    <header class="finale-hero">
      <canvas width="480" height="224" aria-hidden="true"></canvas>
      <div><p class="label">كمّلت الحكاية اللّولة</p><h1 id="scene-title" tabindex="-1">${outcome.title}</h1></div>
    </header>
    <nav class="finale-nav" aria-label="أقسام النهاية">${endingPages.map(([id, label], index) =>
      `<button data-action="ending-page" data-id="${id}" aria-controls="ending-${id}" aria-pressed="${index === 0}">${label}</button>`).join('')}</nav>
    <div class="finale-scroll">
      <section class="finale-page case-recap" id="ending-case" aria-labelledby="case-title">
        <h2 id="case-title" tabindex="-1">شنوّة تبدّل باختيارك؟</h2>
        <p class="personal-highlight" data-ending-step>${outcome.consequence}</p>
        <p data-ending-step>${summary.askedWitness
          ? state.actions.final === 'correct'
            ? 'آدم شهد باللي يعرفو، وحكاية خوّه قعدت بيناتكم.'
            : 'آدم بعثلك كلامو مكتوب. خلّى لك القرار وين تستعملو.'
          : 'لينا شدّت التصحيح. آدم سلّم عليك من بعيد.'}</p>
        <h3 data-ending-step>شنوّة صار بالحقّ؟</h3>
        <dl>${caseRecap.map(([question, answer]) => `<div data-ending-step><dt>${question}</dt><dd>${answer}</dd></div>`).join('')}</dl>
        <button class="primary" data-ending-link data-action="ending-page" data-id="insights">نشوف أثر اختياراتي <span aria-hidden="true">←</span></button>
      </section>
      <section class="finale-page reflection" id="ending-insights" aria-labelledby="reflection-title" hidden>
        <h2 id="reflection-title" tabindex="-1">كيفاش خمّمت في الجولة هاذي؟</h2>
        <p class="personal-highlight" data-ending-step>${summary.takeaway}</p>
        <ol data-ending-step class="confidence-trail" aria-label="الثقة اللي سجّلتها">${summary.confidenceTrail.map(([label, score]) =>
          `<li><span>${label}</span><strong>${percent(score)}</strong></li>`).join('')}</ol>
        <p class="hint confidence-reading" data-ending-step>${summary.confidenceReading}</p>
        <div class="insight-cards">
          ${summary.patterns.map(([label, example], index) => `<article data-ending-step>
            <p class="label">${reasons[index][0]}</p><h3>${label}</h3>
            <p class="insight-choice">${reasons[index][1]}</p><p>${example}</p>
          </article>`).join('')}
        </div>
        <details class="decision-recap" data-ending-step>
          <summary>نرجع لاختياراتي بالتفصيل</summary>
          <dl>
            <div><dt>سكوت آدم · ${interpretationLabel(summary.opening)}</dt><dd>${summary.openingFeedback}</dd></div>
            <div><dt>وقت فتّشت على الفلوس</dt><dd>${summary.leadFeedback}</dd></div>
            <div><dt>قبل الكشف · ${interpretationLabel(summary.before)}</dt>
              <dt>بعد الكشف · ${interpretationLabel(summary.after)}</dt><dd>${summary.update}</dd></div>
            <div><dt>الكلام اللي جابتو أمينة · ${chapter.rumor.options.find(option => option.id === state.actions.rumor).label}</dt><dd>${summary.rumorFeedback}</dd></div>
            ${summary.actionTrail.map(([label, explanation]) => `<div><dt>${label}</dt><dd>${explanation}</dd></div>`).join('')}
          </dl>
        </details>
        <button data-ending-link data-action="ending-page" data-id="verse">نمشي للآية <span aria-hidden="true">←</span></button>
      </section>
      <section class="finale-page lesson" id="ending-verse" aria-labelledby="lesson-title" hidden>
        <h2 id="lesson-title" tabindex="-1">قبل ما تسكّر الحكاية</h2>
        <div data-ending-step>${verse()}</div>
        <div data-ending-step>${messageMirror(summary.opening)}</div>
      </section>
    </div>
    <footer class="finale-footer">
      <div class="finale-reading" hidden>
        <button class="primary" data-action="ending-next">نكمل <span aria-hidden="true">←</span></button>
        <button data-action="ending-skip">ورّيني الكلّ</button>
      </div>
      <button data-action="start">نعاود نلعب</button><button data-action="journal">نفتح الدفتر</button>
      ${notice ? `<span class="notice" role="status">${messages[notice]}</span>` : ''}</footer>
  </main>`;
}

function openEndingPage(id) {
  const page = document.getElementById(`ending-${id}`);
  if (!page) return;
  stopRecitation();
  app.querySelectorAll('.finale-page').forEach(section => { section.hidden = section !== page; });
  app.querySelectorAll('.finale-nav button').forEach(button => button.setAttribute('aria-pressed', button.dataset.id === id));
  page.parentElement.scrollTop = 0;
  startEndingPage(page);
  page.querySelector('h2').focus({ preventScroll: true });
}

function updateEndingControls(page) {
  const reading = app.querySelector('.finale-reading');
  const complete = !page.querySelector('.ending-pending');
  if (complete && reading.contains(document.activeElement)) {
    (page.querySelector('[data-ending-link]') ?? page.querySelector('h2')).focus({ preventScroll: true });
  }
  reading.hidden = complete;
  return complete ? page.querySelector('[data-ending-link]') : null;
}

function scrollToEndingContent(element) {
  element?.scrollIntoView({ block: 'nearest', behavior: document.documentElement.dataset.still === 'true' ? 'instant' : 'smooth' });
}

function showNextEndingStep(page, fromButton = false) {
  const next = page.querySelector('.ending-pending');
  if (!next) return;
  next.classList.replace('ending-pending', 'ending-arriving');
  const link = updateEndingControls(page);
  if (fromButton) {
    announcement.textContent = next.matches('details') || next.querySelector('button') ? '' : next.textContent.trim();
    scrollToEndingContent(link ?? next);
  }
}

function startEndingPage(page) {
  announcement.textContent = '';
  if (!page.querySelector('.ending-arriving')) showNextEndingStep(page);
  updateEndingControls(page);
}

function skipEndingReveal(page) {
  page.querySelectorAll('.ending-pending').forEach(step => step.classList.replace('ending-pending', 'ending-arriving'));
  page.querySelectorAll('.ending-arriving').forEach(step => step.classList.add('ending-instant'));
  scrollToEndingContent(updateEndingControls(page));
}

function position(node, current) {
  const spot = node.spots?.find(item => item.id === (current.hotspot ?? current.inspected.at(-1)));
  return spot ? Math.round(spot.x * 4.8) : node.place === 'room' ? 249 : 145;
}

function stagePan(x) {
  return (x - 240) / 300;
}

function animateStage(canvas, node, beat, from, replayCup = false) {
  const to = position(node, state);
  const interaction = state.hotspot;
  const previous = from?.sceneId === 'opening' && state.sceneId === 'intro' ? 45
    : from && from.sceneId === state.sceneId ? position(node, from)
    : from && chapter[from.sceneId].place !== node.place ? 44 : to;
  const distance = Math.abs(to - previous);
  const walkDuration = distance ? Math.min(1250, 300 + distance * 4) : 0;
  const startsScene = from && from.sceneId !== state.sceneId;
  const enteringCup = interaction === 'cup' && (replayCup || from?.hotspot !== 'cup');
  const still = document.documentElement.dataset.still === 'true';
  const sceneId = state.sceneId;
  const roomEntrance = sceneId === 'morning' || sceneId === 'wait';
  if (roomEntrance && (startsScene || !from)) {
    sceneEntered = performance.now() - (still || !from ? 1500 : 0);
  }
  const portrait = beat ? app.querySelector('.speaker canvas') : null;
  const paint = (x, motion = 0, stride = 0, sceneTime = 0) => {
    const artTime = roomEntrance ? Math.min(1500, performance.now() - sceneEntered)
      : Math.max(0, sceneTime - (enteringCup ? walkDuration : 0));
    drawScene(canvas, node.place, sceneId, beat?.speaker, x, motion, stride, artTime, interaction);
    if (portrait) drawPortrait(portrait, beat.speaker, beat.mood, motion);
  };
  const hasAtmosphere = ['room', 'street', 'cafe'].includes(node.place);
  if (startsScene && sceneId === 'morning') sceneSound('chair', node.place, .4);
  if (still || (!beat && previous === to && !hasAtmosphere)) {
    if (roomEntrance) sceneEntered = performance.now() - 1500;
    if (enteringCup) sceneSound('cup', node.place, stagePan(to));
    if (still && distance) sceneSound('step', node.place, stagePan(to));
    paint(to, 0, 0, 1500 + walkDuration);
    return;
  }
  const start = performance.now();
  let lastFrame = -1;
  let lastStep = -1;
  let cupPlayed = false;
  function step(now) {
    const elapsed = now - start;
    if (document.documentElement.dataset.still === 'true') {
      if (roomEntrance) sceneEntered = now - 1500;
      paint(to);
      return;
    }
    const frame = Math.floor(elapsed / 85);
    const walking = walkDuration ? Math.min(elapsed / walkDuration, 1) : 1;
    const stepNumber = Math.floor(elapsed / 225);
    if (walking < 1 && stepNumber !== lastStep) {
      lastStep = stepNumber;
      sceneSound('step', node.place, stagePan(previous + (to - previous) * walking));
    }
    if (enteringCup && !cupPlayed && walking === 1) {
      cupPlayed = true;
      sceneSound('cup', node.place, stagePan(to));
    }
    if (frame !== lastFrame) {
      lastFrame = frame;
      const talking = beat && elapsed < Math.min(3400, Math.max(1050, beat.text.length * 22));
      const stride = previous !== to && walking < 1 ? Math.round(Math.sin(elapsed / 36) * 5) : 0;
      paint(Math.round(previous + (to - previous) * walking), talking ? frame + 1 : 0, stride, elapsed);
      if (walking === 1 && !talking && !hasAtmosphere && (!roomEntrance || now - sceneEntered >= 1400)) return;
    }
    walkFrame = requestAnimationFrame(step);
  }
  paint(previous);
  walkFrame = requestAnimationFrame(step);
}

function render(focus, from) {
  stopRecitation();
  setWindowRain(view === 'game' && state.hotspot === 'window');
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
  if (node.kind === 'end') {
    app.innerHTML = gameHeader() + finish();
    announcement.textContent = '';
    drawScene(app.querySelector('.finale canvas'), 'office', 'end');
    app.querySelectorAll('[data-ending-step]').forEach(step => step.classList.add('ending-pending'));
    startEndingPage(app.querySelector('#ending-case'));
    app.querySelector('#scene-title').focus({ preventScroll: true });
    return;
  }
  const body = opening ? prologue(beat)
    : beat ? dialogue(beat, state.hotspot && state.beatIndex === beats.length - 1)
    : node.kind === 'explore' ? investigation(node) : decision(node);
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
  stopRecitation();
  if (!dialog.open) previousFocus = document.activeElement;
  dialog.innerHTML = `<header class="panel-header"><h2 id="overlay-title">${name}</h2>
    <button data-action="close" autofocus>نسكّر <span aria-hidden="true">×</span></button></header>${contents}`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('[data-action="close"]').focus();
}

dialog.addEventListener('close', () => {
  if (recitation && dialog.contains(recitation.control)) stopRecitation();
  if (previousFocus?.isConnected) previousFocus.focus();
});

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

const verseAudio = 'https://everyayah.com/data/Minshawy_Mujawwad_192kbps/049012.mp3';
const verseSource = 'https://quran.com/ar/49/12';

function verse() {
  return `<blockquote lang="ar">﴿يَا أَيُّهَا الَّذِينَ آمَنُوا اجْتَنِبُوا كَثِيرًا مِنَ ٱلظَّنِّ إِنَّ بَعْضَ ٱلظَّنِّ إِثْمٌ ۖ وَلَا تَجَسَّسُوا وَلَا يَغْتَبْ بَعْضُكُمْ بَعْضًا ۚ أَيُحِبُّ أَحَدُكُمْ أَنْ يَأْكُلَ لَحْمَ أَخِيهِ مَيْتًا فَكَرِهْتُمُوهُ ۚ وَاتَّقُوا اللَّهَ ۚ إِنَّ اللَّهَ تَوَّابٌ رَحِيمٌ﴾</blockquote>
    <p class="hint">سورة الحجرات، الآية <bdi dir="ltr">49:12</bdi> · تلاوة محمّد صدّيق المنشاوي</p>
    <div class="verse-player">
      <button data-action="recite">نسمع الآية</button>
      <span class="hint" role="status"></span>
      <a href="${verseSource}" target="_blank" rel="noopener noreferrer">الآية على Quran.com</a>
    </div>`;
}

function stopRecitation() {
  if (!recitation) return;
  const player = recitation;
  recitation = undefined;
  player.pause();
  const control = player.control;
  control.textContent = 'نسمع الآية';
  setRecitationActive(false);
}

async function playRecitation(control) {
  if (recitation?.control === control) {
    stopRecitation();
    return;
  }
  stopRecitation();
  const status = control.parentElement.querySelector('[role="status"]');
  const player = new Audio(verseAudio);
  player.volume = settings.volume / 100;
  player.control = control;
  recitation = player;
  control.textContent = 'نوقّف التلاوة';
  status.textContent = '';
  setRecitationActive(true);
  player.addEventListener('ended', () => {
    if (recitation === player) stopRecitation();
  });
  try {
    await player.play();
  } catch {
    if (recitation !== player) return;
    stopRecitation();
    status.textContent = 'التلاوة ما خدمِتش. تنجّم تسمعها من اللينك.';
  }
}

function source() {
  openPanel('على الآية', verse());
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
      stopRecitation();
      settings = { ...settings, music: !settings.music };
      saveSettings(storage, settings);
      updateSoundButton();
      syncSound();
      break;
    case 'close': dialog.close(); break;
    case 'settings': settingsPanel(); break;
    case 'journal': journal(); break;
    case 'source': source(); break;
    case 'ending-page': openEndingPage(control.dataset.id); break;
    case 'ending-next': showNextEndingStep(app.querySelector('.finale-page:not([hidden])'), true); break;
    case 'ending-skip': skipEndingReveal(app.querySelector('.finale-page:not([hidden])')); break;
    case 'recite': void playRecitation(control); break;
    case 'sip':
      cancelAnimationFrame(walkFrame);
      animateStage(app.querySelector('.stage canvas'), chapter[state.sceneId], currentBeats(state)[state.beatIndex], state, true);
      break;
    case 'about':
      openPanel('على الحكاية', '<p>إنت سامي، متطوّع في جمعيّة الجسر. دوّر في البلايص، اسمع للناس، وقارن الورق. اختيارك يبدّل شنوّة تعرف وشنوّة يصير.</p><p>الحفظ على المتصفّح هذا. <bdi dir="ltr">Tab</bdi> للتنقّل و<bdi dir="ltr">Enter</bdi> للاختيار.</p><button data-action="source">على الآية</button>');
      break;
    case 'menu':
      openPanel('وقفنا الحكاية', '<p>تنجّم تكمّل من وين وقفت.</p><div class="toolbar"><button class="primary" data-action="close">نكمّل</button><button data-action="title">نرجع للحكايات</button><button data-action="start">نبدأ من اللّول</button></div>');
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

document.addEventListener('invalid', event => {
  if (event.target.name !== 'confidence' || !event.target.form?.querySelector('[name="choice"]:checked')) return;
  event.preventDefault();
  const first = event.target.form.querySelector('[name="confidence"]');
  first.focus();
  first.closest('fieldset').classList.add('needs-confidence');
}, true);

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
