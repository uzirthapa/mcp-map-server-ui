/**
 * Setup verification test
 * Ensures that the basic-host and MCP server are running correctly
 */
import { test, expect } from '@playwright/test';

test.describe('Test Environment Setup', () => {
  test('basic-host loads successfully', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Wait for select elements to load
    await page.waitForSelector('select', { timeout: 10000 });

    // Should see the tool selector (second select element)
    await expect(page.locator('select').nth(1)).toBeVisible();
  });

  test('can select show-weather tool', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Wait for page to load
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Select show-weather tool (using the second select element)
    await page.selectOption('select >> nth=1', 'show-weather');

    // Wait a bit for the input to appear
    await page.waitForTimeout(500);

    // Should see input field
    await expect(page.locator('textarea').first()).toBeVisible();
  });

  test('weather app loads in iframe', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Wait for page to load
    await page.waitForSelector('select', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Select show-weather tool
    await page.selectOption('select >> nth=1', 'show-weather');
    await page.waitForTimeout(500);

    // Fill in location
    await page.locator('textarea').first().fill('{"location":"Tokyo"}');
    await page.click('button:has-text("Call Tool")');

    // Wait for iframe to load
    await page.waitForSelector('iframe', { timeout: 15000 });

    // Should have iframe
    const frames = page.frames();
    expect(frames.length).toBeGreaterThan(1);
  });
});
