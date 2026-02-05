# MCP Apps Testing Server

Comprehensive MCP Apps capability testing suite featuring a Weather Dashboard and 3D Globe viewer. This project systematically tests and demonstrates all Model Context Protocol (MCP) Apps features.

## 🎯 Project Purpose

This server demonstrates and tests the full spectrum of MCP Apps capabilities through interactive UI applications that communicate bidirectionally with MCP servers and host applications.

## 📦 What's Included

### 1. **Weather Dashboard** (Primary Test App)
Interactive weather application with comprehensive MCP Apps API testing.

### 2. **3D Globe Viewer**
CesiumJS-based globe with OpenStreetMap tiles for geographic visualization.

---

## ✅ MCP Apps Features - Testing Progress

### **Fully Implemented & Tested** ✅

| Feature | API | Implementation | Status |
|---------|-----|----------------|--------|
| **Tool Calling from UI** | `callServerTool()` | Search box + Quick city buttons | ✅ Complete |
| **Chat Integration** | `sendMessage()` | "Tell Claude" button | ✅ Complete |
| **External Links** | `sendOpenLink()` | "Open Weather.com" button | ✅ Complete |
| **Structured Logging** | `sendLog()` | Activity log panel (3 levels) | ✅ Complete |
| **Size Hints** | `sendSizeChanged()` | 1200px viewport height | ✅ Complete |
| **Tool Results** | `ontoolresult` | Initial weather data handler | ✅ Complete |
| **Tool Input** | `ontoolinput` | Parameter handling | ✅ Complete |
| **Error Handling** | `onerror` | App-level error handler | ✅ Complete |
| **Teardown** | `onteardown` | Cleanup handler | ✅ Complete |
| **UI Resources** | `registerAppResource()` | 2 UI resources (weather + map) | ✅ Complete |
| **CSP Configuration** | `_meta.ui.csp` | External domain whitelisting | ✅ Complete |
| **Tool Metadata** | `_meta` | Weather data + viewUUID | ✅ Complete |

### **Partially Implemented** 🚧

| Feature | Status | Notes |
|---------|--------|-------|
| **Display Modes** | 🟢 Complete | Both apps support fullscreen/inline with `requestDisplayMode()` |
| **Host Context** | 🟢 Complete | Both apps read display mode and theme via `onhostcontextchanged` |
| **Keyboard Shortcuts** | 🟢 Complete | Both apps: Esc (exit fullscreen), Ctrl+Enter (toggle) |
| **Theme Detection** | 🟢 Complete | Both apps detect and apply light/dark themes |
| **State Persistence** | 🟡 Partial | Map uses localStorage, weather doesn't |
| **Model Context Updates** | 🟡 Partial | Map sends screenshots, weather doesn't |

### **Not Yet Implemented** ❌

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| **PiP Display Mode** | Medium | Low | CSS ready, need host support testing |
| **Tool List Changes** | Medium | Low | `tools/listChanged` notifications |
| **Advanced Persistence** | Medium | Medium | Favorites, history, bookmarks |
| **Real-time Updates** | Medium | Medium | Auto-refresh, live data |
| **Comparison Mode** | Low | High | Multiple locations side-by-side |
| **Advanced Forms** | Low | Medium | Multi-step forms, validation |
| **Accessibility** | Low | Medium | Full ARIA, screen reader support |
| **Offline Mode** | Low | High | Service worker, caching |
| **Performance Metrics** | Low | Low | Telemetry and monitoring |

---

## 🌦️ Weather Dashboard Features

The Weather Dashboard is the primary testing application demonstrating core MCP Apps capabilities:

### **Interactive Features**
- 🔍 **Location Search** - Search any city or place using `callServerTool()`
- 🌍 **Quick Cities** - One-click weather for 6 popular cities
- 💬 **Tell Claude** - Send weather summaries to chat via `sendMessage()`
- 🌐 **Open Weather.com** - External browser links via `sendOpenLink()`
- 📝 **Activity Log** - Real-time structured logging with `sendLog()`
- ⛶ **Fullscreen Mode** - Toggle display modes with `requestDisplayMode()`
- 🎨 **Theme Detection** - Responds to light/dark mode changes
- ⌨️ **Keyboard Shortcuts** - Ctrl+Enter (toggle fullscreen), Escape (exit)

### **Weather Data**
- Current conditions with temperature, humidity, wind speed, UV index
- 7-day forecast with high/low temperatures (collapsible)
- Weather condition icons
- Geo-coordinates display

### **Technical Details**
- Uses Open-Meteo API (no API key required)
- OpenStreetMap Nominatim for geocoding
- Dynamic viewport height (969-1580px based on visible components)
- Responsive design
- Theme adaptation (light/dark backgrounds)
- Error handling and recovery

---

## 🗺️ Globe Viewer Features

Interactive 3D globe with geographic visualization:

- **3D Globe Rendering** - CesiumJS with OpenStreetMap tiles
- **Geocoding Integration** - Search and locate places
- **Camera Persistence** - Saves view state in localStorage
- **Display Modes** - Fullscreen and inline support
- **Model Context Updates** - Sends screenshots to Claude
- **Shuffle Cities** - Random city exploration
- **Keyboard Shortcuts** - Esc, Ctrl+Enter for fullscreen control

---

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Development

```bash
npm run dev
```

Runs both Vite watcher and HTTP server concurrently with hot reload.

### Production

```bash
npm run start        # or npm run start:http
```

Server runs at `http://localhost:3001/mcp`

For stdio transport:
```bash
npm run start:stdio
```

---

## 🧪 Testing

### Option 1: Basic-Host Test Interface

The [ext-apps basic-host](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host) provides a simple test UI:

```bash
# Clone ext-apps repo
git clone https://github.com/modelcontextprotocol/ext-apps
cd ext-apps/examples/basic-host

# Install and start
npm install
SERVERS='["http://localhost:3001/mcp"]' npm start
```

Open `http://localhost:8080` and test the tools.

### Option 2: Claude (Web or Desktop)

Use [custom connectors](https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp) to connect Claude to your deployed server.

For local testing, use `cloudflared` tunnel:

```bash
npx cloudflared tunnel --url http://localhost:3001
```

Add the generated URL as a custom connector in Claude settings.

### Option 3: VS Code (Insiders)

VS Code Insiders supports MCP Apps. Configure your server in VS Code settings.

---

## 🔬 How to See Each MCP Apps Function Being Tested

This section provides **specific prompts** and **observable behaviors** for testing each MCP Apps API.

### 1. **`ontoolresult` - Initial Tool Result Handler**

**How It's Tested:** Receives weather data when tool is first called

**Prompt:**
```
Show me the weather in Seattle
```

**What to Observe:**
- ✅ Weather dashboard loads immediately
- ✅ Current temperature, conditions, and 7-day forecast display
- ✅ Activity log shows: "Initial weather data rendered for Seattle"
- ✅ No errors in console

**Behind the Scenes:**
The `ontoolresult` handler receives the `show-weather` tool result containing weather data in `_meta.weatherData`, then renders the UI.

---

### 2. **`callServerTool()` - Search Box**

**How It's Tested:** Search input calls `show-weather` tool from the UI

**Prompt:**
1. First get the weather dashboard loaded (use prompt above)
2. In the search box, type: `Tokyo`
3. Click "🔍 Search" or press Enter

**What to Observe:**
- ✅ Search button shows loading spinner
- ✅ Weather updates to Tokyo
- ✅ Activity log shows:
  ```
  Searching for location: Tokyo
  Weather tool result received
  Weather rendered for Tokyo
  ```
- ✅ Search button re-enables after completion

**Behind the Scenes:**
The UI calls `app.callServerTool({ name: "show-weather", arguments: { location: "Tokyo" }})` which makes a round-trip to the MCP server.

---

### 3. **`callServerTool()` - Quick City Buttons**

**How It's Tested:** City chips call `show-weather` tool with preset locations

**Prompt:**
1. Load weather dashboard
2. Click any city chip (e.g., "Paris", "London", "Dubai")

**What to Observe:**
- ✅ Weather immediately updates to selected city
- ✅ Activity log shows: "Searching for location: [City]"
- ✅ All UI elements update (temp, forecast, location header)
- ✅ Button remains clickable (no loading state needed for presets)

**Behind the Scenes:**
Each city chip triggers `callServerTool()` with a known city name, testing batch tool calls.

---

### 4. **`sendMessage()` - Tell Claude Button**

**How It's Tested:** Sends weather summary to chat

**Prompt:**
1. Load weather dashboard for any location
2. Click "💬 Tell Claude" button

**What to Observe:**
- ✅ A new message appears in the chat from you (the user):
  ```
  The weather in Tokyo is currently 12°C and partly cloudy.
  It feels like 10°C with 65% humidity.
  ```
- ✅ Activity log shows:
  ```
  Sending message to chat [message content]
  Message sent to chat successfully
  ```
- ✅ Claude can now respond to this weather information

**Behind the Scenes:**
The UI calls `app.sendMessage({ content: [{ type: "text", text: message }], role: "user" })` which posts a message to the chat as if you typed it.

---

### 5. **`sendOpenLink()` - Open Weather.com Button**

**How It's Tested:** Opens external URL in browser

**Prompt:**
1. Load weather dashboard for any location
2. Click "🌐 View on Weather.com" button

**What to Observe:**
- ✅ Browser opens a new tab/window with Weather.com
- ✅ URL includes coordinates: `https://weather.com/weather/today/l/[lat],[lon]`
- ✅ Weather.com shows the same location
- ✅ Activity log shows:
  ```
  Opening Weather.com for Tokyo https://weather.com/weather/today/l/35.68,139.69
  Link opened successfully
  ```

**Behind the Scenes:**
The UI calls `app.sendOpenLink({ url: "https://weather.com/..." })` which requests the host to open the URL.

---

### 6. **`sendLog()` - Activity Log Panel**

**How It's Tested:** All app activities are logged with different levels

**Prompt:**
1. Load weather dashboard
2. Perform various actions (search, click cities, tell Claude, etc.)
3. Click "📝 Activity Log" header to expand

**What to Observe:**
- ✅ Log panel shows all activities with timestamps
- ✅ Color-coded entries:
  - **Blue (info)**: Normal operations (searches, renders)
  - **Yellow (warning)**: Warnings (no data, edge cases)
  - **Red (error)**: Errors (failed API calls, exceptions)
- ✅ Auto-scrolls to latest entry
- ✅ Log count updates: "(12)" shows number of log entries
- ✅ Can collapse/expand with ▼/▶ arrow

**Behind the Scenes:**
Every significant action calls `app.sendLog({ level: "info"|"warning"|"error", data: message, logger: "weather-app" })` which sends structured logs to the host.

---

### 7. **`sendSizeChanged()` - Viewport Height Hint**

**How It's Tested:** App requests preferred height on load

**Prompt:**
```
Show me the weather in any city
```

**What to Observe:**
- ✅ Weather dashboard renders at 1200px height
- ✅ No scrolling needed inside the viewport
- ✅ All content (search, forecast, log) is visible without scrolling
- ✅ Activity log shows: "Sent initial size 1200"

**Behind the Scenes:**
On initialization, the app calls `app.sendSizeChanged({ height: 1200 })` to tell the host its preferred size.

---

### 8. **`ontoolinput` - Tool Parameter Handler**

**How It's Tested:** Receives tool parameters before result

**Prompt:**
```
Show me the weather in Paris with coordinates 48.8566, 2.3522
```

**What to Observe:**
- ✅ Weather loads for Paris
- ✅ Activity log may show tool input received (if logged)
- ✅ Parameters are processed correctly

**Behind the Scenes:**
The `ontoolinput` handler receives parameters before the tool executes, allowing the UI to prepare or show loading states.

---

### 9. **`onerror` - Error Handler**

**How It's Tested:** Handles app-level errors gracefully

**Prompt:**
1. Load weather dashboard
2. Search for invalid/nonsense location: `asdfghjkl12345`

**What to Observe:**
- ✅ Error message displays in the UI
- ✅ App doesn't crash
- ✅ Activity log shows red error entry
- ✅ Search box remains functional
- ✅ Can search for valid location after error

**Behind the Scenes:**
The `onerror` handler catches unhandled errors and logs them via `sendLog()` instead of crashing.

---

### 10. **`onteardown` - Cleanup Handler**

**How It's Tested:** Called when app is being destroyed

**Prompt:**
1. Load weather dashboard
2. Navigate away or close the chat

**What to Observe:**
- ✅ Activity log shows: "App is being torn down" (before navigation)
- ✅ No memory leaks or errors
- ✅ Clean shutdown

**Behind the Scenes:**
The `onteardown` handler performs cleanup (clear timers, close connections) before the app is removed.

---

### 11. **UI Resources - Weather Dashboard HTML**

**How It's Tested:** Server serves bundled HTML via `registerAppResource()`

**Prompt:**
```
Show me the weather in Berlin
```

**What to Observe:**
- ✅ Complete weather UI loads (not raw HTML)
- ✅ All styles and scripts are embedded
- ✅ Interactive elements work (buttons, inputs)
- ✅ Single HTML file (no external JS/CSS)

**Behind the Scenes:**
The server's `registerAppResource()` serves the bundled `weather-app.html` which includes all CSS/JS inline (via vite-plugin-singlefile).

---

### 12. **Tool Metadata - Weather Data in `_meta`**

**How It's Tested:** Server includes weather data in tool result metadata

**Prompt:**
```
Show me the weather in Sydney
```

**What to Observe:**
- ✅ Weather data loads correctly
- ✅ All fields present (temp, humidity, forecast, etc.)
- ✅ No "undefined" values in UI

**Behind the Scenes:**
The server's `show-weather` tool returns:
```javascript
{
  content: [...],
  _meta: {
    viewUUID: "...",
    weatherData: { location: "Sydney", current: {...}, forecast: [...] }
  }
}
```

---

### 13. **CSP Configuration - External API Access**

**How It's Tested:** App can fetch from Open-Meteo and OSM via CSP whitelist

**Prompt:**
```
Show me the weather in Mumbai
```

**What to Observe:**
- ✅ Weather data loads (from Open-Meteo API)
- ✅ Geocoding works (from OSM Nominatim)
- ✅ No CSP errors in browser console
- ✅ All images/icons load

**Behind the Scenes:**
The server's resource registration includes:
```javascript
_meta: {
  ui: {
    csp: {
      connectDomains: ["https://api.open-meteo.com", "https://*.openstreetmap.org"],
      resourceDomains: [...]
    }
  }
}
```

---

### 14. **`requestDisplayMode()` - Fullscreen Toggle**

**How It's Tested:** Fullscreen button switches display modes

**Prompt:**
1. Load weather dashboard for any location
2. Click the fullscreen button (⛶) in the top-right corner
3. Or press **Ctrl+Enter** (or Cmd+Enter on Mac)

**What to Observe:**
- ✅ Weather dashboard expands to fullscreen
- ✅ Fullscreen button icon changes to compress icon (⛶ → ⛉)
- ✅ Button tooltip updates: "Exit fullscreen"
- ✅ Activity log shows: "Requesting display mode: fullscreen"
- ✅ Press **Escape** or click button again to exit fullscreen
- ✅ Activity log shows: "Requesting display mode: inline"

**Behind the Scenes:**
The UI calls `app.requestDisplayMode({ mode: "fullscreen" })` which asks the host to change the display mode. The host responds via `onhostcontextchanged`.

---

### 15. **`onhostcontextchanged` - Display Mode & Theme**

**How It's Tested:** App responds to host context changes

**Prompt:**
1. Load weather dashboard
2. Change your system theme (light ↔ dark) or display mode

**What to Observe:**
- ✅ Activity log shows: "Host context changed { theme: 'light'|'dark', displayMode: '...' }"
- ✅ Background gradient adapts:
  - **Light theme**: Purple gradient (#667eea → #764ba2)
  - **Dark theme**: Dark blue gradient (#2c3e50 → #34495e)
- ✅ Display mode CSS classes applied to body
- ✅ UI responds immediately without reload

**Behind the Scenes:**
The `onhostcontextchanged` handler receives context updates from the host and applies theme/mode classes to `document.body`.

---

### 16. **Keyboard Shortcuts - Display Mode Control**

**How It's Tested:** Keyboard commands for fullscreen

**Actions:**
1. Load weather dashboard
2. Press **Ctrl+Enter** (or **Cmd+Enter** on Mac)
3. Press **Escape** when in fullscreen

**What to Observe:**
- ✅ **Ctrl+Enter**: Toggles fullscreen on/off
- ✅ **Escape**: Exits fullscreen (only works when in fullscreen)
- ✅ Activity log shows mode change requests
- ✅ Fullscreen button state syncs with keyboard actions
- ✅ Search input shortcuts still work (Enter to search)

**Behind the Scenes:**
Global `keydown` event listener detects shortcuts and calls `toggleFullscreen()` which uses `requestDisplayMode()`.

---

## 🎯 Testing Checklist

Use this checklist to verify all MCP Apps features:

**Core APIs (Phase 1):**
- [ ] **ontoolresult** - Weather loads on initial call
- [ ] **callServerTool** - Search box updates weather
- [ ] **callServerTool** - Quick city buttons work
- [ ] **sendMessage** - Tell Claude sends message to chat
- [ ] **sendOpenLink** - Weather.com opens in browser
- [ ] **sendLog** - Activity log shows all actions
- [ ] **sendSizeChanged** - UI is 1200px tall, no scrolling
- [ ] **ontoolinput** - Parameters handled correctly
- [ ] **onerror** - Invalid searches show errors gracefully
- [ ] **onteardown** - Clean shutdown on navigation
- [ ] **UI Resources** - Complete dashboard loads
- [ ] **Tool Metadata** - All weather data displays
- [ ] **CSP Config** - External APIs work without errors

**Display & Themes (Phase 2):**
- [ ] **requestDisplayMode** - Fullscreen button toggles mode
- [ ] **onhostcontextchanged** - Theme and display mode changes applied
- [ ] **Keyboard Shortcuts** - Ctrl+Enter toggles, Escape exits fullscreen
- [ ] **Theme Detection** - Light/dark theme switching works
- [ ] **Fullscreen Button** - Icon updates, tooltip changes

**All features passing?** ✅ MCP Apps APIs fully tested!

---

## 🔧 Available Tools

### `show-weather`

Display weather dashboard for a location.

**Parameters:**
- `location` (string, optional) - City or place name
- `latitude` (number, optional) - Latitude coordinate
- `longitude` (number, optional) - Longitude coordinate

**Example:**
```json
{
  "location": "Paris"
}
```

Returns weather dashboard UI with current conditions and 7-day forecast.

### `show-map`

Display 3D globe at a bounding box location.

**Parameters:**
- `west` (number) - Western longitude
- `south` (number) - Southern latitude
- `east` (number) - Eastern longitude
- `north` (number) - Northern latitude
- `label` (string, optional) - Location label

**Example:**
```json
{
  "west": 2.29,
  "south": 48.85,
  "east": 2.3,
  "north": 48.86,
  "label": "Eiffel Tower"
}
```

### `shuffle-cities`

Display a random city on the map.

**Parameters:** None

### `geocode`

Search for places and get coordinates.

**Parameters:**
- `query` (string) - Place name or address

**Example:**
```json
{
  "query": "Golden Gate Bridge"
}
```

Returns up to 5 matches with coordinates and bounding boxes.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  MCP Host (Claude, VS Code, etc.)      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  MCP App UI (Sandboxed iframe)   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Weather Dashboard          │ │ │
│  │  │  - Search box               │ │ │
│  │  │  - Quick cities             │ │ │
│  │  │  - Tell Claude button       │ │ │
│  │  │  - Open web button          │ │ │
│  │  │  - Activity log             │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  postMessage ↕ AppBridge          │ │
│  └───────────────────────────────────┘ │
│                                         │
│         HTTP/SSE ↕                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  MCP Server (Node.js + Express)         │
│  - show-weather tool                    │
│  - show-map tool                        │
│  - geocode tool                         │
│  - UI resources (bundled HTML)          │
│  - Open-Meteo API integration           │
│  - Nominatim geocoding                  │
└─────────────────────────────────────────┘
```

---

## 📝 MCP Client Configuration

### For stdio transport:

```json
{
  "mcpServers": {
    "weather-map": {
      "command": "node",
      "args": ["/path/to/dist/index.js", "--stdio"]
    }
  }
}
```

### For HTTP transport with Claude:

Add as a custom connector:
- Name: Weather & Maps
- URL: `https://your-server.com/mcp` (or cloudflared tunnel URL)

---

## 🎓 Learning Resources

- [MCP Apps Documentation](https://modelcontextprotocol.io/docs/extensions/apps)
- [MCP Apps API Reference](https://modelcontextprotocol.github.io/ext-apps/api/)
- [MCP Apps GitHub](https://github.com/modelcontextprotocol/ext-apps)
- [MCP Specification](https://modelcontextprotocol.io/specification)

---

## 📂 Project Structure

```
mcp-map-server-ui/
├── src/
│   ├── mcp-app.ts           # CesiumJS globe app
│   └── weather-app.ts       # Weather dashboard app (primary test)
├── mcp-app.html             # Globe UI template
├── weather-app.html         # Weather UI template
├── server.ts                # MCP server with tool definitions
├── main.ts                  # Server entry point
├── dist/                    # Built artifacts
│   ├── mcp-app.html         # Bundled globe app
│   ├── weather-app.html     # Bundled weather app
│   ├── server.js            # Compiled server
│   └── index.js             # Compiled entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
├── TESTING_GUIDE.md         # Detailed testing instructions
└── README.md                # This file
```

---

## 🚢 Deployment

This server can be deployed to any Node.js hosting platform:

- Azure App Service (see `.github/workflows/`)
- AWS Lambda / ECS
- Google Cloud Run
- Heroku
- Railway
- Vercel / Netlify (with serverless functions)

Ensure your deployment exposes the `/mcp` endpoint and supports:
- HTTP POST requests
- SSE (Server-Sent Events) for streaming
- CORS headers
- JSON request/response bodies

---

## 🔜 Roadmap

### Phase 1: Core Features (✅ Complete)
- [x] Tool calling from UI
- [x] Chat integration
- [x] External links
- [x] Structured logging
- [x] Error handling

### Phase 2: Display & Themes (✅ Complete)
- [x] Inline display mode
- [x] Fullscreen mode (both apps)
- [x] Theme detection (light/dark)
- [x] Keyboard shortcuts (Esc, Ctrl+Enter)
- [x] Host context change handling
- [x] Responsive layouts per mode
- [x] PiP mode CSS (ready for host support)

### Phase 3: Persistence & State (Next)
- [ ] Favorites management
- [ ] Search history
- [ ] Bookmark locations
- [ ] Cross-session persistence
- [ ] Model context updates (weather)

### Phase 4: Advanced Features
- [ ] Comparison mode (multiple locations)
- [ ] Real-time updates and auto-refresh
- [ ] Tool list change notifications
- [ ] Advanced forms and validation
- [ ] Keyboard shortcuts (weather)

### Phase 5: Polish & Production
- [ ] Full accessibility (ARIA, screen reader)
- [ ] Offline mode with service workers
- [ ] Performance monitoring
- [ ] Analytics and telemetry
- [ ] E2E testing suite

---

## 🤝 Contributing

This is a testing and demonstration project for MCP Apps capabilities. Contributions welcome!

---

## 📄 License

MIT

---

## 🔗 Links

- **Live Demo**: TBD (coming soon)
- **MCP Apps Docs**: https://modelcontextprotocol.io/docs/extensions/apps
- **GitHub Issues**: Report bugs and request features
- **Testing Guide**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed testing instructions

---

**Built with:** Node.js, TypeScript, Express, Vite, CesiumJS, MCP SDK, Open-Meteo API, OpenStreetMap
