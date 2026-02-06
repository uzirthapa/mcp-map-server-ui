/**
 * Shared test utilities for Playwright tests
 */
import { Page } from '@playwright/test';

/**
 * Load the weather app with a specific location in basic-host
 */
export async function loadWeatherApp(page: Page, location: string = 'Tokyo'): Promise<void> {
  // Navigate to basic-host
  await page.goto('http://localhost:8080');

  // Wait for page to load
  await page.waitForSelector('select', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Select show-weather tool (second select element)
  await page.selectOption('select >> nth=1', 'show-weather');
  await page.waitForTimeout(500);

  // Fill in location and call tool
  await page.locator('textarea').first().fill(`{"location":"${location}"}`);
  await page.click('button:has-text("Call Tool")');

  // Wait for iframe to load
  await page.waitForSelector('iframe', { timeout: 15000 });

  // Wait for nested iframe (proxy iframe contains the weather app iframe)
  await page.waitForTimeout(2000);

  // Wait for weather content to actually render inside the nested iframe
  const frame = getWeatherAppFrame(page);
  await frame.locator('#weather-content').waitFor({ state: 'visible', timeout: 15000 });

  // Extra time for all elements to initialize
  await page.waitForTimeout(1000);
}

/**
 * Get the weather app iframe locator (Frame 2 - the innermost iframe)
 */
export function getWeatherAppFrame(page: Page) {
  // The weather app is in a nested iframe structure:
  // Page -> iframe (proxy) -> iframe (weather app)
  // We need to chain the frameLocators to get to the innermost frame
  return page.frameLocator('iframe').first().frameLocator('iframe');
}
