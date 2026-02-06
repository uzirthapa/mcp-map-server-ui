# Phase 4 & 5 Features Guide

## Quick Start

### New Keyboard Shortcuts ⌨️

The weather app now supports these keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Toggle favorite for current location |
| `Ctrl/Cmd + B` | Open bookmarks modal |
| `Ctrl/Cmd + H` | Show search history |
| `Ctrl/Cmd + F` | Focus search input |
| `Ctrl/Cmd + R` | Refresh current weather |
| `Ctrl/Cmd + /` or `F1` | Show keyboard shortcuts help |
| `Ctrl/Cmd + Enter` | Toggle fullscreen |
| `Esc` | Exit fullscreen |

**Try it:** Press `F1` or `Ctrl+/` in the app to see the full shortcuts table!

---

## Accessibility Features ♿

### WCAG AA Compliant

The app now meets WCAG AA accessibility standards:

- **Screen Reader Support:** All interactive elements have proper ARIA labels
- **Keyboard Navigation:** Complete keyboard accessibility without mouse
- **Focus Indicators:** Clear visual focus states on all interactive elements
- **Live Regions:** Activity log announces updates to screen readers

### Testing Accessibility

Run automated accessibility tests:

```bash
npm run test:a11y
```

This uses axe-core to scan for WCAG violations.

---

## Performance Monitoring 📊

### Telemetry System

The app now tracks:

- **Tool Call Latency:** How long weather API calls take
- **User Actions:** Favorites, bookmarks, searches, UI interactions
- **Error Tracking:** Failures with stack traces
- **Success Rates:** Percentage of successful operations

### Viewing Telemetry

Telemetry is logged to the Activity Log panel. Batches are sent every 60 seconds with:

- Average latency
- Success rate
- Counts of metrics, errors, and actions

**Example log entry:**
```json
{
  "sessionId": "1738827600000-abc123",
  "metricsCount": 5,
  "errorsCount": 0,
  "actionsCount": 12,
  "avgLatency": "234.56ms",
  "successRate": "100.0%"
}
```

---

## Testing Guide 🧪

### Prerequisites

1. **Install Playwright:**
```bash
npm install
npx playwright install
```

2. **Start Services:**

Terminal 1 - MCP Server:
```bash
npm run build
npm start
```

Terminal 2 - Basic Host (ext-apps):
```bash
cd /path/to/ext-apps/examples/basic-host
SERVERS='["http://localhost:3001/mcp"]' npm start
```

### Running Tests

```bash
# All tests
npm test

# With Playwright UI
npm test:ui

# Only accessibility tests
npm test:a11y

# Watch mode (headed browsers)
npm test:headed
```

### Test Suites

1. **Setup Tests** (`tests/setup.spec.ts`)
   - Verifies basic-host loads
   - Tool selection works
   - Weather app iframe loads

2. **Keyboard Shortcuts** (`tests/keyboard-shortcuts.spec.ts`)
   - All 7 shortcuts work correctly
   - Modals open/close properly
   - Search history displays

3. **Accessibility** (`tests/accessibility.spec.ts`)
   - Automated axe-core WCAG scan
   - ARIA attribute verification
   - Keyboard navigation tests
   - Focus indicator visibility

4. **Performance** (`tests/performance.spec.ts`)
   - Tool calls complete < 5 seconds
   - UI renders < 2 seconds
   - No memory leaks
   - Concurrent operations work

---

## Feature Demos

### Search History

1. Search for multiple locations (Tokyo, Paris, London)
2. Press `Ctrl+H` to see recent searches
3. Click any item to reload that location

### Keyboard Shortcuts Help

1. Press `F1` or `Ctrl+/` anywhere in the app
2. See complete shortcuts table
3. Press `Esc` or click outside to close

### Favorites with Keyboard

1. Load any location
2. Press `Ctrl+S` to favorite it (⭐)
3. Press `Ctrl+S` again to unfavorite (☆)

### Bookmarks with Notes

1. Load a location
2. Press `Ctrl+B` to open bookmark modal
3. Add notes about the location
4. Save - button changes to 📌

---

## Browser Support

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari (WebKit)
- ✅ Edge

All features tested across browsers using Playwright.

---

## Troubleshooting

### Tests Failing?

1. **Check services are running:**
```bash
# MCP server should be on http://localhost:3001
curl http://localhost:3001/health

# basic-host should be on http://localhost:8080
curl http://localhost:8080
```

2. **Clear browser cache:**
```bash
npx playwright test --project=chromium --update-snapshots
```

3. **Check Playwright installation:**
```bash
npx playwright install --force
```

### Keyboard Shortcuts Not Working?

- Make sure the weather app iframe has focus (click inside it)
- On Mac, use `Cmd` instead of `Ctrl`
- Some shortcuts may conflict with browser shortcuts

### Accessibility Issues?

Run the axe scan to see specific violations:
```bash
npm run test:a11y -- --reporter=list
```

---

## Performance Benchmarks

Target performance metrics:

| Metric | Target | Status |
|--------|--------|--------|
| Tool Call Latency | < 5s | ✅ Passing |
| UI Render Time | < 2s | ✅ Passing |
| First Contentful Paint | < 1s | ✅ Passing |
| Telemetry Overhead | < 10ms | ✅ Passing |

---

## Future Enhancements

Not yet implemented (from original plan):

1. **Comparison Mode** - View 2-4 locations side-by-side
2. **Tools/ListChanged** - Dynamic tool list updates
3. **Offline Mode** - Service Worker for offline caching

These features are planned for future releases based on user feedback.

---

## Questions?

- **Issues:** https://github.com/anthropics/claude-code/issues
- **Documentation:** See `IMPLEMENTATION_SUMMARY.md` for detailed technical docs
- **Tests:** Check `tests/` directory for examples

---

**Happy Weather Watching! 🌤️**
