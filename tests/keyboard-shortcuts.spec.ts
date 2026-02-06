/**
 * Phase 4.1: Keyboard Shortcuts Tests
 */
import { test, expect } from '@playwright/test';
import { loadWeatherApp, getWeatherAppFrame } from './test-utils';

test.describe('Phase 4.1: Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await loadWeatherApp(page, 'Tokyo');
  });

  test('Ctrl+S toggles favorite', async ({ page }) => {
    // Get the weather app iframe
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Check initial state - should not be favorited
    const favoriteBtn = iframe.locator('#favorite-btn');
    await expect(favoriteBtn).toBeVisible();
    const starBefore = await favoriteBtn.textContent();
    expect(starBefore).toBe('☆');

    // Press Ctrl+S to toggle favorite
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);

    // Should now be favorited
    const starAfter = await favoriteBtn.textContent();
    expect(starAfter).toBe('⭐');

    // Press Ctrl+S again to unfavorite
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);

    // Should be back to unfavorited
    const starFinal = await favoriteBtn.textContent();
    expect(starFinal).toBe('☆');
  });

  test('Ctrl+B opens bookmarks modal', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Press Ctrl+B
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(500);

    // Modal should be visible
    const modal = iframe.locator('.bookmark-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Should contain bookmark header
    await expect(iframe.locator('text=Bookmark')).toBeVisible();
  });

  test('Ctrl+H shows search history', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Press Ctrl+H
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(500);

    // History dropdown should be visible
    const dropdown = iframe.locator('.search-history-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Should show Recent Searches header
    await expect(iframe.locator('text=Recent Searches')).toBeVisible();
  });

  test('Ctrl+/ shows keyboard shortcuts help', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Press Ctrl+/
    await page.keyboard.press('Control+/');
    await page.waitForTimeout(500);

    // Help modal should be visible
    const helpModal = iframe.locator('.shortcuts-modal');
    await expect(helpModal).toBeVisible({ timeout: 5000 });

    // Should contain shortcuts content
    await expect(iframe.locator('text=Keyboard Shortcuts')).toBeVisible();
    await expect(iframe.locator('text=Toggle favorite')).toBeVisible();
  });

  test('F1 shows keyboard shortcuts help', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Press F1
    await page.keyboard.press('F1');
    await page.waitForTimeout(500);

    // Help modal should be visible
    const helpModal = iframe.locator('.shortcuts-modal');
    await expect(helpModal).toBeVisible({ timeout: 5000 });
  });

  test('Ctrl+F focuses search input', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Press Ctrl+F
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(500);

    // Search input should be focused
    const searchInput = iframe.locator('#location-search');
    await expect(searchInput).toBeFocused({ timeout: 5000 });
  });

  test('Ctrl+R refreshes current weather', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Get current temperature
    const tempBefore = await iframe.locator('.current-temp').textContent();

    // Press Ctrl+R (should trigger refresh)
    await page.keyboard.press('Control+r');
    await page.waitForTimeout(2000);

    // Weather should still be visible (refresh completed)
    const tempAfter = await iframe.locator('.current-temp').textContent();
    expect(tempAfter).toBeTruthy();
    // Temperature should be same location
    expect(tempAfter).toBe(tempBefore);
  });

  test('Search history shows clicked location', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Open search history
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(500);

    // Should show Tokyo in history (from initial load)
    const historyItem = iframe.locator('.history-item').first();
    await expect(historyItem).toBeVisible();
    await expect(historyItem).toContainText('Tokyo');

    // Click on history item
    await historyItem.click();
    await page.waitForTimeout(1000);

    // Dropdown should close
    const dropdown = iframe.locator('.search-history-dropdown');
    await expect(dropdown).not.toBeVisible();

    // Weather should still be showing
    await expect(iframe.locator('.current-weather')).toBeVisible();
  });

  test('Close buttons work in modals', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);

    // Wait for weather content to load
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Open shortcuts help
    await page.keyboard.press('Control+/');
    await page.waitForTimeout(500);

    let modal = iframe.locator('.shortcuts-modal');
    await expect(modal).toBeVisible();

    // Click close button
    await iframe.locator('.close-shortcuts').click();
    await page.waitForTimeout(300);

    // Modal should be closed
    await expect(modal).not.toBeVisible();

    // Open search history
    await page.keyboard.press('Control+h');
    await page.waitForTimeout(500);

    const dropdown = iframe.locator('.search-history-dropdown');
    await expect(dropdown).toBeVisible();

    // Click close button
    await iframe.locator('.close-dropdown').click();
    await page.waitForTimeout(300);

    // Dropdown should be closed
    await expect(dropdown).not.toBeVisible();
  });
});
