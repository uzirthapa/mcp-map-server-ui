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
const WEATHER_RESOURCE_URI = "ui://weather-dashboard/weather-app.html";

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

// Open-Meteo API response types
interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    uv_index_max: number[];
  };
}

/**
 * Get weather condition text from WMO weather code
 */
function getWeatherCondition(weatherCode: number): string {
  if (weatherCode === 0) return "Clear Sky";
  if (weatherCode === 1) return "Mainly Clear";
  if (weatherCode === 2) return "Partly Cloudy";
  if (weatherCode === 3) return "Overcast";
  if (weatherCode <= 48) return "Foggy";
  if (weatherCode <= 57) return "Drizzle";
  if (weatherCode <= 67) return "Rain";
  if (weatherCode <= 77) return "Snow";
  if (weatherCode <= 82) return "Rain Showers";
  if (weatherCode <= 86) return "Snow Showers";
  if (weatherCode <= 99) return "Thunderstorm";
  return "Unknown";
}

/**
 * Fetch weather data from Open-Meteo API (no API key required)
 */
async function fetchWeatherData(
  latitude: number,
  longitude: number,
): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,weather_code,uv_index_max",
    timezone: "auto",
    forecast_days: "7",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );

  if (!response.ok) {
    throw new Error(
      `Open-Meteo API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<OpenMeteoResponse>;
}

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

  // Register the Weather Dashboard resource
  const weatherCspMeta = {
    ui: {
      csp: {
        // Allow fetching weather data from Open-Meteo
        connectDomains: ["https://api.open-meteo.com"],
        resourceDomains: ["https://api.open-meteo.com"],
      },
    },
  };

  registerAppResource(
    server,
    WEATHER_RESOURCE_URI,
    WEATHER_RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "weather-app.html"),
        "utf-8",
      );
      return {
        contents: [
          {
            uri: WEATHER_RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: weatherCspMeta,
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

  // show-weather tool - displays weather dashboard for a location
  registerAppTool(
    server,
    "show-weather",
    {
      title: "Show Weather",
      description:
        "Display a weather dashboard with current conditions and 7-day forecast for a location. Accepts either coordinates or a city name.",
      inputSchema: {
        location: z
          .string()
          .optional()
          .describe(
            "City name or place to get weather for (e.g., 'Paris', 'New York'). If provided, coordinates are ignored.",
          ),
        latitude: z
          .number()
          .optional()
          .describe(
            "Latitude of the location (-90 to 90). Used if location is not provided.",
          ),
        longitude: z
          .number()
          .optional()
          .describe(
            "Longitude of the location (-180 to 180). Used if location is not provided.",
          ),
      },
      _meta: { [RESOURCE_URI_META_KEY]: WEATHER_RESOURCE_URI },
    },
    async ({ location, latitude, longitude }): Promise<CallToolResult> => {
      try {
        let lat: number;
        let lon: number;
        let locationName: string;

        // If location name is provided, geocode it first
        if (location) {
          const geocodeResults = await geocodeWithNominatim(location);
          if (geocodeResults.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Could not find location: ${location}`,
                },
              ],
              isError: true,
            };
          }

          const firstResult = geocodeResults[0];
          lat = parseFloat(firstResult.lat);
          lon = parseFloat(firstResult.lon);
          locationName = firstResult.display_name.split(",")[0]; // Get city name
        } else if (latitude !== undefined && longitude !== undefined) {
          lat = latitude;
          lon = longitude;
          locationName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Please provide either a location name or coordinates (latitude and longitude)",
              },
            ],
            isError: true,
          };
        }

        // Fetch weather data from Open-Meteo
        const weatherData = await fetchWeatherData(lat, lon);

        // Format the data for the UI
        const formattedData = {
          location: locationName,
          latitude: lat,
          longitude: lon,
          current: {
            temperature: weatherData.current.temperature_2m,
            condition: getWeatherCondition(weatherData.current.weather_code),
            feelsLike: weatherData.current.apparent_temperature,
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: weatherData.current.wind_speed_10m,
            uvIndex: weatherData.daily.uv_index_max[0],
            weatherCode: weatherData.current.weather_code,
          },
          forecast: weatherData.daily.time.map((date, index) => ({
            date,
            tempMax: weatherData.daily.temperature_2m_max[index],
            tempMin: weatherData.daily.temperature_2m_min[index],
            weatherCode: weatherData.daily.weather_code[index],
            condition: getWeatherCondition(weatherData.daily.weather_code[index]),
          })),
        };

        return {
          content: [
            {
              type: "text",
              text: `Showing weather for ${locationName}: ${formattedData.current.temperature.toFixed(1)}°C, ${formattedData.current.condition}`,
            },
          ],
          _meta: {
            viewUUID: randomUUID(),
            weatherData: formattedData,
          },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Weather error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
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
