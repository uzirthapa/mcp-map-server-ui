# MCP Map Server

Interactive 3D globe viewer using CesiumJS with OpenStreetMap tiles. Demonstrates geocoding integration and full MCP App capabilities.

## Features

- **3D Globe Rendering**: Interactive CesiumJS globe with rotation, zoom, and 3D perspective
- **Geocoding**: Search for places using OpenStreetMap Nominatim (no API key required)
- **OpenStreetMap Tiles**: Uses free OSM tile server (no Cesium Ion token needed)
- **Dynamic Loading**: CesiumJS loaded from CDN at runtime for smaller bundle size

## Running

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build and start the server:

   ```bash
   npm run start:http  # for Streamable HTTP transport
   # OR
   npm run start:stdio  # for stdio transport
   ```

3. The server will be available at `http://localhost:3001/mcp`

## Tools

### `geocode`

Search for places by name or address. Returns coordinates and bounding boxes.

```json
{
  "query": "Eiffel Tower"
}
```

Returns up to 5 matches with lat/lon coordinates and bounding boxes.

### `show-map`

Display the 3D globe zoomed to a bounding box.

```json
{
  "west": 2.29,
  "south": 48.85,
  "east": 2.3,
  "north": 48.86,
  "label": "Eiffel Tower"
}
```

Defaults to London if no coordinates provided.

## MCP Client Configuration

Add to your MCP client configuration (stdio transport):

```json
{
  "mcpServers": {
    "map": {
      "command": "npx",
      "args": [
        "-y",
        "--silent",
        "--registry=https://registry.npmjs.org/",
        "mcp-map-server",
        "--stdio"
      ]
    }
  }
}
```

## Development

For development with hot reload:

```bash
npm run dev
```

This runs both the Vite watcher and the HTTP server concurrently.
