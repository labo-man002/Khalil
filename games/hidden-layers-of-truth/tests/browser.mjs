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
let browser;

try {
  assert.equal((await fetch(host + prefix)).status, 200, 'portfolio index loads at the Pages prefix');
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_BIN || undefined,
    args: ['--no-sandbox'],
  });

  for (const variant of [
    { name: 'desktop', viewport: { width: 1366, height: 1024 }, ending: 'correct', lead: 'records', title: 'قدّام نفس الناس' },
    { name: 'mobile', viewport: { width: 390, height: 844 }, ending: 'internal', lead: 'adam', title: 'التقرير عند اللجنة' },
    { name: 'narrow', viewport: { width: 320, height: 740 }, ending: 'post', lead: 'witnesses', title: 'سبق الكلام' },
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
        const slider = page.locator('#confidence');
        await slider.fill(String(confidence));
        assert.equal(await page.locator('output[for=confidence]').textContent(), confidence + '%');
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

    await page.addInitScript(() => {
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
    assert.equal(await action('leave').isDisabled(), true);
    assert.equal(await page.locator('[data-required=true]').count(), 3);
    await assertHotspotsSeparate();
    assert.match(await page.locator('#investigation-progress').innerText(), /مازال يلزمك تشوف/);
    if (!mobile) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
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
    if (!mobile) await hear(53);
    await drain();
    assert.equal(await page.locator('[data-id="inbox"]').evaluate(el => el === document.activeElement), true);
    assert.match(await page.locator('#investigation-progress').innerText(), /ميساج لينا/);
    await click(page.locator('[data-id="inbox"]'));
    assert.match(await page.locator('#animated-text').innerText(), /ما تبعثش تقرير التبرّعات الليلة/);
    assert.match(await page.locator('#scene-announcement').innerText(), /^لينا\./);
    await click(action('advance'));
    assert.match(await page.locator('#animated-text').innerText(), /بعثتلها.*لينا قاعدة تكتب.*ما وصلني حتى جواب/);
    await drain();
    assert.equal(await action('leave').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('#investigation-progress').count(), 0);
    await click(action('leave'));
    await choose('exclude', 72);
    assert.match(await page.locator('#animated-text').innerText(), /نهار الجمعة الصباح/);
    assert.equal(await page.locator('[data-speaker="sami"] h1').innerText(), 'سامي');
    await click(action('advance'));
    assert.equal(await page.locator('[data-speaker="adam"] h1').innerText(), 'آدم');
    assert.match(await page.locator('[data-speaker="adam"]').innerText(), /صاحبك/);
    await drain();
    await choose('clarify');
    await drain();
    await capture('investigation');
    await inspect('folder');
    await click(action('leave'));
    await choose('missing', 35);
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
    assert.match(await page.locator('.earlier').innerText(), /35%/);
    await choose('moved', 86);
    assert.equal(await page.locator('.tradeoff').count(), 3);
    await choose(variant.ending);
    await drain();
    assert.equal(await page.locator('#scene-title').textContent(), variant.title);
    const recap = page.locator('.case-recap').first();
    assert.match(await recap.innerText(), /2,400/);
    assert.match(await recap.innerText(), /قعدوا في حساب الجمعيّة/);
    assert.match(await recap.innerText(), /ما تأكّدناش/);
    assert.match(await page.locator('.reflection').innerText(), /86%/);
    assert.match(await page.locator('.reflection').innerText(), /ما جاوبكش/);
    assert.equal(await page.locator('.pattern-recap dt').count(), 3);
    assert.match(await page.locator('.lesson blockquote').innerText(), /ٱلظَّنِّ/);
    await capture('ending', true);

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
