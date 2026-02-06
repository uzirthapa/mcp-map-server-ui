# Testing Workflow for MCP Map Server UI

## Required Testing Before Commits

Before committing any UI changes to this project, you **MUST** follow this testing workflow to ensure the changes work correctly with the MCP Apps ecosystem.

## Prerequisites

1. **ext-apps repository** - Clone and set up the ext-apps repository:
   ```bash
   cd ~/Github
   git clone https://github.com/modelcontextprotocol/ext-apps
   cd ext-apps/examples/basic-host
   npm install
   ```

2. **Playwright MCP** - Ensure Playwright is installed for browser testing:
   ```bash
   npm install -D @playwright/test
   npx playwright install --with-deps
   ```

## Testing Workflow

### Step 1: Read Documentation

Before making changes, familiarize yourself with:
- [MCP Apps Documentation](https://modelcontextprotocol.io/docs/extensions/apps)
- [ext-apps GitHub](https://github.com/modelcontextprotocol/ext-apps)
- [ext-apps basic-host README](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host)

### Step 2: Build Your Changes

```bash
cd /path/to/mcp-map-server-ui
npm run build
```

### Step 3: Start the MCP Server

```bash
npm run start
```

The server will start on `http://localhost:3001/mcp`

### Step 4: Start ext-apps basic-host

In a **separate terminal**:

```bash
cd ~/Github/ext-apps/examples/basic-host
SERVERS='["http://localhost:3001/mcp"]' npm start
```

The basic-host will start on `http://localhost:8080`

### Step 5: Test with Playwright MCP

Use the Playwright MCP tools to test your changes:

```typescript
// Navigate to basic-host
await browser_navigate("http://localhost:8080")

// Wait for server connection
await browser_wait_for({ time: 3 })

// Select show-weather tool
await browser_select_option({
  element: "Tool dropdown",
  values: ["show-weather"]
})

// Call the tool
await browser_click({ element: "Call Tool button" })

// Test different screen sizes
await browser_resize({ width: 1280, height: 720 })  // Desktop
await browser_take_screenshot({ filename: "desktop-test.png" })

await browser_resize({ width: 768, height: 1024 })  // Tablet
await browser_take_screenshot({ filename: "tablet-test.png" })

await browser_resize({ width: 375, height: 667 })   // Mobile
await browser_take_screenshot({ filename: "mobile-test.png" })
```

### Step 6: Verify Requirements

Check that your changes meet these requirements:

#### Visual Layout
- [ ] All elements render correctly at desktop size (1280px+)
- [ ] Layout adapts properly at tablet size (768px)
- [ ] Layout works on mobile (375px)
- [ ] No horizontal scrolling
- [ ] Text is readable at all sizes

#### Functionality
- [ ] All buttons are clickable
- [ ] Search input is functional
- [ ] Interactive elements have proper hover states
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] No console errors in browser

#### MCP Apps Integration
- [ ] Tool results display correctly
- [ ] Activity log shows all actions
- [ ] External links work (sendOpenLink)
- [ ] Chat integration works (sendMessage)
- [ ] Display modes work (inline, fullscreen)

### Step 7: Run Automated Tests

```bash
npm run test
```

Ensure all Playwright tests pass.

### Step 8: Clean Up

Stop all background servers:
```bash
# In your terminals, press Ctrl+C to stop:
# - MCP server (port 3001)
# - basic-host (port 8080)
```

## Common Issues

### Issue: Layout Breaking at Certain Screen Sizes

**Cause:** Media queries with `flex-direction: column` or other layout changes
**Solution:** Use `flex-wrap: nowrap` and ensure flex properties are preserved across breakpoints

### Issue: Buttons Wrapping to New Lines

**Cause:** Missing `flex: 0 0 auto` or `white-space: nowrap` on buttons
**Solution:** Add these properties to prevent buttons from shrinking or wrapping

### Issue: Basic-Host Not Connecting

**Cause:** MCP server not running or wrong port
**Solution:** Verify server is running on port 3001 and SERVERS env var is correct

### Issue: Changes Not Appearing

**Cause:** Build not regenerated or browser cache
**Solution:** Run `npm run build` and hard-refresh browser (Ctrl+Shift+R)

## Commit Checklist

Before committing, verify:

- [ ] Read ext-apps documentation
- [ ] Built project (`npm run build`)
- [ ] Tested with basic-host at multiple screen sizes
- [ ] Used Playwright MCP to capture screenshots
- [ ] All automated tests pass (`npm run test`)
- [ ] No console errors
- [ ] Changes work on desktop, tablet, and mobile
- [ ] Documented any new features or changes

## Example Testing Session

See the commit history for examples of testing workflows. A good testing session includes:

1. **Before screenshots** - Showing the issue
2. **After screenshots** - Showing the fix
3. **Multiple screen sizes** - Desktop, tablet, mobile
4. **Console output** - Showing no errors
5. **Test results** - All tests passing

---

**Remember:** Testing with the actual MCP Apps ecosystem (ext-apps basic-host) is essential because it reveals issues that might not show up in standalone testing. Always test the full integration!
