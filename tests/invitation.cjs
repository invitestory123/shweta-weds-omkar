// Run with Playwright available through NODE_PATH; targets the local dist preview.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const output = process.env.SCREENSHOT_DIR || '/tmp/shweta-invitation-checks';
  await fs.mkdir(output, { recursive: true });
  const baseURL = process.env.TEST_URL || 'http://127.0.0.1:4173';
  const errors = [];
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL);
    await page.getByRole('link', { name: 'Skip opening', exact: true }).click();
    await page.locator('#entrance').waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.door-wings').count(), 0, 'Only one door animation');
    assert.match(await page.locator('#families').innerText(), /Mahadeo Dagade/);
    assert.match(await page.locator('#celebrations').innerText(), /3:15 PM onwards/);
    assert.match(await page.locator('.blessing-names').innerText(), /ओंकार[\s\S]*श्वेता/);
    assert.doesNotMatch(await page.locator('#wedding-attire').innerText(), /Kanjivaram|Chikankari|Banarasi/);
    assert.equal(await page.locator('.scene-effects').count(), 4);
    assert.equal(await page.locator('.fairy-lights circle').count(), 38);
    const overflows = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert(overflows.body <= overflows.viewport, `No horizontal page overflow at ${width}: ${JSON.stringify(overflows)}`);
    const blessing = await page.locator('.blessing-stage').boundingBox();
    for (const name of await page.locator('.blessing-names > span').all()) {
      const box = await name.boundingBox();
      assert(box.y >= blessing.y + blessing.height * .50, 'Names below top floral border');
      assert(box.y + box.height <= blessing.y + blessing.height * .675, 'Names above lower floral border');
    }
    await page.locator('#blessing').scrollIntoViewIfNeeded();
    await page.locator('.blessing-stage').screenshot({ style: '.site-header, .attire-tabs, .skip, #petals { visibility: hidden !important; }', path: `${output}/blessing-${width}.png` });
    await page.locator('#celebrations').scrollIntoViewIfNeeded();
    await page.locator('.event-scenes').screenshot({ style: '.site-header, .attire-tabs, .skip, #petals { visibility: hidden !important; }', path: `${output}/celebrations-${width}.png` });
    await page.locator('#attire').scrollIntoViewIfNeeded();
    await page.locator('.paithani-feature').screenshot({ style: '.site-header, .attire-tabs, .skip, #petals { visibility: hidden !important; }', path: `${output}/paithani-${width}.png` });
    await page.getByRole('tab', { name: 'Reception', exact: true }).click();
    assert.equal(await page.locator('#reception-attire').isVisible(), true);
    await page.getByRole('tab', { name: 'Reception', exact: true }).press('ArrowLeft');
    assert.equal(await page.getByRole('tab', { name: 'Wedding', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('button', { name: 'Reveal without scratching' }).click();
    assert.match(await page.locator('#date-announcement').innerText(), /18 December 2026/);
    assert.match(await page.locator('.scratch-card').getAttribute('class'), /revealed/);
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('video')].every(video => video.paused)), true);
    await page.getByRole('button', { name: 'Open the doors again' }).click();
    assert.equal(await page.locator('#entrance').isVisible(), true);
    await page.getByRole('button', { name: 'Open our invitation' }).click();
    await page.locator('#entrance').waitFor({ state: 'hidden', timeout: 2000 });
    await context.close();
    console.log(`PASS ${width}px: copy, name bounds, overflow, tabs, reveal, motion, replay`);
  }
  // Verify video completion, real pointer scratching, and blocked-media fallback.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'Open our invitation' }).click();
  await page.locator('#entrance').waitFor({ state: 'hidden', timeout: 12000 });
  const door = await page.locator('#opening-video').evaluate(video => ({ ended: video.ended, time: video.currentTime, duration: video.duration }));
  assert(door.ended && door.time >= door.duration - .2, 'Door plays through its natural end');
  await page.waitForFunction(() => document.querySelector('.scene-video').ended, null, { timeout: 10000 });
  assert.equal(await page.locator('.scene-video').evaluate(video => video.loop), false);
  await page.locator('#date').scrollIntoViewIfNeeded();
  const scratch = await page.locator('#scratch').boundingBox();
  await page.mouse.move(scratch.x + 4, scratch.y + 5);
  await page.mouse.down();
  for (let row = 0; row < 5; row++) {
    const y = scratch.y + 5 + row * (scratch.height - 10) / 4;
    await page.mouse.move(row % 2 ? scratch.x + 5 : scratch.x + scratch.width - 5, y, { steps: 20 });
  }
  await page.mouse.up();
  assert.match(await page.locator('.scratch-card').getAttribute('class'), /revealed/, 'Pointer scratch reveals the date');
  const calendar = await context.request.get(baseURL + '/wedding.ics');
  assert.match(await calendar.text(), /DTSTART:20261218T094500Z/);
  const privateResponse = await context.request.get(baseURL + '/.private/whatsapp/_chat.txt');
  assert.equal(privateResponse.status(), 404, 'Private export is never served');
  await context.close();
  console.log('PASS natural video completion, hands hold, pointer scratch, calendar, private export isolation');

  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(baseURL);
  await reducedPage.getByRole('button', { name: 'Open our invitation' }).click();
  await reducedPage.locator('#entrance').waitFor({ state: 'hidden', timeout: 2000 });
  assert.equal(await reducedPage.locator('.scene-video').getAttribute('src'), null);
  assert.equal(await reducedPage.locator('.petal').count(), 0);
  await reduced.close();
  console.log('PASS reduced motion skips video and petals');

  const fallback = await browser.newContext();
  const fallbackPage = await fallback.newPage();
  await fallbackPage.route('**/*.mp4', route => route.abort());
  await fallbackPage.goto(baseURL);
  await fallbackPage.getByRole('button', { name: 'Open our invitation' }).click();
  await fallbackPage.locator('#entrance').waitFor({ state: 'hidden', timeout: 12000 });
  assert.equal(await fallbackPage.locator('#invitation').isVisible(), true);
  await fallback.close();
  console.log('PASS blocked video still opens invitation');

  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJS.newPage();
  await staticPage.goto(baseURL);
  assert.equal(await staticPage.locator('#invitation').isVisible(), true);
  assert.equal(await staticPage.locator('#reception-attire').isVisible(), true);
  assert.equal(await staticPage.locator('#entrance').isVisible(), false);
  await noJS.close();
  console.log('PASS invitation and both attire sections work without JavaScript');
  assert.deepEqual(errors, [], 'No browser errors');
  await browser.close();
  console.log(`All checks passed. Screenshots: ${output}`);
})().catch(error => { console.error(error); process.exit(1); });
