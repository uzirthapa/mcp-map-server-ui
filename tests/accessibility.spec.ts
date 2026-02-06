/**
 * Phase 5.1: Accessibility (WCAG AA) Tests
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadWeatherApp, getWeatherAppFrame } from './test-utils';

test.describe('Phase 5.1: Accessibility (WCAG AA)', () => {
  test.beforeEach(async ({ page }) => {
    await loadWeatherApp(page, 'Tokyo');
  });

  test('should not have any automatically detectable WCAG A & AA violations', async ({ page }) => {
    // Wait for weather content to load
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Nodes: ${violation.nodes.length}`);
      });
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('all interactive elements have proper ARIA labels', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Search input
    const searchInput = iframe.locator('#location-search');
    await expect(searchInput).toHaveAttribute('aria-label');

    // Search button
    const searchBtn = iframe.locator('#search-btn');
    await expect(searchBtn).toHaveAttribute('aria-label');

    // Favorite button
    const favoriteBtn = iframe.locator('#favorite-btn');
    await expect(favoriteBtn).toHaveAttribute('aria-label');
    await expect(favoriteBtn).toHaveAttribute('aria-pressed');

    // Bookmark button
    const bookmarkBtn = iframe.locator('#bookmark-btn');
    await expect(bookmarkBtn).toHaveAttribute('aria-label');
    await expect(bookmarkBtn).toHaveAttribute('aria-pressed');

    // Fullscreen button
    const fullscreenBtn = iframe.locator('#fullscreen-btn');
    await expect(fullscreenBtn).toHaveAttribute('aria-label');
    await expect(fullscreenBtn).toHaveAttribute('aria-pressed');
  });

  test('activity log has correct ARIA attributes', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Log header (expandable)
    const logHeader = iframe.locator('#logging-header');
    await expect(logHeader).toHaveAttribute('role', 'button');
    await expect(logHeader).toHaveAttribute('aria-expanded');
    await expect(logHeader).toHaveAttribute('aria-controls', 'logging-content');

    // Log content
    const logContent = iframe.locator('#logging-content');
    await expect(logContent).toHaveAttribute('role', 'log');
    await expect(logContent).toHaveAttribute('aria-live', 'polite');
    await expect(logContent).toHaveAttribute('aria-atomic', 'false');
  });

  test('favorite button has correct ARIA state when toggled', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    const favoriteBtn = iframe.locator('#favorite-btn');

    // Initial state - not favorited
    let ariaPressed = await favoriteBtn.getAttribute('aria-pressed');
    expect(ariaPressed).toBe('false');

    let ariaLabel = await favoriteBtn.getAttribute('aria-label');
    expect(ariaLabel).toContain('Add to favorites');

    // Click to favorite
    await favoriteBtn.click();
    await page.waitForTimeout(500);

    // Should be favorited
    ariaPressed = await favoriteBtn.getAttribute('aria-pressed');
    expect(ariaPressed).toBe('true');

    ariaLabel = await favoriteBtn.getAttribute('aria-label');
    expect(ariaLabel).toContain('Remove from favorites');

    // Click to unfavorite
    await favoriteBtn.click();
    await page.waitForTimeout(500);

    // Should be back to unfavorited
    ariaPressed = await favoriteBtn.getAttribute('aria-pressed');
    expect(ariaPressed).toBe('false');
  });

  test('fullscreen button updates ARIA state correctly', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    const fullscreenBtn = iframe.locator('#fullscreen-btn');

    // Initial state - not fullscreen
    let ariaPressed = await fullscreenBtn.getAttribute('aria-pressed');
    expect(ariaPressed).toBe('false');

    let ariaLabel = await fullscreenBtn.getAttribute('aria-label');
    expect(ariaLabel).toContain('Enter fullscreen');

    // Toggle fullscreen
    await fullscreenBtn.click();
    await page.waitForTimeout(1000);

    // Should be fullscreen
    ariaPressed = await fullscreenBtn.getAttribute('aria-pressed');
    expect(ariaPressed).toBe('true');

    ariaLabel = await fullscreenBtn.getAttribute('aria-label');
    expect(ariaLabel).toContain('Exit fullscreen');
  });

  test('forecast toggle button updates ARIA state', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    const forecastToggle = iframe.locator('#forecast-toggle-btn');

    // Initial state - forecast hidden
    let ariaExpanded = await forecastToggle.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');

    // Toggle forecast
    await forecastToggle.click();
    await page.waitForTimeout(500);

    // Should be expanded
    ariaExpanded = await forecastToggle.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('true');

    let ariaLabel = await forecastToggle.getAttribute('aria-label');
    expect(ariaLabel).toContain('Hide');
  });

  test('activity log toggle updates ARIA state', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    const logHeader = iframe.locator('#logging-header');

    // Initial state - collapsed
    let ariaExpanded = await logHeader.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');

    // Toggle log
    await logHeader.click();
    await page.waitForTimeout(500);

    // Should be expanded
    ariaExpanded = await logHeader.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('true');
  });

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Tab through elements
    await page.keyboard.press('Tab');
    let focusedElement = await iframe.locator(':focus').count();
    expect(focusedElement).toBeGreaterThan(0);

    // Should be able to activate with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  });

  test('focus is visible on all interactive elements', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    const interactiveElements = [
      '#location-search',
      '#search-btn',
      '#favorite-btn',
      '#bookmark-btn',
      '#fullscreen-btn',
    ];

    for (const selector of interactiveElements) {
      const element = iframe.locator(selector);
      await element.focus();

      // Check outline or box-shadow
      const outline = await element.evaluate(el =>
        window.getComputedStyle(el).outline
      );
      const boxShadow = await element.evaluate(el =>
        window.getComputedStyle(el).boxShadow
      );

      // Should have visible focus indicator
      const hasFocusIndicator =
        (outline && outline !== 'none' && outline !== 'rgb(0, 0, 0) none 0px') ||
        (boxShadow && boxShadow !== 'none');

      expect(hasFocusIndicator).toBe(true);
    }
  });

  test('logging header can be activated with keyboard', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    const logHeader = iframe.locator('#logging-header');

    // Focus the log header
    await logHeader.focus();

    // Initial state - collapsed
    let ariaExpanded = await logHeader.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');

    // Activate with Enter key
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Should be expanded
    ariaExpanded = await logHeader.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('true');

    // Activate with Space key
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Should be collapsed again
    ariaExpanded = await logHeader.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');
  });

  test('search has proper role and labels', async ({ page }) => {
    const iframe = getWeatherAppFrame(page);
    await iframe.locator('#weather-content').waitFor({ timeout: 10000 });

    // Controls section should have search role
    const controlsSection = iframe.locator('.controls-section');
    await expect(controlsSection).toHaveAttribute('role', 'search');
    await expect(controlsSection).toHaveAttribute('aria-label');
  });
});
