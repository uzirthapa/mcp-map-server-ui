/**
 * CesiumJS Map MCP Server
 *
 * Provides tools for:
 * - geocode: Search for places using OpenStreetMap Nominatim
 * - show-map: Display an interactive 3D globe at a given location
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
} from "@modelcontextprotocol/ext-apps/server";
import { randomUUID } from "crypto";

// Works both from source (server.ts) and compiled (dist/server.js)
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;
const RESOURCE_URI = "ui://cesium-map/mcp-app.html";

// Nominatim API response type
interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  class: string;
  type: string;
  importance: number;
}

// Rate limiting for Nominatim (1 request per second per their usage policy)
let lastNominatimRequest = 0;
const NOMINATIM_RATE_LIMIT_MS = 1100; // 1.1 seconds to be safe

// List of interesting cities with their bounding boxes
const CITIES = [
  { name: "Paris", west: 2.2241, south: 48.8156, east: 2.4697, north: 48.9022 },
  { name: "Tokyo", west: 139.6917, south: 35.6895, east: 139.7712, north: 35.8174 },
  { name: "New York", west: -74.0479, south: 40.6829, east: -73.9067, north: 40.8820 },
  { name: "London", west: -0.5, south: 51.3, east: 0.3, north: 51.7 },
  { name: "Sydney", west: 151.0, south: -34.0, east: 151.3, north: -33.7 },
  { name: "Rio de Janeiro", west: -43.7964, south: -23.0826, east: -43.0999, north: -22.7461 },
  { name: "Dubai", west: 55.1, south: 24.9, east: 55.6, north: 25.4 },
  { name: "Mumbai", west: 72.7763, south: 18.8937, east: 72.9781, north: 19.2701 },
  { name: "San Francisco", west: -122.5173, south: 37.7032, east: -122.3558, north: 37.8324 },
  { name: "Barcelona", west: 2.0524, south: 41.3201, east: 2.2280, north: 41.4695 },
  { name: "Singapore", west: 103.6, south: 1.2, east: 104.0, north: 1.5 },
  { name: "Istanbul", west: 28.8, south: 40.9, east: 29.3, north: 41.3 },
  { name: "Los Angeles", west: -118.6682, south: 33.7037, east: -118.1553, north: 34.3373 },
  { name: "Berlin", west: 13.0883, south: 52.3382, east: 13.7611, north: 52.6755 },
  { name: "Mexico City", west: -99.3654, south: 19.0493, east: -98.9420, north: 19.5926 },
];

/**
 * Query Nominatim geocoding API with rate limiting
 */
async function geocodeWithNominatim(query: string): Promise<NominatimResult[]> {
  // Respect rate limit
  const now = Date.now();
  const timeSinceLastRequest = now - lastNominatimRequest;
  if (timeSinceLastRequest < NOMINATIM_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, NOMINATIM_RATE_LIMIT_MS - timeSinceLastRequest),
    );
  }
  lastNominatimRequest = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent":
          "MCP-CesiumMap-Example/1.0 (https://github.com/modelcontextprotocol)",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Nominatim API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<NominatimResult[]>;
}

/**
 * Creates a new MCP server instance with tools and resources registered.
 * Each HTTP session needs its own server instance because McpServer only supports one transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "CesiumJS Map Server",
    version: "1.0.0",
  });

  // CSP configuration for external tile sources
  const cspMeta = {
    ui: {
      csp: {
        // Allow fetching tiles from OSM (tiles + geocoding) and Cesium assets
        connectDomains: [
          "https://*.openstreetmap.org", // OSM tiles + Nominatim geocoding
          "https://cesium.com",
          "https://*.cesium.com",
        ],
        // Allow loading tile images, scripts, and Cesium CDN resources
        resourceDomains: [
          "https://*.openstreetmap.org", // OSM map tiles (covers tile.openstreetmap.org)
          "https://cesium.com",
          "https://*.cesium.com",
        ],
      },
    },
  };

  // Register the CesiumJS map resource with CSP for external tile sources
  registerAppResource(
    server,
    RESOURCE_URI,
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );
      return {
        contents: [
          // _meta must be on the content item, not the resource metadata
          {
            uri: RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: cspMeta,
          },
        ],
      };
    },
  );

  // show-map tool - displays the CesiumJS globe
  // Default bounding box: London area
  registerAppTool(
    server,
    "show-map",
    {
      title: "Show Map",
      description:
        "Display an interactive world map zoomed to a specific bounding box. Use the GeoCode tool to find the bounding box of a location.",
      inputSchema: {
        west: z
          .number()
          .optional()
          .default(-0.5)
          .describe("Western longitude (-180 to 180)"),
        south: z
          .number()
          .optional()
          .default(51.3)
          .describe("Southern latitude (-90 to 90)"),
        east: z
          .number()
          .optional()
          .default(0.3)
          .describe("Eastern longitude (-180 to 180)"),
        north: z
          .number()
          .optional()
          .default(51.7)
          .describe("Northern latitude (-90 to 90)"),
        label: z
          .string()
          .optional()
          .describe("Optional label to display on the map"),
      },
      _meta: { [RESOURCE_URI_META_KEY]: RESOURCE_URI },
    },
    async ({ west, south, east, north, label }): Promise<CallToolResult> => ({
      content: [
        {
          type: "text",
          text: `Displaying globe at: W:${west.toFixed(4)}, S:${south.toFixed(4)}, E:${east.toFixed(4)}, N:${north.toFixed(4)}${label ? ` (${label})` : ""}`,
        },
      ],
      _meta: {
        viewUUID: randomUUID(),
      },
    }),
  );

  // shuffle-cities tool - randomly selects a city and displays it on the map
  registerAppTool(
    server,
    "shuffle-cities",
    {
      title: "Shuffle Cities",
      description: "Display a random city from around the world on the map.",
      inputSchema: {},
      _meta: { [RESOURCE_URI_META_KEY]: RESOURCE_URI },
    },
    async (): Promise<CallToolResult> => {
      // Pick a random city
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];

      return {
        content: [
          {
            type: "text",
            text: `Displaying ${city.name}: W:${city.west.toFixed(4)}, S:${city.south.toFixed(4)}, E:${city.east.toFixed(4)}, N:${city.north.toFixed(4)}`,
          },
        ],
        _meta: {
          viewUUID: randomUUID(),
          city: {
            name: city.name,
            west: city.west,
            south: city.south,
            east: city.east,
            north: city.north,
          },
        },
      };
    },
  );

  // geocode tool - searches for places using Nominatim (no UI)
  server.registerTool(
    "geocode",
    {
      title: "Geocode",
      description:
        "Search for places using OpenStreetMap. Returns coordinates and bounding boxes for up to 5 matches.",
      inputSchema: {
        query: z
          .string()
          .describe(
            "Place name or address to search for (e.g., 'Paris', 'Golden Gate Bridge', '1600 Pennsylvania Ave')",
          ),
      },
    },
    async ({ query }): Promise<CallToolResult> => {
      try {
        const results = await geocodeWithNominatim(query);

        if (results.length === 0) {
          return {
            content: [
              { type: "text", text: `No results found for "${query}"` },
            ],
          };
        }

        const formattedResults = results.map((r) => ({
          displayName: r.display_name,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          boundingBox: {
            south: parseFloat(r.boundingbox[0]),
            north: parseFloat(r.boundingbox[1]),
            west: parseFloat(r.boundingbox[2]),
            east: parseFloat(r.boundingbox[3]),
          },
          type: r.type,
          importance: r.importance,
        }));

        const textContent = formattedResults
          .map(
            (r, i) =>
              `${i + 1}. ${r.displayName}\n   Coordinates: ${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}\n   Bounding box: W:${r.boundingBox.west.toFixed(4)}, S:${r.boundingBox.south.toFixed(4)}, E:${r.boundingBox.east.toFixed(4)}, N:${r.boundingBox.north.toFixed(4)}`,
          )
          .join("\n\n");

        return {
          content: [{ type: "text", text: textContent }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Geocoding error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
