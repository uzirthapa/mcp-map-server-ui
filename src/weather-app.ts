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

// Phase 3: Persistence & State
let viewUUID: string | null = null; // Storage key from tool result metadata

/**
 * Favorite location for quick access
 */
interface FavoriteLocation {
  location: string;
  latitude: number;
  longitude: number;
  addedAt: number; // timestamp
}

/**
 * Search history entry
 */
interface SearchHistoryEntry {
  location: string;
  timestamp: number;
}

/**
 * Persisted state for weather app
 */
interface PersistedWeatherState {
  favorites: FavoriteLocation[];
  searchHistory: SearchHistoryEntry[];
  lastLocation?: string;
}

/**
 * Load persisted state from localStorage
 */
function loadPersistedState(): PersistedWeatherState {
  const defaultState: PersistedWeatherState = {
    favorites: [],
    searchHistory: [],
  };

  if (!viewUUID) return defaultState;

  try {
    const stored = localStorage.getItem(`weather-state-${viewUUID}`);
    if (!stored) return defaultState;

    const state = JSON.parse(stored) as PersistedWeatherState;
    return {
      favorites: Array.isArray(state.favorites) ? state.favorites : [],
      searchHistory: Array.isArray(state.searchHistory) ? state.searchHistory : [],
      lastLocation: state.lastLocation,
    };
  } catch (error) {
    console.warn("Failed to load persisted state:", error);
    return defaultState;
  }
}

/**
 * Save state to localStorage
 */
function savePersistedState(state: PersistedWeatherState): void {
  if (!viewUUID) return;

  try {
    localStorage.setItem(`weather-state-${viewUUID}`, JSON.stringify(state));
    console.log("[WEATHER-APP] Saved persisted state");
  } catch (error) {
    console.warn("Failed to save persisted state:", error);
  }
}

// Current persisted state
let persistedState: PersistedWeatherState = {
  favorites: [],
  searchHistory: [],
};

/**
 * Add location to search history
 */
function addToSearchHistory(location: string): void {
  // Remove duplicates
  persistedState.searchHistory = persistedState.searchHistory.filter(
    (entry) => entry.location.toLowerCase() !== location.toLowerCase()
  );

  // Add to beginning
  persistedState.searchHistory.unshift({
    location,
    timestamp: Date.now(),
  });

  // Keep only last 10
  persistedState.searchHistory = persistedState.searchHistory.slice(0, 10);

  savePersistedState(persistedState);
}

/**
 * Add location to favorites
 */
function addToFavorites(location: string, latitude: number, longitude: number): void {
  // Check if already favorited
  const exists = persistedState.favorites.some(
    (fav) => fav.location.toLowerCase() === location.toLowerCase()
  );

  if (exists) {
    log.warn("Location already in favorites");
    return;
  }

  persistedState.favorites.push({
    location,
    latitude,
    longitude,
    addedAt: Date.now(),
  });

  savePersistedState(persistedState);
  log.info(`Added ${location} to favorites`);
}

/**
 * Remove location from favorites
 */
function removeFromFavorites(location: string): void {
  persistedState.favorites = persistedState.favorites.filter(
    (fav) => fav.location.toLowerCase() !== location.toLowerCase()
  );

  savePersistedState(persistedState);
  log.info(`Removed ${location} from favorites`);
}

/**
 * Check if location is favorited
 */
function isFavorited(location: string): boolean {
  return persistedState.favorites.some(
    (fav) => fav.location.toLowerCase() === location.toLowerCase()
  );
}

// Height components for dynamic calculation (px)
// Optimized for Claude UI (800x1000 viewport with ~100px host chrome)
const HEIGHT_BASE = 740;              // Search, current weather, buttons (ultra-compact)
const HEIGHT_FORECAST = 210;          // 7-day forecast when visible (minimal cards, fits 1000px exactly)
const HEIGHT_LOG_COLLAPSED = 50;      // Activity log header only
const HEIGHT_LOG_EXPANDED = 349;      // Activity log header + content

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

  const favorited = isFavorited(data.location);
  const starIcon = favorited ? "⭐" : "☆";

  weatherContent.innerHTML = `
    <div class="location-header">
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
        <h1>${data.location}</h1>
        <button id="favorite-btn" class="favorite-btn" title="${favorited ? "Remove from favorites" : "Add to favorites"}">${starIcon}</button>
      </div>
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

  // Set up forecast toggle and favorite button after rendering
  setTimeout(() => {
    setupForecastToggle();
    setupFavoriteButton(data);
  }, 0);

  log.info(`Weather rendered for ${data.location}`);
}

/**
 * Setup favorite button handler
 */
function setupFavoriteButton(data: WeatherData): void {
  const favoriteBtn = document.getElementById("favorite-btn");
  if (!favoriteBtn) return;

  favoriteBtn.addEventListener("click", () => {
    if (isFavorited(data.location)) {
      removeFromFavorites(data.location);
      favoriteBtn.textContent = "☆";
      favoriteBtn.title = "Add to favorites";
    } else {
      addToFavorites(data.location, data.latitude, data.longitude);
      favoriteBtn.textContent = "⭐";
      favoriteBtn.title = "Remove from favorites";
    }
  });
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

      // Add to search history
      addToSearchHistory(weatherData.location);
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
 * Call progressive streaming weather analysis API
 */
async function getWeatherStream(): Promise<void> {
  if (!currentWeatherData) {
    log.warn("No weather data available for streaming analysis");
    return;
  }

  const { location, latitude, longitude } = currentWeatherData;
  log.info("Starting progressive weather stream", {
    location,
    latitude,
    longitude,
  });

  try {
    // Call the streaming tool
    const response = await appInstance.callServerTool({
      name: "uzir-weather-stream",
      arguments: {
        location,
        latitude,
        longitude,
      },
    });

    log.info("Received streaming response metadata", response);

    // Extract stream metadata
    const streamId = (response as any)._meta?.streamId;
    const updates = (response as any)._meta?.updates;
    const totalPhases = (response as any)._meta?.totalPhases;

    if (!updates || !Array.isArray(updates)) {
      throw new Error("No stream updates in response");
    }

    // Display progressive insights
    displayProgressiveInsights(streamId, updates, totalPhases);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to start weather stream", errorMsg);
    alert(`Failed to start weather stream: ${errorMsg}`);
  }
}

/**
 * Display progressive insights as they arrive over time
 */
function displayProgressiveInsights(
  streamId: string,
  updates: any[],
  totalPhases: number,
): void {
  // Create modal
  const modal = document.createElement("div");
  modal.className = "insights-modal stream-modal";
  modal.innerHTML = `
    <div class="insights-content">
      <div class="insights-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h2>🌊 Progressive Weather Analysis</h2>
        <button class="close-insights">×</button>
      </div>
      <div class="insights-body">
        <div class="stream-info">
          <p><strong>Stream ID:</strong> <code>${streamId}</code></p>
          <p><strong>Total Phases:</strong> ${totalPhases}</p>
        </div>
        <div class="stream-progress">
          <div class="progress-bar">
            <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
          </div>
          <p id="progress-text">Initializing stream...</p>
        </div>
        <div id="stream-phases" class="stream-phases">
          <!-- Phases will be added here progressively -->
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add close handler
  const closeBtn = modal.querySelector(".close-insights");
  closeBtn?.addEventListener("click", () => {
    modal.remove();
  });

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  log.info("Stream modal displayed, starting progressive updates");

  // Simulate progressive updates arriving over time
  const phasesContainer = document.getElementById("stream-phases");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  if (!phasesContainer || !progressFill || !progressText) return;

  updates.forEach((update, index) => {
    setTimeout(() => {
      // Add phase content
      const phaseElement = document.createElement("div");
      phaseElement.className = "stream-phase";
      phaseElement.style.animation = "slideUp 0.4s ease-out";

      const phaseContent = renderPhaseContent(update);
      phaseElement.innerHTML = phaseContent;

      phasesContainer.appendChild(phaseElement);

      // Update progress
      const progress = ((index + 1) / totalPhases) * 100;
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Phase ${index + 1} of ${totalPhases}: ${update.title}`;

      log.info(`Stream phase ${update.phase} received`, update.title);

      // Final phase
      if (index === totalPhases - 1) {
        progressText.textContent = "Analysis complete! ✓";
        progressText.style.color = "#10b981";
        progressText.style.fontWeight = "700";
      }
    }, update.delay);
  });
}

/**
 * Render content for a stream phase
 */
function renderPhaseContent(update: any): string {
  const { phase, title, data } = update;

  let content = `
    <div class="phase-header">
      <h3><span class="phase-badge">Phase ${phase}</span> ${title}</h3>
      <span class="phase-timestamp">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="phase-body">
  `;

  // Phase 1: Current Conditions
  if (data.temperature !== undefined) {
    content += `
      <div class="data-grid">
        <div><strong>Temperature:</strong> ${data.temperature.toFixed(1)}°C</div>
        <div><strong>Humidity:</strong> ${data.humidity.toFixed(1)}%</div>
        <div><strong>Wind Speed:</strong> ${data.windSpeed.toFixed(1)} km/h</div>
        <div><strong>Pressure:</strong> ${data.pressure.toFixed(1)} hPa</div>
      </div>
    `;
  }

  // Phase 2: Pattern Analysis
  if (data.temperatureTrend) {
    content += `<h4>Temperature Trend:</h4>`;
    content += `<div class="data-grid">`;
    content += `<div><strong>Direction:</strong> ${data.temperatureTrend.direction}</div>`;
    content += `<div><strong>Rate:</strong> ${data.temperatureTrend.rate.toFixed(2)}°C/hr</div>`;
    content += `<div><strong>Confidence:</strong> ${(data.temperatureTrend.confidence * 100).toFixed(0)}%</div>`;
    content += `</div>`;
  }
  if (data.precipitationRisk) {
    content += `<h4>Precipitation Risk:</h4>`;
    content += `<div class="data-grid">`;
    content += `<div><strong>Next 24 hours:</strong> ${data.precipitationRisk.next24h.toFixed(0)}%</div>`;
    content += `<div><strong>Next 72 hours:</strong> ${data.precipitationRisk.next72h.toFixed(0)}%</div>`;
    content += `</div>`;
  }

  // Phase 3: Historical Comparison
  if (data.temperatureDeviation !== undefined) {
    content += `
      <p><strong>Temperature Deviation:</strong> ${data.temperatureDeviation > 0 ? "+" : ""}${data.temperatureDeviation.toFixed(1)}°C from average</p>
      <p><strong>Humidity Deviation:</strong> ${data.humidityDeviation > 0 ? "+" : ""}${data.humidityDeviation.toFixed(1)}% from average</p>
    `;
    if (data.unusualFactors && data.unusualFactors.length > 0) {
      content += `<h4>Unusual Factors:</h4><ul>`;
      data.unusualFactors.forEach((factor: string) => {
        content += `<li>${factor}</li>`;
      });
      content += `</ul>`;
    }
  }

  // Phase 4: Forecast Predictions
  if (data.shortTerm) {
    content += `<h4>Short-term Forecast:</h4>`;
    content += `<div class="data-grid">`;
    content += `<div><strong>Next ${data.shortTerm.nextHours} hours:</strong> ${data.shortTerm.expectedChange}</div>`;
    content += `<div><strong>Confidence:</strong> ${(data.shortTerm.confidence * 100).toFixed(0)}%</div>`;
    content += `</div>`;
  }
  if (data.mediumTerm) {
    content += `<h4>Medium-term Forecast:</h4>`;
    content += `<p><strong>Next ${data.mediumTerm.nextDays} days:</strong> ${data.mediumTerm.expectedPattern}</p>`;
  }

  // Phase 5: Recommendations
  if (data.clothing) {
    content += `<h4>Recommendations:</h4>`;
    content += `<p><strong>Clothing:</strong> ${data.clothing}</p>`;
  }
  if (data.activities) {
    content += `<p><strong>Activities:</strong> ${data.activities}</p>`;
  }
  if (data.alerts && data.alerts.length > 0) {
    content += `<h4>Alerts:</h4><ul>`;
    data.alerts.forEach((alert: string) => {
      content += `<li>${alert}</li>`;
    });
    content += `</ul>`;
  }

  content += `</div>`;

  return content;
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

  // Extract viewUUID for localStorage key
  if (result._meta?.viewUUID && !viewUUID) {
    viewUUID = result._meta.viewUUID as string;
    // Load persisted state
    persistedState = loadPersistedState();
    await log.info("Loaded persisted state", { favorites: persistedState.favorites.length, history: persistedState.searchHistory.length });
  }

  const weatherData = result._meta?.weatherData as WeatherData | undefined;

  if (weatherData) {
    try {
      renderWeather(weatherData);
      hideLoading();

      // Add to search history
      addToSearchHistory(weatherData.location);

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

    const streamBtn = document.getElementById("stream-btn");
    if (streamBtn) {
      streamBtn.addEventListener("click", getWeatherStream);
      await log.info("Stream button registered");
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
