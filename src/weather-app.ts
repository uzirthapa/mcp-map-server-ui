/**
 * Weather Dashboard MCP App
 *
 * Displays weather information using Open-Meteo API data.
 */
import { App } from "@modelcontextprotocol/ext-apps";

const log = {
  info: console.log.bind(console, "[WEATHER-APP]"),
  warn: console.warn.bind(console, "[WEATHER-APP]"),
  error: console.error.bind(console, "[WEATHER-APP]"),
};

// Preferred height for inline mode (px)
const PREFERRED_INLINE_HEIGHT = 600;

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
  const container = document.getElementById("weather-container");
  if (!container) return;

  const currentIcon = getWeatherIcon(data.current.weatherCode);

  container.innerHTML = `
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
      <div class="forecast-title">7-Day Forecast</div>
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
  `;

  container.style.display = "block";
}

/**
 * Show error message
 */
function showError(message: string): void {
  const container = document.getElementById("weather-container");
  if (!container) return;

  container.innerHTML = `
    <div class="error-message">
      <h2>⚠️ Error</h2>
      <p>${message}</p>
    </div>
  `;
  container.style.display = "block";
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

// Create App instance
const app = new App(
  { name: "Weather Dashboard", version: "1.0.0" },
  {},
  { autoResize: false },
);

// Register handlers
app.onteardown = async () => {
  log.info("App is being torn down");
  return {};
};

app.onerror = log.error;

// Handle tool input (weather data from show-weather tool)
app.ontoolinput = async (params) => {
  log.info("Received tool input:", params);

  const weatherData = params.arguments as WeatherData | undefined;

  if (weatherData) {
    try {
      renderWeather(weatherData);
      hideLoading();
    } catch (error) {
      log.error("Failed to render weather:", error);
      showError("Failed to display weather data");
      hideLoading();
    }
  }
};

// Initialize and connect to host
async function initialize() {
  try {
    await app.connect();
    log.info("Connected to host");

    // Tell host our preferred size for inline mode
    app.sendSizeChanged({ height: PREFERRED_INLINE_HEIGHT });
    log.info("Sent initial size:", PREFERRED_INLINE_HEIGHT);

    // Wait a bit for tool input
    setTimeout(() => {
      const loadingEl = document.getElementById("loading");
      if (loadingEl && loadingEl.style.display !== "none") {
        showError("No weather data received. Please call the show-weather tool.");
        hideLoading();
      }
    }, 3000);
  } catch (error) {
    log.error("Failed to initialize:", error);
    showError(
      `Initialization error: ${error instanceof Error ? error.message : String(error)}`,
    );
    hideLoading();
  }
}

// Start initialization
initialize();
