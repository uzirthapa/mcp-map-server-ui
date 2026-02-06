# MCP Map Server UI - Quick Reference Card
**Last Updated:** 2026-02-06 | **Status:** ✅ CI/CD Fixed

---

## 🚀 Quick Start
```bash
cd /home/uzirthapa/Github/mcp-map-server-ui
npm run dev              # Start both servers
npm run test             # Run tests
git status               # Check changes
```

## 📁 Key Files
| File | Purpose |
|------|---------|
| `server.ts` | MCP server, tool definitions |
| `src/weather-app.ts` | Dashboard logic (1082 lines) |
| `weather-app.html` | Dashboard UI (1263 lines) |
| `.github/workflows/main_mcp-apps-020426.yml` | CI/CD pipeline |

## 🔧 Recent Fix (2026-02-06)
**Problem:** CI/CD failing - Playwright WebKit browser not installed
**Solution:** Added `npx playwright install --with-deps` step to workflow
**Commit:** f7b3973
**Status:** ✅ Should pass on next run

## 🎯 Current State
✅ Progressive streaming (5 phases, 1s intervals)
✅ Compact viewport (790px → 632px mobile)
✅ Favorites system with localStorage
✅ User added: bookmarks, comparison, shortcuts, telemetry
⏳ Need: Test coverage for new features

## 🛠️ Key Tools
```typescript
// Server tools
"show-map"            // Display interactive map
"shuffle-cities"      // Random city suggestions
"show-weather"        // Get weather data
"geocode"            // Lat/lon → location name
"uzir-weather-stream" // Progressive analysis (app-only)
```

## ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl+S` | Toggle favorite |
| `Ctrl+B` | Toggle bookmark |
| `Ctrl+H` | Search history |
| `Ctrl+F` | Focus search |
| `Ctrl+R` | Refresh weather |
| `Ctrl+/` | Show help |
| `F1` | Keyboard shortcuts |

## 🧪 Testing
```bash
npm run test                           # All tests
npm run test:ui                        # With UI
npx playwright test --headed           # Headed mode
npx playwright test --debug            # Debug mode
npx playwright install --with-deps     # Install browsers
```

## 📊 Architecture
```
User Input → Weather App (TypeScript)
    ↓ callServerTool()
MCP Server (Node.js)
    ↓ HTTP Request
OpenWeatherMap API
    ↓ JSON Response
Progressive Streaming (5 phases)
    ↓ setTimeout() delays
Render UI (Phase by phase)
```

## 🏗️ Build & Deploy
```bash
npm run build           # Build for production
npm start              # Run production server
git push origin main   # Triggers CI/CD → Azure
```

**Deployment:** https://mcp-apps-020426.azurewebsites.net

## 📝 Important Patterns

### App-Only Tool (Server)
```typescript
server.registerAppTool({
  name: "tool-name",
  metadata: { visibility: ["app"] }  // Hidden from Claude
});
```

### Call Server Tool (Client)
```typescript
const result = await window.mcp.callServerTool({
  name: "uzir-weather-stream",
  arguments: { location: "NYC" }
});
```

### localStorage with viewUUID
```typescript
const viewUUID = window.mcp.getViewUUID();
localStorage.setItem(`${viewUUID}-favorites`, JSON.stringify(data));
```

## 🐛 Common Issues
| Issue | Solution |
|-------|----------|
| Port in use | `lsof -ti:3000 \| xargs kill -9` |
| Playwright not found | `npx playwright install --with-deps` |
| Build fails | `rm -rf node_modules && npm install` |
| API 401 | Check `.env` has `OPENWEATHER_API_KEY` |

## 📚 Documentation
- **Full Handoff:** `HANDOFF_DOCUMENT.md` (comprehensive)
- **Project README:** `README.md`
- **API Guide:** `CUSTOM-API-GUIDE.md`

## 🎯 Next Steps
1. ✅ Verify CI/CD passes on next run
2. ⏳ Document user-added features in README
3. ⏳ Write tests for bookmarks/comparison
4. ⏳ Complete Phase 5 telemetry
5. ⏳ Add localStorage quota management

## 🔑 Environment
```bash
# Required
OPENWEATHER_API_KEY=your_key_here

# Optional
PORT=3000
NODE_ENV=development
```

## 📞 Resources
- **Repo:** https://github.com/uzirthapa/mcp-map-server-ui
- **MCP Apps SDK:** https://github.com/anthropics/ext-apps
- **OpenWeather API:** https://openweathermap.org/api

---

**💡 Tip:** Read `HANDOFF_DOCUMENT.md` for comprehensive details, code patterns, and full context.
