import { test, expect } from '@playwright/test';
import { loadWeatherApp, getWeatherAppFrame } from './test-utils';

test.describe('Phase 4.2: Comparison Mode', () => {
  test('compare-weather tool renders multiple locations', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Select compare-weather tool
    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    // Input multiple locations
    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["Tokyo","Paris","New York"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    // Should show comparison grid
    const comparisonGrid = frame.locator('.comparison-grid');
    await expect(comparisonGrid).toBeVisible({ timeout: 10000 });

    // Should have 3 cards
    const cards = frame.locator('.comparison-card');
    await expect(cards).toHaveCount(3);

    // Verify each location is displayed
    await expect(frame.locator('text=Tokyo')).toBeVisible();
    await expect(frame.locator('text=Paris')).toBeVisible();
    await expect(frame.locator('text=New York')).toBeVisible();
  });

  test('comparison view shows weather data for each location', async ({
    page,
  }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["London","Sydney"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    // Check that each card has weather info
    const cards = frame.locator('.comparison-card');
    await expect(cards).toHaveCount(2);

    // Each card should have temperature, condition, and stats
    const temps = frame.locator('.current-temp-large');
    await expect(temps).toHaveCount(2);

    const conditions = frame.locator('.current-condition');
    await expect(conditions).toHaveCount(2);

    const stats = frame.locator('.comparison-stats');
    await expect(stats).toHaveCount(2);
  });

  test('remove location button works', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["Tokyo","Paris","London"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    // Should have 3 cards
    await expect(frame.locator('.comparison-card')).toHaveCount(3);

    // Click remove button for first location
    const removeBtn = frame.locator('.remove-location-btn').first();
    await removeBtn.click();
    await page.waitForTimeout(500);

    // Should now have 2 cards
    await expect(frame.locator('.comparison-card')).toHaveCount(2);
  });

  test('removing locations until only one remains shows single weather view', async ({
    page,
  }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["Tokyo","Paris"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    // Remove first location
    const removeBtn = frame.locator('.remove-location-btn').first();
    await removeBtn.click();
    await page.waitForTimeout(500);

    // Should switch to single weather view
    const comparisonGrid = frame.locator('.comparison-grid');
    await expect(comparisonGrid).not.toBeVisible();

    // Should show regular weather view
    const weatherData = frame.locator('.weather-data');
    await expect(weatherData).toBeVisible();
  });

  test('exit comparison button works', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["Tokyo","Paris"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    // Click exit comparison button
    const exitBtn = frame.locator('#exit-comparison-btn');
    await exitBtn.click();
    await page.waitForTimeout(500);

    // Should exit comparison mode
    const comparisonGrid = frame.locator('.comparison-grid');
    await expect(comparisonGrid).not.toBeVisible();

    // Should show exit message
    await expect(frame.locator('text=Comparison mode exited')).toBeVisible();
  });

  test('favorite button works in comparison cards', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["Tokyo","Paris"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    // Get first favorite button
    const favoriteBtn = frame.locator('#favorite-0');

    // Initial state should be unfavorited (☆)
    const textBefore = await favoriteBtn.textContent();
    expect(textBefore).toBe('☆');

    // Click to favorite
    await favoriteBtn.click();
    await page.waitForTimeout(500);

    // Should now be favorited (⭐)
    const textAfter = await favoriteBtn.textContent();
    expect(textAfter).toBe('⭐');
  });

  test('comparison mode forces fullscreen display mode', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["Tokyo","Paris"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    // Fullscreen should be active (compress icon visible)
    const compressIcon = frame.locator('#compress-icon');
    await expect(compressIcon).toBeVisible();
  });

  test('comparison with 2 locations works', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["Tokyo","Paris"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    const cards = frame.locator('.comparison-card');
    await expect(cards).toHaveCount(2);
  });

  test('comparison with 4 locations works', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.selectOption('select >> nth=1', 'compare-weather');
    await page.waitForTimeout(500);

    await page
      .locator('textarea')
      .first()
      .fill('{"locations":["Tokyo","Paris","London","New York"]}');
    await page.click('button:has-text("Call Tool")');

    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const frame = getWeatherAppFrame(page);

    const cards = frame.locator('.comparison-card');
    await expect(cards).toHaveCount(4);
  });
});
