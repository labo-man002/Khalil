import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const prefix = '/Khalil/';
const output = resolve('dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const target = resolve(output, pathname.startsWith(prefix) ? pathname.slice(prefix.length) + (pathname.endsWith('/') ? 'index.html' : '') : '..');
  if (!target.startsWith(output + '/') || !mime[extname(target)]) return response.writeHead(404).end();
  try {
    const content = await readFile(target);
    response.writeHead(200, { 'Content-Type': mime[extname(target)] }).end(content);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const host = `http://127.0.0.1:${server.address().port}`;
const route = host + prefix + 'hidden-layers-of-truth/';
const screenshotPath = process.env.GAME_SCREENSHOTS_DIR;
if (screenshotPath) await mkdir(screenshotPath, { recursive: true });

const verseAudioPath = process.env.GAME_VERSE_AUDIO;
const verseAudio = verseAudioPath
  ? { path: verseAudioPath, contentType: 'audio/mpeg' }
  : {
      // Six seconds of silent PCM at 8 kHz, so media lifecycle checks run without an external request.
      body: Buffer.concat([
        Buffer.from('52494646a4bb000057415645666d74201000000001000100401f0000401f0000010008006461746180bb0000', 'hex'),
        Buffer.alloc(48000, 128),
      ]),
      contentType: 'audio/wav',
    };
let browser;

try {
  assert.equal((await fetch(host + prefix)).status, 200, 'portfolio index loads at the Pages prefix');
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_BIN || undefined,
    args: ['--no-sandbox'],
  });

  for (const variant of [
    { name: 'desktop', viewport: { width: 1366, height: 1024 }, ending: 'correct', lead: 'records', title: 'توضّحت الحكاية' },
    { name: 'mobile', viewport: { width: 390, height: 844 }, ending: 'internal', lead: 'adam', title: 'التقرير عند اللجنة' },
    { name: 'narrow', viewport: { width: 320, height: 568 }, ending: 'post', lead: 'witnesses', title: 'سبق الكلام' },
    { name: 'landscape', viewport: { width: 740, height: 320 }, ending: 'correct', lead: 'youssef', title: 'توضّحت الحكاية' },
  ]) {
    const mobile = variant.name !== 'desktop';
    const page = await browser.newPage({ viewport: variant.viewport, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
    page.on('requestfailed', request => failures.push(`failed ${request.url()}`));
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    const action = (key, scope = page) => scope.locator(`[data-action="${key}"]`).first();
    const click = locator => mobile ? locator.tap() : locator.click();
    const panel = page.locator('#overlay');
    const capture = async (name, fullPage = false) => {
      if (screenshotPath && !mobile) await page.screenshot({ path: join(screenshotPath, name + '.png'), fullPage });
    };
    const drain = async () => {
      let turns = 0;
      while (await action('advance').count()) {
        assert(turns++ < 15, 'Dialogue terminates');
        await click(action('advance'));
      }
    };
    const assertHotspotsSeparate = async () => {
      const spots = await page.locator('.stage-actions button').evaluateAll(buttons => buttons.map(button => {
        const { top, bottom, left, right, width, height } = button.getBoundingClientRect();
        return { top, bottom, left, right, width, height };
      }));
      const stage = await page.locator('.stage').boundingBox();
      for (const [index, rect] of spots.entries()) {
        assert(rect.width >= 44 && rect.height >= 44);
        assert(rect.left >= stage.x && rect.right <= stage.x + stage.width);
        assert(rect.top >= stage.y && rect.bottom <= stage.y + stage.height);
        for (const other of spots.slice(index + 1)) {
          assert(rect.right <= other.left || other.right <= rect.left || rect.bottom <= other.top || other.bottom <= rect.top);
        }
      }
    };
    const inspect = async id => {
      const spot = page.locator(`[data-action="inspect"][data-id="${id}"]`);
      const box = await spot.boundingBox();
      assert(box.height >= 44 && box.width >= 44 && box.x >= 0 && box.x + box.width <= variant.viewport.width);
      await click(spot);
      await drain();
    };
    const choose = async (id, confidence) => {
      await click(page.locator(`label:has([value="${id}"])`));
      if (confidence !== undefined) {
        const level = page.locator(`.certainty-options label:has([value="${confidence}"])`);
        await click(page.locator('#decision button[type=submit]'));
        assert.equal(await page.locator('.certainty.needs-confidence').count(), 1);
        assert.equal(await page.locator('[name="confidence"]:checked').count(), 0);
        await click(level);
        assert.equal(await page.locator('[name="confidence"]:checked').inputValue(), String(confidence));
      }
      await click(page.locator('#decision button[type=submit]'));
    };

    // Check the finished audio signal, including scene transitions through the mixer.
    const hear = midi => page.waitForFunction(expected => {
      const meter = window.musicMeter;
      if (!meter || meter.context.state !== 'running') return false;
      const bins = new Float32Array(meter.frequencyBinCount);
      meter.getFloatFrequencyData(bins);
      const hz = 440 * 2 ** ((expected - 69) / 12);
      const bin = Math.round(hz * meter.fftSize / meter.context.sampleRate);
      return Math.max(bins[bin - 1], bins[bin], bins[bin + 1]) > -50;
    }, midi, { timeout: 4000 });

    const waitForGameSound = audible => page.waitForFunction(expected => {
      const meter = window.musicMeter;
      if (!meter || meter.context.state !== 'running') return false;
      const samples = new Float32Array(meter.fftSize);
      meter.getFloatTimeDomainData(samples);
      return expected
        ? samples.some(sample => Math.abs(sample) > 0.008)
        : samples.every(sample => Math.abs(sample) < 0.001);
    }, audible, { timeout: 4000 });

    const playVerse = async control => {
      await click(control);
      await page.waitForFunction(() => window.versePlayer?.currentTime > 0.12);
      await waitForGameSound(false);
    };

    await page.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.versePlayer = this;
        return play.apply(this, args);
      };
      const start = AudioBufferSourceNode.prototype.start;
      window.ambientLoops = 0;
      AudioBufferSourceNode.prototype.start = function (...args) {
        if (this.loop) window.ambientLoops++;
        return start.apply(this, args);
      };
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (target, ...args) {
        if (target === this.context.destination) {
          window.musicMeter = this.context.createAnalyser();
          window.musicMeter.fftSize = 4096;
          window.musicMeter.smoothingTimeConstant = 0;
          connect.call(this, window.musicMeter);
        }
        return connect.call(this, target, ...args);
      };
    });
    if (variant.name === 'narrow') {
      await page.addInitScript(() => localStorage.setItem('hlt-darja-v1', '{"old":true}'));
    }
    await page.goto(route);
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
    assert.equal(await page.locator('html').getAttribute('lang'), 'ar-TN');
    assert.equal(await page.locator('html').getAttribute('data-still'), 'true');
    assert.equal(await page.locator('.chapter-card').count(), 0);
    assert.equal(await page.locator('.splash h1').innerText(), 'بين السطور');
    assert.equal(await page.locator('.splash-series').innerText(), 'Hidden Layers of Truth');
    assert.equal(await page.locator('.splash-menu').evaluate(el => getComputedStyle(el).animationName), 'none');
    const splashBox = await page.locator('.splash').boundingBox();
    assert.equal(splashBox.width, variant.viewport.width);
    assert.equal(splashBox.height, variant.viewport.height);
    for (const control of [action('enter'), action('sound')]) {
      const rect = await control.boundingBox();
      assert(rect.x >= 0 && rect.y >= 0 && rect.y + rect.height <= splashBox.height);
      assert(rect.x + rect.width <= splashBox.width && rect.height >= 44);
    }
    await capture('title');
    const quietStart = variant.name === 'narrow';
    const music = action('sound');
    assert.match(await music.innerText(), /^♫\s*الصوت$/);
    assert.equal(await music.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => window.musicMeter), undefined);
    if (quietStart) await click(music);
    if (!mobile) {
      await click(music);
      await click(music);
      await hear(69);
      await action('enter').focus();
    }
    if (!mobile) {
      assert.equal(await action('enter').evaluate(el => document.activeElement === el), true);
      await page.keyboard.press('Enter');
    } else {
      await click(action('enter'));
    }
    assert.equal(await page.locator('.chapter-card').count(), 1);
    assert.equal(await page.locator('.chapter-menu .notice').count(), 0);
    if (!quietStart) await hear(62);
    if (!mobile) {
      await page.route('https://everyayah.com/**/049012.mp3', route => route.fulfill(verseAudio));
      await click(action('about'));
      await click(action('source', panel));
      await playVerse(action('recite', panel));
      await page.keyboard.press('Escape');
      await panel.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => window.versePlayer.paused);
      await waitForGameSound(true);
    }
    await click(action('splash'));
    assert.equal(await page.locator('.chapter-card').count(), 0);
    await click(action('enter'));
    await click(action('settings'));
    assert.equal(await music.getAttribute('aria-pressed'), quietStart ? 'false' : 'true');
    await panel.locator('#volume').fill('36');
    if (mobile) await click(panel.locator('label:has(#still)'));
    await click(panel.locator('label:has(#instant)'));
    if (!mobile) await page.keyboard.press('Escape');
    else await click(action('close', panel));
    assert.equal(await panel.isVisible(), false);
    assert.equal(await action('settings').evaluate(el => document.activeElement === el), true);

    assert.equal(await page.locator('.chapter-card').count(), 1);
    assert.equal(await page.locator('.chapter-stage canvas').count(), 1);
    assert.equal(await music.getAttribute('aria-pressed'), quietStart ? 'false' : 'true');
    await click(action('start'));
    assert.match(await page.locator('#prologue-title').innerText(), /سامي/);
    assert.match(await page.locator('.prologue .line').innerText(), /متطوّع في جمعيّة الجسر/);
    assert.equal(await page.locator('.first-clue').count(), 0);
    if (quietStart) await click(action('skip-opening'));
    else await drain();
    assert.equal(await page.locator('.first-clue').evaluate(el => document.activeElement === el), true);
    if (quietStart) {
      assert.equal(await page.evaluate(() => window.musicMeter), undefined);
    } else {
      await page.waitForFunction(() => {
        const meter = window.musicMeter;
        if (!meter || meter.context.state !== 'running') return false;
        const samples = new Float32Array(meter.fftSize);
        meter.getFloatTimeDomainData(samples);
        return samples.some(sample => Math.abs(sample) > 0.02);
      });
    }
    await capture('intro');
    const play = await page.locator('.play-layout').boundingBox();
    const header = await page.locator('.playing .top').boundingBox();
    assert(Math.abs(play.y - (header.y + header.height)) <= 1 && Math.abs(play.y + play.height - variant.viewport.height) <= 1);
    if (variant.name === 'narrow') assert(header.height < 105, 'the narrow toolbar fits in one row');
    const panelBox = await page.locator('.play-panel').boundingBox();
    assert(panelBox.y >= header.y + header.height && panelBox.y + panelBox.height <= variant.viewport.height);
    assert.equal(await page.locator('.stage canvas').evaluate(canvas => getComputedStyle(canvas).objectFit), 'contain');
    assert.equal(await action('leave').isDisabled(), true);
    assert.equal(await page.locator('[data-required=true]').count(), 3);
    await assertHotspotsSeparate();
    const shell = await page.locator('#app').boundingBox();
    assert(Math.abs(shell.height - variant.viewport.height) <= 1);
    assert.equal(await page.evaluate(() => {
      window.scrollTo(0, 100);
      return window.scrollY;
    }), 0);
    assert.match(await page.locator('#investigation-progress').innerText(), /مازال يلزمك تشوف/);
    let roomLoops;
    if (!mobile) {
      roomLoops = await page.evaluate(() => window.ambientLoops);
      assert(roomLoops > 0, 'the room has a running ambience loop');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const stage = page.locator('.stage canvas');
      await click(page.locator('[data-id=window]'));
      const rainFrame = await stage.evaluate(canvas => canvas.toDataURL());
      await page.waitForFunction(previous => document.querySelector('.stage canvas').toDataURL() !== previous, rainFrame);
      await drain();
      await page.locator('[data-id=laptop]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await action('advance').evaluate(el => document.activeElement === el), true);
      const portrait = page.locator('.speaker canvas');
      const firstFrame = await portrait.evaluate(canvas => canvas.toDataURL());
      await page.waitForFunction(previous => document.querySelector('.speaker canvas').toDataURL() !== previous, firstFrame);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
    } else {
      await inspect('laptop');
    }
    await click(page.locator('[data-id="phone"]'));
    const copy = await page.locator('.dialogue-copy').boundingBox();
    const phone = await page.locator('.phone-screen').boundingBox();
    assert(phone.y >= 0 && phone.y + 20 <= copy.y + copy.height,
      'the phone appears without scrolling');
    assert.match(await page.locator('.chat-status').innerText(), /قراه/);
    assert.match(await page.locator('.character-intro').innerText(), /صاحب سامي/);
    if (await page.locator('.dialogue-copy').evaluate(el => el.scrollHeight > el.clientHeight)) {
      await page.keyboard.press('PageDown');
      await page.waitForFunction(() => document.querySelector('.dialogue-copy').scrollTop > 0);
    }
    if (!mobile) {
      await hear(53);
      assert.equal(await page.evaluate(() => window.ambientLoops), roomLoops,
        'looking out the window and changing score after reading the phone keep the same ambience loop');
    }
    await click(action('advance'));
    assert.match(await page.locator('.phone-story figcaption').innerText(), /آدم مع يوسف/);
    await drain();
    assert.equal(await page.locator('[data-id="inbox"]').evaluate(el => el === document.activeElement), true);
    assert.match(await page.locator('#investigation-progress').innerText(), /ميساج لينا/);
    await click(page.locator('[data-id="inbox"]'));
    assert.match(await page.locator('#animated-text').innerText(), /ما تبعثش تقرير التبرّعات الليلة/);
    assert.match(await page.locator('#scene-announcement').innerText(), /^لينا\./);
    await click(action('advance'));
    assert.match(await page.locator('#animated-text').innerText(), /بعثتلها.*لينا قاعدة تكتب.*ما وصلني حتى جواب/);
    assert.equal(await page.locator('.chat-typing i').count(), 3);
    await drain();
    assert.equal(await action('leave').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('#investigation-progress').count(), 0);
    await click(action('leave'));
    if (!mobile) await page.emulateMedia({ reducedMotion: 'no-preference' });
    await choose('exclude', 75);
    assert.match(await page.locator('#animated-text').innerText(), /نهار الجمعة الصباح/);
    assert.equal(await page.locator('[data-speaker="sami"] h1').innerText(), 'سامي');
    if (!mobile) {
      const witnesses = () => page.locator('.stage canvas').evaluate(canvas =>
        Array.from(canvas.getContext('2d').getImageData(343, 125, 137, 65).data).join());
      const entering = await witnesses();
      await page.waitForFunction(first => {
        const canvas = document.querySelector('.stage canvas');
        return Array.from(canvas.getContext('2d').getImageData(343, 125, 137, 65).data).join() !== first;
      }, entering);
      await page.waitForTimeout(1550);
      await click(action('advance'));
      const settled = await witnesses();
      await page.waitForTimeout(450);
      assert.equal(await witnesses(), settled, 'the next line must keep the chairs and witnesses in place');
      await page.emulateMedia({ reducedMotion: 'reduce' });
    } else {
      await click(action('advance'));
    }
    assert.equal(await page.locator('[data-speaker="adam"] h1').innerText(), 'آدم');
    assert.match(await page.locator('[data-speaker="adam"]').innerText(), /صاحبك/);
    await drain();
    const meetingChoice = variant.name === 'mobile' ? 'challenge' : variant.name === 'narrow' ? 'wait' : 'clarify';
    await choose(meetingChoice);
    await drain();
    await capture('investigation');
    await inspect('folder');
    await click(action('leave'));
    await choose('missing', 25);
    await assertHotspotsSeparate();

    await click(action('journal'));
    assert.equal(await panel.locator('[data-evidence=versions]').count(), 1);
    assert.equal(await panel.locator('[data-kind=inference]').count(), 1);
    await capture('journal');
    await click(action('close', panel));
    await inspect(variant.lead);
    await inspect('amina');
    await click(action('leave'));
    await choose(variant.ending === 'post' ? 'share' : 'check');
    await click(page.locator('[data-id=cup]'));
    assert.match(await page.locator('#animated-text').innerText(), /ناخذ رشفة/);
    await click(action('sip'));
    await drain();
    await click(page.locator('[data-id=adam]'));
    if (!mobile) await hear(67);
    await click(action('advance'));
    const resumeLine = await page.locator('#animated-text').textContent();

    await page.reload();
    await click(action('enter'));
    assert.match(await page.locator('.chapter-progress').innerText(), /وقفت في قهوة الحومة/);
    await click(action('resume'));
    assert.equal(await page.locator('#animated-text').textContent(), resumeLine);
    assert.equal(await music.getAttribute('aria-pressed'), quietStart ? 'false' : 'true');
    if (!quietStart) {
      await click(music);
      assert.equal(await music.getAttribute('aria-pressed'), 'false');
    }
    await click(action('settings'));
    assert.equal(await panel.locator('#volume').inputValue(), '36');
    await click(action('close', panel));
    await drain();
    await click(action('leave'));
    await choose(variant.ending === 'correct' ? 'witness' : 'boundary');
    await drain();
    await inspect('maryam');
    await click(action('leave'));
    await choose('listen');
    await drain();
    if (!mobile) await click(music);
    await click(page.locator('[data-id="statement"]'));
    if (!mobile) await hear(79);
    await drain();
    await inspect('annex');
    await click(action('leave'));
    assert.match(await page.locator('.earlier').innerText(), /25%/);
    await capture('confidence');
    await choose('moved', 100);
    assert.equal(await page.locator('.tradeoff').count(), 3);
    await choose(variant.ending);
    await drain();
    assert.equal(await page.locator('#scene-title').textContent(), variant.title);
    const recap = page.locator('.case-recap').first();
    assert.match(await page.locator('.finale-hero .label').innerText(), /الحكاية/);
    assert.equal(await recap.locator('dl > div').first().isVisible(), false);
    await click(action('ending-skip'));
    assert.match(await recap.innerText(), /2,400. دينار/);
    assert.match(await recap.innerText(), /قعدوا في حساب الجمعيّة/);
    assert.match(await recap.innerText(), /ما تأكّدناش/);
    const endingTab = id => page.locator(`.finale-nav [data-id="${id}"]`);
    const endingBounds = await page.locator('.finale').boundingBox();
    assert(Math.abs(endingBounds.y + endingBounds.height - variant.viewport.height) <= 1);
    assert.equal(await page.locator('#ending-insights').isVisible(), false);
    await capture('ending');
    if (!mobile) await page.emulateMedia({ reducedMotion: 'no-preference' });
    await click(endingTab('insights'));
    assert.equal(await endingTab('insights').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#reflection-title').evaluate(el => el === document.activeElement), true);
    const cards = page.locator('.insight-cards article');
    const nextInsight = action('ending-next');
    assert.equal(await cards.first().isVisible(), false);
    if (!mobile) {
      await page.waitForTimeout(1100);
      assert.equal(await page.locator('#ending-insights .confidence-trail').isVisible(), false);
    }
    await click(nextInsight); // Confidence totals
    await click(nextInsight); // Confidence explanation
    await click(nextInsight); // First insight card
    assert.equal(await cards.first().isVisible(), true);
    assert.equal(await cards.nth(1).isVisible(), false);
    await click(endingTab('case'));
    await click(endingTab('insights'));
    assert.equal(await cards.nth(1).isVisible(), false, 'revisiting does not move the reading position');
    await click(nextInsight);
    assert.equal(await cards.nth(1).isVisible(), true);
    assert.equal(await cards.last().isVisible(), false);
    await click(action('ending-skip'));
    assert.equal(await cards.last().isVisible(), true);
    assert.equal(await nextInsight.isVisible(), false);
    assert.equal(await recap.isVisible(), false);
    assert.equal(await page.locator('.insight-cards article').count(), 3);
    assert.match(await page.locator('.insight-cards').innerText(), /قرا وما جاوبش|ما جاوبكش/);
    assert.deepEqual(await page.locator('.confidence-trail bdi').allTextContents(), ['75%', '25%', '100%']);
    await capture('insights');
    await click(page.locator('.decision-recap summary'));
    assert.equal(await page.locator('.decision-recap dd').count(), 7);
    await click(endingTab('verse'));
    if (!mobile) await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.lesson blockquote').isVisible(), true);
    assert.equal(await page.locator('.finale-scroll').evaluate(el => el.scrollTop), 0);
    assert.equal(await page.locator('.mirror-messages').isVisible(), false);
    await click(action('ending-next'));
    assert.equal(await action('ending-skip').isVisible(), false);
    assert.equal(await page.locator('.mirror-messages article').count(), 2);
    assert.match(await page.locator('.mirror-messages').innerText(), /طمّنّي عليك/);
    assert.match(await page.locator('.lesson blockquote').innerText(), /يَا أَيُّهَا.*وَلَا تَجَسَّسُوا.*تَوَّابٌ رَحِيمٌ/);
    if (!mobile) {
      await playVerse(action('recite'));
      await click(endingTab('case'));
      assert.equal(await page.evaluate(() => window.versePlayer.paused), true);
      await waitForGameSound(true);
    }
    await click(endingTab('case'));
    assert.equal(await page.locator('#ending-verse').isVisible(), false);
    assert.equal(await recap.isVisible(), true);

    await page.reload();
    await click(action('enter'));
    await click(action('resume'));
    assert.equal(await page.locator('#scene-title').textContent(), variant.title);
    await click(action('start'));
    await click(action('close', panel));
    assert.equal(await page.locator('#scene-title').textContent(), variant.title);
    await click(action('start'));
    await click(action('restart', panel));
    await drain();
    assert.equal(await action('leave').isDisabled(), true);
    assert.equal(await page.locator('html').evaluate(el => el.scrollWidth <= innerWidth), true);
    assert.deepEqual(failures, []);
    await page.close();
    console.log(`Passed ${variant.name} ${variant.viewport.width}px → ${variant.ending} ending and replay`);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
