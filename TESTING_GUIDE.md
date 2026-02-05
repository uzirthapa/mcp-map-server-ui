# Weather Dashboard - MCP Apps Testing Guide

## 🎯 What Was Implemented (Option 1: Interactive Search & Location Features)

This implementation tests **all core MCP Apps communication APIs**:

### ✅ Features Added

1. **🔍 Search Functionality** (`callServerTool`)
   - Text input for searching any city or location
   - Calls `show-weather` tool from the UI
   - Shows loading state during search
   - Enter key support

2. **🌍 Quick City Buttons** (`callServerTool`)
   - 6 popular cities: Paris, Tokyo, New York, London, Sydney, Dubai
   - One-click weather lookup
   - Each calls `show-weather` tool

3. **💬 Tell Claude Button** (`sendMessage`)
   - Sends weather summary to the chat
   - Format: "The weather in {location} is {temp}°C and {condition}..."
   - Tests bidirectional communication

4. **🌐 Open Weather.com Button** (`sendOpenLink`)
   - Opens detailed forecast in browser
   - Uses coordinates to build Weather.com URL
   - Tests external link opening capability

5. **📝 Activity Log Panel** (`sendLog`)
   - Expandable/collapsible logging panel
   - Shows all app activities in real-time
   - Three log levels: info (blue), warning (yellow), error (red)
   - Auto-scrolls to latest entry
   - Logs sent to host via `sendLog()` API

## 🧪 How to Test

### 1. Start the Server

```bash
cd /home/uzirthapa/Github/mcp-map-server-ui
npm run start
```

Server will be available at `http://localhost:3001/mcp`

### 2. Connect to Your Webchat

Configure your Webchat to connect to the MCP server at `http://localhost:3001/mcp`

### 3. Test Each Feature

#### Test 1: Initial Tool Call (Baseline)
```
User: "Show me the weather in Seattle"
```
**Expected:**
- Weather dashboard loads with current conditions
- 7-day forecast displays
- Activity log shows "Initial weather data rendered"

#### Test 2: Search Box (callServerTool)
1. Type "Barcelona" in the search box
2. Click "🔍 Search" or press Enter

**Expected:**
- Button shows loading spinner
- New weather data loads for Barcelona
- Log shows: "Searching for location: Barcelona"
- Log shows: "Weather tool result received"
- Log shows: "Weather rendered for Barcelona"

#### Test 3: Quick City Buttons (callServerTool)
1. Click "Tokyo" chip

**Expected:**
- Weather updates to Tokyo
- Same logging as search
- Button should be clickable/responsive

#### Test 4: Tell Claude (sendMessage)
1. After weather loads, click "💬 Tell Claude"

**Expected:**
- Message appears in chat: "The weather in Tokyo is currently XX°C and [condition]..."
- Log shows: "Sending message to chat"
- Log shows: "Message sent to chat successfully"

#### Test 5: Open Weather.com (sendOpenLink)
1. Click "🌐 View on Weather.com"

**Expected:**
- Browser opens with Weather.com URL for current location
- Log shows: "Opening Weather.com for Tokyo"
- Log shows: "Link opened successfully"

#### Test 6: Activity Log Panel (sendLog)
1. Click on "📝 Activity Log" header

**Expected:**
- Panel collapses/expands
- Arrow icon changes (▼ ↔ ▶)
- All previous actions visible with timestamps
- Color-coded by level (info=blue, warn=yellow, error=red)

#### Test 7: Error Handling
1. Search for nonsense: "asdfghjkl12345"

**Expected:**
- Error message displays
- Log shows error in red
- Log count increases
- App remains functional

#### Test 8: Multiple Searches (Sequential Tool Calls)
1. Search "Paris"
2. Search "New York"
3. Click "Sydney" chip
4. Click "Tell Claude" after each

**Expected:**
- Each search works independently
- Log accumulates all activities
- "Tell Claude" always sends current location
- Log count keeps incrementing

## 🔍 MCP Apps APIs Being Tested

| API | Feature | Test Method |
|-----|---------|-------------|
| `callServerTool()` | Search box | Type location and search |
| `callServerTool()` | Quick cities | Click city chips |
| `sendMessage()` | Tell Claude | Click "Tell Claude" button |
| `sendOpenLink()` | Open web | Click "View on Weather.com" |
| `sendLog()` | Activity log | All actions automatically log |
| `sendSizeChanged()` | Size hint | Automatic on load (800px) |

## 📊 Expected Log Sequence

When you search for "Tokyo", the activity log should show:

```
[TIME] Searching for location: Tokyo
[TIME] Weather tool result received {object}
[TIME] Weather rendered for Tokyo
```

When you click "Tell Claude":
```
[TIME] Sending message to chat "The weather in Tokyo..."
[TIME] Message sent to chat successfully
```

When you click "View on Weather.com":
```
[TIME] Opening Weather.com for Tokyo https://weather.com/...
[TIME] Link opened successfully
```

## 🐛 Troubleshooting

### Search doesn't work
- Check server is running at localhost:3001
- Check browser console for errors
- Check if `show-weather` tool is registered

### "Tell Claude" button does nothing
- Check if weather data is loaded first
- Check host supports `sendMessage` capability
- Look for errors in activity log

### "Open Weather.com" doesn't open
- Check if host supports `sendOpenLink` capability
- Check browser popup blockers
- Verify URL format in activity log

### Activity log is empty
- Check if `sendLog` is supported by host
- Check browser console for errors
- Verify host is receiving log messages

## 🎓 What This Tests

This implementation comprehensively tests:

1. **Bidirectional communication** - App ↔ Server tool calls
2. **Chat integration** - App → Chat via sendMessage
3. **External navigation** - App → Browser via sendOpenLink
4. **Structured logging** - App → Host via sendLog
5. **Error handling** - Graceful failures and recovery
6. **User interactions** - Multiple input methods (search, buttons, keyboard)
7. **State management** - Current weather data persistence
8. **UI feedback** - Loading states, disabled buttons, logs

## 🚀 Next Steps

After validating Option 1, you can add:

- **Option 2**: Display modes (fullscreen, PiP) and theme detection
- **Option 3**: Persistence (favorites, history, localStorage)
- **Option 4**: Comparison mode (multiple locations side-by-side)
- **Option 5**: Real-time updates and auto-refresh
- **Option 6**: Advanced forms and settings
- **Option 7**: Keyboard shortcuts and accessibility
- **Option 8**: Enhanced error handling and offline mode

## 📝 Notes

- All logs are sent to both console and host
- The app uses `autoResize: false` and manually sends height (800px)
- Search input supports Enter key for better UX
- Activity log auto-scrolls to show latest entries
- Log panel is collapsible to save space
- All buttons show appropriate loading/disabled states
