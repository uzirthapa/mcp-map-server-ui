/**
 * Weather Dashboard MCP App
 *
 * Displays weather information using Open-Meteo API data.
 * Tests MCP Apps communication capabilities: sendLog, sendMessage, sendOpenLink, callServerTool
 */
import { App } from "@modelcontextprotocol/ext-apps";

// Logging utilities that also send to host
const logToHost = async (
  app: App,
  level: "info" | "warning" | "error",
  message: string,
  data?: unknown,
) => {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = data
    ? `${message} ${JSON.stringify(data)}`
    : message;

  // Console log (use warn for warning level)
  const consoleLevel = level === "warning" ? "warn" : level;
  console[consoleLevel](`[WEATHER-APP] ${logMessage}`);

  // Send to host via sendLog
  try {
    await app.sendLog({
      level,
      data: logMessage,
      logger: "weather-app",
    });
  } catch (error) {
    console.error("Failed to send log to host:", error);
  }

  // Update UI log panel (use warn for UI display)
  const uiLevel = level === "warning" ? "warn" : level;
  addLogEntry(uiLevel, timestamp, logMessage);
};

// Create log object that uses logToHost
let appInstance: App;
const log = {
  info: (message: string, data?: unknown) =>
    logToHost(appInstance, "info", message, data),
  warn: (message: string, data?: unknown) =>
    logToHost(appInstance, "warning", message, data),
  error: (message: string, data?: unknown) =>
    logToHost(appInstance, "error", message, data),
};

// Height components for dynamic calculation (px)
// Values measured via Playwright testing on multiple screen sizes (948px and 768px widths)
// Using maximum values to ensure no scrollbars on any screen size
const HEIGHT_BASE = 969;              // Search, current weather, buttons (max from 768px: 1019 - 50)
const HEIGHT_FORECAST = 262;          // 7-day forecast when visible (max from 768px)
const HEIGHT_LOG_COLLAPSED = 50;      // Activity log header only
const HEIGHT_LOG_EXPANDED = 349;      // Activity log header + content (measured: +299px from collapsed)

// Track component visibility states
let isForecastVisible = false;
let isLogExpanded = false;

// Track display mode
let currentDisplayMode: "inline" | "fullscreen" | "pip" = "inline";

/**
 * Calculate and update viewport height based on visible components
 */
function updateViewportHeight(): void {
  const forecastHeight = isForecastVisible ? HEIGHT_FORECAST : 0;
  const logHeight = isLogExpanded ? HEIGHT_LOG_EXPANDED : HEIGHT_LOG_COLLAPSED;

  const totalHeight = HEIGHT_BASE + forecastHeight + logHeight;

  appInstance.sendSizeChanged({ height: totalHeight });

  console.log(`[WEATHER-APP] Viewport height updated to ${totalHeight}px (base: ${HEIGHT_BASE}, forecast: ${forecastHeight}, log: ${logHeight})`);
}

/**
 * Update fullscreen button icons based on current display mode
 */
function updateFullscreenButton(): void {
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const expandIcon = document.getElementById("expand-icon");
  const compressIcon = document.getElementById("compress-icon");

  if (!fullscreenBtn || !expandIcon || !compressIcon) return;

  if (currentDisplayMode === "fullscreen") {
    expandIcon.style.display = "none";
    compressIcon.style.display = "block";
    fullscreenBtn.title = "Exit fullscreen";
  } else {
    expandIcon.style.display = "block";
    compressIcon.style.display = "none";
    fullscreenBtn.title = "Toggle fullscreen";
  }
}

/**
 * Toggle fullscreen mode
 */
async function toggleFullscreen(): Promise<void> {
  const newMode = currentDisplayMode === "fullscreen" ? "inline" : "fullscreen";

  await log.info(`Requesting display mode: ${newMode}`);

  try {
    await appInstance.requestDisplayMode({ mode: newMode });
    // The actual mode change will be handled by onhostcontextchanged
  } catch (error) {
    await log.error("Failed to change display mode", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Apply theme to document
 */
function applyTheme(theme: "light" | "dark"): void {
  document.body.classList.remove("theme-light", "theme-dark");
  document.body.classList.add(`theme-${theme}`);
  console.log(`[WEATHER-APP] Applied theme: ${theme}`);
}

/**
 * Apply display mode classes to document
 */
function applyDisplayMode(mode: "inline" | "fullscreen" | "pip"): void {
  document.body.classList.remove("mode-inline", "mode-fullscreen", "mode-pip");
  document.body.classList.add(`mode-${mode}`);
  console.log(`[WEATHER-APP] Applied display mode: ${mode}`);
}

interface WeatherData {
  location: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    condition: string;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    weatherCode: number;
  };
  forecast: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    weatherCode: number;
    condition: string;
  }>;
}

// Popular cities for quick access
const QUICK_CITIES = [
  "Paris",
  "Tokyo",
  "New York",
  "London",
  "Sydney",
  "Dubai",
];

// Current weather data (stored for actions like "Tell Claude")
let currentWeatherData: WeatherData | null = null;

// Log entries for the logging panel
const logEntries: Array<{
  level: "info" | "warn" | "error";
  timestamp: string;
  message: string;
}> = [];

/**
 * Add a log entry to the UI panel
 */
function addLogEntry(
  level: "info" | "warn" | "error",
  timestamp: string,
  message: string,
): void {
  logEntries.push({ level, timestamp, message });

  // Keep only last 50 entries
  if (logEntries.length > 50) {
    logEntries.shift();
  }

  // Update UI
  const loggingContent = document.getElementById("logging-content");
  const logCount = document.getElementById("log-count");

  if (loggingContent) {
    const entry = document.createElement("div");
    entry.className = `log-entry log-${level}`;
    entry.innerHTML = `<span class="log-time">${timestamp}</span>${message}`;
    loggingContent.appendChild(entry);

    // Auto-scroll to bottom
    loggingContent.scrollTop = loggingContent.scrollHeight;
  }

  if (logCount) {
    logCount.textContent = `(${logEntries.length})`;
  }
}

/**
 * Get weather icon emoji based on WMO weather code
 */
function getWeatherIcon(weatherCode: number): string {
  // WMO Weather interpretation codes
  if (weatherCode === 0) return "☀️"; // Clear sky
  if (weatherCode <= 3) return "⛅"; // Partly cloudy
  if (weatherCode <= 48) return "🌫️"; // Fog
  if (weatherCode <= 57) return "🌧️"; // Drizzle
  if (weatherCode <= 67) return "🌧️"; // Rain
  if (weatherCode <= 77) return "❄️"; // Snow
  if (weatherCode <= 82) return "🌧️"; // Rain showers
  if (weatherCode <= 86) return "🌨️"; // Snow showers
  if (weatherCode <= 99) return "⛈️"; // Thunderstorm
  return "🌤️"; // Default
}

/**
 * Get day name from date string
 */
function getDayName(dateString: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Render the weather dashboard
 */
function renderWeather(data: WeatherData): void {
  // Store current data for actions
  currentWeatherData = data;

  const weatherContent = document.getElementById("weather-content");
  if (!weatherContent) return;

  const currentIcon = getWeatherIcon(data.current.weatherCode);

  weatherContent.innerHTML = `
    <div class="location-header">
      <h1>${data.location}</h1>
      <p>${data.latitude.toFixed(2)}°, ${data.longitude.toFixed(2)}°</p>
    </div>

    <div class="current-weather">
      <div class="current-main">
        <div class="weather-icon-large">${currentIcon}</div>
        <div>
          <div class="current-temp">${Math.round(data.current.temperature)}°C</div>
          <div class="current-condition">${data.current.condition}</div>
        </div>
      </div>
      <div class="current-details">
        <div class="detail-item">
          <div class="detail-label">Feels Like</div>
          <div class="detail-value">${Math.round(data.current.feelsLike)}°C</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Humidity</div>
          <div class="detail-value">${data.current.humidity}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Wind Speed</div>
          <div class="detail-value">${Math.round(data.current.windSpeed)} km/h</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">UV Index</div>
          <div class="detail-value">${data.current.uvIndex.toFixed(1)}</div>
        </div>
      </div>
    </div>

    <div class="forecast-section">
      <div class="forecast-header">
        <div class="forecast-title">7-Day Forecast</div>
        <button id="forecast-toggle-btn" class="forecast-toggle">
          <span id="forecast-toggle-text">Show Forecast</span>
          <span id="forecast-toggle-icon">▼</span>
        </button>
      </div>
      <div id="forecast-content" class="forecast-content">
        <div class="forecast-grid">
          ${data.forecast
            .map(
              (day, index) => `
            <div class="forecast-card">
              <div class="forecast-day">${getDayName(day.date, index)}</div>
              <div class="forecast-icon">${getWeatherIcon(day.weatherCode)}</div>
              <div class="forecast-temps">
                <span class="temp-high">${Math.round(day.tempMax)}°</span>
                <span class="temp-low">${Math.round(day.tempMin)}°</span>
              </div>
              <div class="forecast-condition">${day.condition}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;

  // Set up forecast toggle after rendering
  setTimeout(() => {
    setupForecastToggle();
  }, 0);

  log.info(`Weather rendered for ${data.location}`);
}

/**
 * Show error message
 */
function showError(message: string): void {
  const weatherContent = document.getElementById("weather-content");
  if (!weatherContent) return;

  weatherContent.innerHTML = `
    <div class="error-message">
      <h2>⚠️ Error</h2>
      <p>${message}</p>
    </div>
  `;
  log.error("Error displayed", message);
}

/**
 * Hide loading indicator
 */
function hideLoading(): void {
  const loadingEl = document.getElementById("loading");
  if (loadingEl) {
    loadingEl.style.display = "none";
  }
}

/**
 * Search for weather by location using callServerTool
 */
async function searchLocation(location: string): Promise<void> {
  if (!location.trim()) {
    showError("Please enter a location");
    return;
  }

  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    searchBtn.setAttribute("disabled", "true");
    searchBtn.innerHTML = '<span class="loading-spinner"></span> Searching...';
  }

  log.info(`Searching for location: ${location}`);

  try {
    // Call the show-weather tool with the location
    const result = await appInstance.callServerTool({
      name: "show-weather",
      arguments: { location },
    });

    log.info("Weather tool result received", result);

    // Extract weather data from result
    const weatherData = result._meta?.weatherData as WeatherData | undefined;

    if (weatherData) {
      renderWeather(weatherData);
      hideLoading();
    } else {
      showError("No weather data in response");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to fetch weather", errorMsg);
    showError(`Failed to fetch weather: ${errorMsg}`);
  } finally {
    if (searchBtn) {
      searchBtn.removeAttribute("disabled");
      searchBtn.innerHTML = "🔍 Search";
    }
  }
}

/**
 * Send weather summary to chat using sendMessage
 */
async function tellClaude(): Promise<void> {
  if (!currentWeatherData) {
    log.warn("No weather data available to share");
    return;
  }

  const data = currentWeatherData;
  const message = `The weather in ${data.location} is currently ${Math.round(data.current.temperature)}°C and ${data.current.condition.toLowerCase()}. It feels like ${Math.round(data.current.feelsLike)}°C with ${data.current.humidity}% humidity.`;

  log.info("Sending message to chat", message);

  try {
    await appInstance.sendMessage({
      content: [{ type: "text", text: message }],
      role: "user",
    });
    log.info("Message sent to chat successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to send message", errorMsg);
  }
}

/**
 * Open weather.com in browser using sendOpenLink
 */
async function openWeatherWebsite(): Promise<void> {
  if (!currentWeatherData) {
    log.warn("No weather data available for link");
    return;
  }

  const { location, latitude, longitude } = currentWeatherData;

  // Weather.com URL format
  const url = `https://weather.com/weather/today/l/${latitude.toFixed(2)},${longitude.toFixed(2)}`;

  log.info(`Opening Weather.com for ${location}`, url);

  try {
    await appInstance.sendOpenLink({ url });
    log.info("Link opened successfully");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to open link", errorMsg);
  }
}

/**
 * Initialize quick city buttons
 */
function initializeQuickCities(): void {
  const container = document.getElementById("quick-cities");
  if (!container) return;

  container.innerHTML = QUICK_CITIES.map(
    (city) => `<div class="city-chip" data-city="${city}">${city}</div>`,
  ).join("");

  // Add click handlers
  container.querySelectorAll(".city-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const city = chip.getAttribute("data-city");
      if (city) {
        searchLocation(city);
      }
    });
  });

  log.info("Quick cities initialized", QUICK_CITIES);
}

/**
 * Initialize logging panel toggle
 */
function initializeLoggingPanel(): void {
  const header = document.getElementById("logging-header");
  const content = document.getElementById("logging-content");
  const toggle = document.getElementById("logging-toggle");

  if (!header || !content || !toggle) return;

  // Start collapsed (isLogExpanded = false by default)
  content.classList.add("collapsed");
  toggle.textContent = "▶";

  header.addEventListener("click", () => {
    isLogExpanded = !isLogExpanded;
    content.classList.toggle("collapsed", !isLogExpanded);
    toggle.textContent = isLogExpanded ? "▼" : "▶";

    // Update viewport height dynamically
    updateViewportHeight();

    console.log(
      `[WEATHER-APP] Activity log ${isLogExpanded ? "expanded" : "collapsed"}`,
    );
  });
}

/**
 * Setup forecast toggle button
 */
function setupForecastToggle(): void {
  const toggleBtn = document.getElementById("forecast-toggle-btn");
  const forecastContent = document.getElementById("forecast-content");
  const toggleText = document.getElementById("forecast-toggle-text");
  const toggleIcon = document.getElementById("forecast-toggle-icon");

  if (!toggleBtn || !forecastContent || !toggleText || !toggleIcon) return;

  toggleBtn.addEventListener("click", async () => {
    isForecastVisible = !isForecastVisible;
    forecastContent.classList.toggle("visible", isForecastVisible);
    toggleText.textContent = isForecastVisible ? "Hide Forecast" : "Show Forecast";
    toggleIcon.textContent = isForecastVisible ? "▲" : "▼";

    // Update viewport height dynamically
    updateViewportHeight();

    await log.info(
      isForecastVisible
        ? "7-day forecast expanded"
        : "7-day forecast collapsed",
    );
  });
}

// Create App instance
const app = new App(
  { name: "Weather Dashboard", version: "1.0.0" },
  {},
  { autoResize: false },
);

// Make app instance available to log functions
appInstance = app;

// Register handlers
app.onteardown = async () => {
  await log.info("App is being torn down");
  return {};
};

app.onerror = (error: Error) => {
  log.error("App error occurred", error.message);
};

// Handle tool input (initial call)
app.ontoolinput = async (params) => {
  log.info("Received tool input:", params);
};

// Handle tool result (weather data from show-weather tool)
app.ontoolresult = async (result) => {
  await log.info("Received tool result from server");

  const weatherData = result._meta?.weatherData as WeatherData | undefined;

  if (weatherData) {
    try {
      renderWeather(weatherData);
      hideLoading();
      await log.info("Initial weather data rendered", weatherData.location);
    } catch (error) {
      await log.error(
        "Failed to render weather",
        error instanceof Error ? error.message : String(error),
      );
      showError("Failed to display weather data");
      hideLoading();
    }
  } else {
    await log.warn("Tool result received but no weather data found");
  }
};

// Handle host context changes (theme, display mode)
app.onhostcontextchanged = async (context) => {
  await log.info("Host context changed", {
    theme: context.theme,
    displayMode: context.displayMode,
  });

  // Apply theme if available
  if (context.theme) {
    applyTheme(context.theme);
  }

  // Apply display mode if available
  if (context.displayMode) {
    currentDisplayMode = context.displayMode;
    applyDisplayMode(context.displayMode);
    updateFullscreenButton();
  }
};

// Initialize and connect to host
async function initialize() {
  try {
    await app.connect();
    await log.info("Connected to host");

    // Show the weather container immediately
    const container = document.getElementById("weather-container");
    if (container) {
      container.style.display = "block";
    }

    // Set initial viewport height (forecast hidden, log collapsed)
    updateViewportHeight();
    await log.info("Sent initial size");

    // Initialize interactive features
    initializeQuickCities();
    initializeLoggingPanel();

    // Set up search functionality
    const searchInput = document.getElementById(
      "location-search",
    ) as HTMLInputElement;
    const searchBtn = document.getElementById("search-btn");

    if (searchInput && searchBtn) {
      // Search on button click
      searchBtn.addEventListener("click", () => {
        searchLocation(searchInput.value);
      });

      // Search on Enter key
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchLocation(searchInput.value);
        }
      });

      await log.info("Search handlers registered");
    }

    // Set up action buttons
    const tellClaudeBtn = document.getElementById("tell-claude-btn");
    const openWebBtn = document.getElementById("open-web-btn");

    if (tellClaudeBtn) {
      tellClaudeBtn.addEventListener("click", tellClaude);
      await log.info("Tell Claude button registered");
    }

    if (openWebBtn) {
      openWebBtn.addEventListener("click", openWeatherWebsite);
      await log.info("Open Web button registered");
    }

    // Set up fullscreen button
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    if (fullscreenBtn) {
      fullscreenBtn.style.display = "flex";
      fullscreenBtn.addEventListener("click", toggleFullscreen);
      await log.info("Fullscreen button registered");
    }

    // Initialize theme and display mode from host context
    const hostContext = app.getHostContext();
    if (hostContext) {
      if (hostContext.theme) {
        applyTheme(hostContext.theme);
        await log.info(`Initial theme applied: ${hostContext.theme}`);
      }
      if (hostContext.displayMode) {
        currentDisplayMode = hostContext.displayMode;
        applyDisplayMode(hostContext.displayMode);
        updateFullscreenButton();
        await log.info(`Initial display mode applied: ${hostContext.displayMode}`);
      }
    }

    // Set up keyboard shortcuts
    document.addEventListener("keydown", async (e) => {
      // Escape: Exit fullscreen
      if (e.key === "Escape" && currentDisplayMode === "fullscreen") {
        e.preventDefault();
        await toggleFullscreen();
      }
      // Ctrl+Enter or Cmd+Enter: Toggle fullscreen
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        await toggleFullscreen();
      }
    });
    await log.info("Keyboard shortcuts registered (Escape, Ctrl+Enter)");

    // Wait a bit for tool input
    setTimeout(async () => {
      const loadingEl = document.getElementById("loading");
      if (loadingEl && loadingEl.style.display !== "none") {
        await log.info(
          "No initial weather data, ready for search",
        );
        hideLoading();
      }
    }, 2000);
  } catch (error) {
    await log.error(
      "Failed to initialize",
      error instanceof Error ? error.message : String(error),
    );
    showError(
      `Initialization error: ${error instanceof Error ? error.message : String(error)}`,
    );
    hideLoading();
  }
}

// Start initialization
initialize();
