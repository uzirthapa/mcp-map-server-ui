# Custom MCP API Extension Guide

## Overview

This guide demonstrates how to extend the MCP server with custom APIs that return behaviorally complex data, then call those APIs from your MCP App (weather dashboard).

## Architecture

```
┌─────────────────┐
│  Weather App    │
│  (MCP View)     │
│                 │
│  Click "Advanced│
│   Insights" btn │
└────────┬────────┘
         │ appInstance.callServerTool()
         ▼
┌─────────────────┐
│  Host           │
│  (AppBridge)    │
│  Proxies        │
│  tools/call     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  MCP Server                                 │
│  (server.ts)                                │
│                                             │
│  registerAppTool("uzir-weather-insights")  │
│  - visibility: ["app"] (hidden from model) │
│  - Returns complex multi-layered data      │
│  - Includes: patterns, alerts, historical  │
│    comparisons, recommendations, quality   │
└─────────────────────────────────────────────┘
```

## What Was Implemented

### 1. **Custom Server Tool** (`server.ts`)

Created an app-only tool `uzir-weather-insights` that demonstrates behavioral complexity:

**Key Features:**
- **App-only visibility**: Hidden from the model, only callable by the app
- **Complex data structure**: Returns 8 different data categories
- **Random variations**: Simulates real-world dynamic data
- **Multiple data types**: Numbers, strings, arrays, nested objects
- **Conditional logic**: Alerts only appear 30% of the time

**Data Structure:**
```typescript
{
  summary: {
    location, analysisId, timestamp, confidence (0.87-0.97)
  },
  currentConditions: {
    temperature, humidity, windSpeed, pressure, visibility
  },
  patterns: [
    { type: "temperature_trend", direction, rate, confidence },
    { type: "precipitation_probability", next24h, next72h, confidence }
  ],
  alerts: [
    { type, severity, message, expiresAt } // 30% chance
  ],
  historicalComparison: {
    avgTemperatureDeviation, avgHumidityDeviation, unusualFactors[]
  },
  recommendations: [
    { category: "clothing", suggestion, priority },
    { category: "activity", suggestion, priority }
  ],
  dataQuality: {
    sources[], lastUpdated, nextUpdateIn, reliability
  }
}
```

### 2. **App Integration** (`weather-app.ts`)

Added functions to call the custom tool and display results:

**Functions:**
- `getWeatherInsights()`: Calls the custom tool via `appInstance.callServerTool()`
- `displayWeatherInsights()`: Renders a beautiful modal with all insights

**API Call:**
```typescript
const response = await appInstance.callServerTool({
  name: "uzir-weather-insights",
  arguments: {
    location: "New York",
    latitude: 40.71,
    longitude: -74.01,
  },
});

const insights = response._meta?.insights;
```

### 3. **UI Components** (`weather-app.html`)

**Button:**
- "🔬 Advanced Insights" button in action buttons section
- Only appears when weather data is loaded

**Modal Design:**
- Full-screen overlay with backdrop blur
- Scrollable content with smooth animations
- Color-coded sections (purple headers, severity badges)
- Responsive grid layouts for data
- Close on backdrop click or × button

## How to Test

### **Step 1: Start the MCP Server**

```bash
cd /home/uzirthapa/Github/mcp-map-server-ui
npm start
# Server runs on http://localhost:3001/mcp
```

### **Step 2: Start the Basic Host**

```bash
cd /home/uzirthapa/Github/ext-apps/examples/basic-host
npm start
# Host runs on http://localhost:8080
```

### **Step 3: Test the Custom API**

1. Navigate to http://localhost:8080
2. Select "CesiumJS Map Server" from dropdown
3. Select "show-weather" tool
4. Enter a location: `{ "location": "New York" }`
5. Click "Call Tool"
6. Wait for weather to load
7. Click "🔬 Advanced Insights" button
8. View the complex multi-layered insights modal!

## Key Concepts Demonstrated

### 1. **App-Only Tools**

Tools with `visibility: ["app"]` are:
- Hidden from the AI model
- Only callable by the app itself
- Perfect for UI-specific operations
- Bypass model context limits

```typescript
_meta: {
  ui: {
    visibility: ["app"], // Hidden from model
  },
}
```

### 2. **Behavioral Complexity**

The insights tool demonstrates:
- **Progressive data**: Multiple layers of information
- **Dynamic responses**: Random variations on each call
- **Conditional logic**: Alerts appear probabilistically
- **Rich metadata**: Timestamps, IDs, confidence scores
- **Multiple data types**: Numbers, strings, arrays, objects
- **Real-world patterns**: Trends, deviations, recommendations

### 3. **MCP Communication Flow**

```
App → callServerTool()
  → Host proxies to server
    → Server processes tool
      → Returns CallToolResult with _meta
        → Host sends back to app
          → App extracts _meta.insights
            → Displays in modal
```

## Extending Further

### Add Streaming Updates

For truly progressive data, you could:

1. **Use notifications**: Send updates via `notifications/message`
2. **Implement polling**: Call tool repeatedly with a streaming ID
3. **WebSocket integration**: If host supports it
4. **Server-sent events**: Through external API

### Add More Custom Tools

Examples of other behaviorally complex tools:

- `uzir-weather-forecast-stream`: Return forecast days progressively
- `uzir-weather-alerts-monitor`: Real-time alert monitoring
- `uzir-historical-analysis`: Time-series data with charts
- `uzir-recommendation-engine`: AI-powered suggestions

### Pattern for Custom APIs

```typescript
registerAppTool(
  server,
  "your-custom-tool",
  {
    title: "Your Tool",
    description: "What it does",
    inputSchema: { /* zod schema */ },
    _meta: {
      ui: {
        visibility: ["app"], // App-only
        resourceUri: "ui://your-app",
      },
    },
  },
  async (args): Promise<CallToolResult> => {
    // Your complex logic here
    return {
      content: [{ type: "text", text: "..." }],
      _meta: {
        // Your complex data here
        complexData: { /* ... */ },
      },
    };
  }
);
```

## Files Modified

1. **`server.ts`**: Added `uzir-weather-insights` tool
2. **`src/weather-app.ts`**: Added `getWeatherInsights()` and `displayWeatherInsights()`
3. **`weather-app.html`**: Added button and modal CSS

## Benefits

✅ **Separation of concerns**: Complex data logic in server, not app
✅ **Type safety**: Zod schemas validate inputs
✅ **Reusability**: Tool can be called from anywhere
✅ **Testability**: Server logic is isolated
✅ **Scalability**: Easy to add more custom tools
✅ **Security**: App-only tools protect sensitive operations
✅ **Performance**: Async operations don't block UI

## Conclusion

You've successfully extended your MCP server with custom APIs that return behaviorally complex data. The weather insights tool demonstrates:

- Multi-layered data structures
- Dynamic/random variations
- Conditional logic
- Rich metadata
- Real-world complexity

This pattern can be applied to any domain where you need complex, structured data beyond simple text responses!
