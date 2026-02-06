# Testing Tools/ListChanged Notifications

## Overview

The MCP Map Server now supports the `tools/listChanged` notification capability. This allows the server to notify connected clients when its tool list changes dynamically.

## Implementation Details

### Server-side (server.ts)
- **Capability enabled:** `tools.listChanged: true` in server capabilities
- **Notification method:** `server.server.notification({ method: "notifications/tools/list_changed", params: {} })`
- **Test tool:** `test-tools-notification` - triggers the notification for testing

### Architecture Note
The `notifications/tools/list_changed` notification is primarily intended for **MCP host applications** (like basic-host, Claude Desktop, etc.), not for the individual apps running inside them. The host receives the notification and can refresh its tool list accordingly.

## Testing Methods

### Method 1: Using Playwright MCP with Basic-Host (Recommended)

1. **Start the MCP Server**
   ```bash
   cd /home/uzirthapa/Github/mcp-map-server-ui
   npm run build
   npm start
   ```

2. **Ensure basic-host is running**
   ```bash
   # In another terminal
   cd /path/to/ext-apps/examples/basic-host
   SERVERS='["http://localhost:3001/mcp"]' npm start
   ```

3. **Use Playwright MCP to test**
   - Navigate to http://localhost:8080
   - Select "test-tools-notification" from the Tool dropdown
   - Click "Call Tool"
   - **Expected Result:** Tool returns message "Sent tools/list_changed notification to all connected clients"

4. **Verification**
   - The tool result will confirm the notification was sent
   - Check browser console for any notification-related logs from the host
   - The host (basic-host) receives the notification on its MCP connection

### Method 2: Manual Testing with Browser DevTools

1. Open basic-host at http://localhost:8080
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Select "test-tools-notification" tool
5. Click "Call Tool"
6. Monitor console for:
   - `[HOST] Calling tool test-tools-notification`
   - Any notification-related messages from the MCP connection

### Method 3: Testing with MCP Inspector

If using the MCP Inspector tool:

1. Connect Inspector to http://localhost:3001/mcp
2. Call the `test-tools-notification` tool
3. Monitor the notification events in the Inspector
4. Should see `notifications/tools/list_changed` event

## Real-World Usage Scenarios

### Scenario 1: Dynamic Tool Registration
In a production environment, the server might add/remove tools based on:
- User permissions changing
- External services becoming available/unavailable
- Feature flags being toggled
- Plugin systems loading/unloading modules

When any of these occur, the server would:
```typescript
// After adding/removing a tool dynamically
await server.server.notification({
  method: "notifications/tools/list_changed",
  params: {},
});
```

### Scenario 2: Host Response
When a host (like basic-host) receives the notification:
1. Host calls `server.listTools()` to get updated tool list
2. Host updates its UI tool selector
3. Host may show a user notification: "New tools available!"

## Testing with Playwright Tests

Example test case:

```typescript
import { test, expect } from '@playwright/test';

test('test-tools-notification triggers notification', async ({ page }) => {
  // Navigate to basic-host
  await page.goto('http://localhost:8080');
  await page.waitForSelector('select');

  // Select the test tool
  await page.selectOption('select >> nth=1', 'test-tools-notification');

  // Call the tool
  await page.click('button:has-text("Call Tool")');
  await page.waitForTimeout(2000);

  // Verify the result message
  const resultText = await page.textContent('.tool-result');
  expect(resultText).toContain('Sent tools/list_changed notification');
});
```

## Verification Checklist

- ✅ Server capability `tools.listChanged` is set to `true`
- ✅ Test tool `test-tools-notification` is registered
- ✅ Calling test tool returns success message
- ✅ Notification is sent via `server.server.notification()`
- ✅ Host can receive and process the notification
- ✅ No errors in browser console
- ✅ Tool result confirms notification was sent

## Known Limitations

1. **App-side handling:** Individual MCP Apps (like weather-app) don't directly handle this notification. It's designed for the host application.

2. **Basic-host response:** The current basic-host implementation may not visibly respond to the notification, but it does receive it on the MCP connection.

3. **Notification scope:** The notification is broadcast to all connected clients. In a multi-client scenario, all hosts would receive it.

## Troubleshooting

### Notification not received
- Check server logs for any errors
- Verify the server capability is enabled
- Ensure basic-host is properly connected to the MCP server
- Check browser console for WebSocket/connection errors

### Tool not appearing
- Rebuild the server: `npm run build`
- Restart the server: `npm start`
- Refresh basic-host page
- Check that server lists the tool in startup logs

## Future Enhancements

Potential improvements for production use:
1. Add UI notification in basic-host when tools change
2. Automatic tool list refresh in host
3. Logging of notification events
4. Rate limiting for notification broadcasts
5. Notification history/debugging panel

## References

- [MCP Specification - Capabilities](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/capabilities/)
- [ext-apps Documentation](https://github.com/modelcontextprotocol/ext-apps)
- [Basic-host Example](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host)
