import { test } from '@playwright/test';

test('debug iframe structure', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await page.waitForSelector('select', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Select show-weather tool
  await page.selectOption('select >> nth=1', 'show-weather');
  await page.waitForTimeout(500);

  // Fill in location and call tool
  await page.locator('textarea').first().fill('{"location":"Tokyo"}');
  await page.click('button:has-text("Call Tool")');

  // Wait for iframe
  await page.waitForSelector('iframe', { timeout: 15000 });
  await page.waitForTimeout(3000); // Give it time to fully load

  // Count all iframes
  const allFrames = page.frames();
  console.log(`Total frames: ${allFrames.length}`);

  // Check each frame
  for (let i = 0; i < allFrames.length; i++) {
    const frame = allFrames[i];
    console.log(`\n=== Frame ${i} ===`);
    console.log(`URL: ${frame.url()}`);

    try {
      const title = await frame.title();
      console.log(`Title: ${title}`);

      // Check for weather-content
      const weatherContent = await frame.locator('#weather-content').count();
      console.log(`#weather-content count: ${weatherContent}`);

      // Check for any divs
      const divs = await frame.locator('div').count();
      console.log(`div count: ${divs}`);

      // Get body text (first 200 chars)
      const text = await frame.locator('body').textContent();
      console.log(`Body text (first 200 chars): ${text?.substring(0, 200)}`);
    } catch (e) {
      console.log(`Error accessing frame: ${e}`);
    }
  }

  // Take screenshot
  await page.screenshot({ path: 'debug-all-frames.png', fullPage: true });
});
