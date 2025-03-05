// Weather API key and base URLs
const API_KEY = "ee5087aa22bdc92475bf283efa377cfa"; // OpenWeatherMap API key
const CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// Geoapify API key for autocomplete suggestions
const GEOAPIFY_API_KEY = "cc3fead457d043818d7c759767c59551";

// DOM Elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const loadingContainer = document.getElementById("loading");
const errorContainer = document.getElementById("error");
const errorMessage = document.getElementById("error-message");
const initialState = document.getElementById("initial-state");
const weatherCard = document.getElementById("weather");
const locationElement = document.getElementById("location");
const dateElement = document.getElementById("date");
const weatherIconContainer = document.getElementById("weather-icon-container");
const temperatureElement = document.getElementById("temperature");
const descriptionElement = document.getElementById("description");
const feelsLikeElement = document.getElementById("feels-like");
const humidityElement = document.getElementById("humidity");
const windSpeedElement = document.getElementById("wind-speed");
const pressureElement = document.getElementById("pressure");
const hourlyForecastContainer = document.getElementById("hourly-forecast-container");
const dailyForecastContainer = document.getElementById("daily-forecast-container");
const suggestionsContainer = document.getElementById("suggestions-container");

// Global variables for debouncing and storing suggestion data
let weatherDebounceTimeout;
let suggestionDebounceTimeout;
let selectedIndex = -1;
let lastSelectedSuggestion = null; // Stores the selected suggestion object

// Event Listeners
searchForm.addEventListener("submit", handleSubmit);

// Listen to input events for both weather fetching and suggestions
cityInput.addEventListener("input", (e) => {
  const query = cityInput.value.trim();

  // Debounce weather fetch (1000ms)
  clearTimeout(weatherDebounceTimeout);
  weatherDebounceTimeout = setTimeout(() => {
    if (query) {
      suggestionsContainer.innerHTML = "";
      fetchWeatherData(query);
    }
  }, 10000);

  // Debounce suggestions (15ms) using Geoapify autocomplete
  clearTimeout(suggestionDebounceTimeout);
  suggestionDebounceTimeout = setTimeout(() => {
    if (query) {
      fetchCitySuggestions(query)
        .then((suggestions) => {
          displaySuggestions(suggestions);
        })
        .catch((err) => {
          console.error("Error fetching suggestions:", err);
          suggestionsContainer.innerHTML = "";
        });
    } else {
      suggestionsContainer.innerHTML = "";
    }
  }, 15);
});

// Keyboard navigation for suggestions
cityInput.addEventListener("keydown", handleKeyDown);

// Auto-refresh weather every 20 seconds if a city is entered
setInterval(() => {
  const city = cityInput.value.trim();
  if (city) {
    fetchWeatherData(city);
  }
}, 20000);

function handleSubmit(e) {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  suggestionsContainer.innerHTML = "";
  fetchWeatherData(city);
}

// ---------------- Weather Data Fetching ---------------- //
async function fetchWeatherData(city) {
  showLoading();
  try {
    // Fetch current weather data
    const currentWeatherResponse = await fetch(
      `${CURRENT_WEATHER_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    );
    if (!currentWeatherResponse.ok) {
      throw new Error("City not found or weather data unavailable");
    }
    const currentWeatherData = await currentWeatherResponse.json();

    // Fetch 5-day forecast data
    const forecastResponse = await fetch(
      `${FORECAST_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    );
    if (!forecastResponse.ok) {
      throw new Error("Forecast data unavailable");
    }
    const forecastData = await forecastResponse.json();

    displayWeather(currentWeatherData, forecastData);
  } catch (err) {
    console.error("Error fetching weather data:", err);
    showError(err.message);
  }
}

function displayWeather(currentData, forecastData) {
  hideLoading();
  hideError();
  hideInitialState();
  showWeatherCard();

  // Use the selected suggestion (if available) to display full location info
  if (lastSelectedSuggestion) {
    let loc = lastSelectedSuggestion.city;
    if (lastSelectedSuggestion.state) loc += `, ${lastSelectedSuggestion.state}`;
    if (lastSelectedSuggestion.country) loc += `, ${lastSelectedSuggestion.country}`;
    locationElement.textContent = loc;
  } else {
    locationElement.textContent = `${currentData.name}, ${currentData.sys.country}`;
  }
  dateElement.textContent = formatDate(new Date());
  temperatureElement.textContent = `${Math.round(currentData.main.temp)}°C`;
  descriptionElement.textContent = currentData.weather[0].description;
  feelsLikeElement.textContent = `${Math.round(currentData.main.feels_like)}°C`;
  humidityElement.textContent = `${currentData.main.humidity}%`;
  windSpeedElement.textContent = `${currentData.wind.speed} m/s`;
  pressureElement.textContent = `${currentData.main.pressure} hPa`;
  
  weatherIconContainer.innerHTML = getWeatherIcon(currentData.weather[0].id);

  if (forecastData && forecastData.list && forecastData.list.length > 0) {
    displayHourlyForecast(forecastData.list.slice(0, 8)); // Next 24 hours (3-hour intervals)
    displayDailyForecast(forecastData.list);
  } else {
    console.error("Invalid forecast data structure:", forecastData);
    hourlyForecastContainer.innerHTML = '<p class="error-hint">Hourly forecast data unavailable</p>';
    dailyForecastContainer.innerHTML = '<p class="error-hint">Daily forecast data unavailable</p>';
  }
}

function displayHourlyForecast(hourlyData) {
  hourlyForecastContainer.innerHTML = "";
  if (!hourlyData || hourlyData.length === 0) {
    hourlyForecastContainer.innerHTML = '<p class="error-hint">Hourly forecast data unavailable</p>';
    return;
  }
  hourlyData.forEach((item) => {
    const hour = new Date(item.dt * 1000);
    const temp = Math.round(item.main.temp);
    const iconId = item.weather[0].id;
    const hourlyItem = document.createElement("div");
    hourlyItem.className = "hourly-item";
    hourlyItem.innerHTML = `
      <p class="hourly-time">${formatHour(hour)}</p>
      <div class="hourly-icon">
        ${getWeatherIcon(iconId, 32)}
      </div>
      <p class="hourly-temp">${temp}°C</p>
    `;
    hourlyForecastContainer.appendChild(hourlyItem);
  });
}

function displayDailyForecast(forecastList) {
  dailyForecastContainer.innerHTML = "";
  if (!forecastList || forecastList.length === 0) {
    dailyForecastContainer.innerHTML = '<p class="error-hint">Daily forecast data unavailable</p>';
    return;
  }
  const dailyData = groupForecastByDay(forecastList);
  const dayKeys = Object.keys(dailyData);
  if (dayKeys.length === 0) {
    dailyForecastContainer.innerHTML = '<p class="error-hint">Daily forecast data unavailable</p>';
    return;
  }
  dayKeys.forEach((date, index) => {
    if (index === 0) return; // Skip today
    if (index > 5) return; // Only show 5 days
    const dayData = dailyData[date];
    if (!dayData || dayData.length === 0) return;
    const dayTemp = Math.round(calculateAverageTemp(dayData));
    const dayDate = new Date(dayData[0].dt * 1000);
    const iconId = getMostFrequentWeatherId(dayData);
    const dailyItem = document.createElement("div");
    dailyItem.className = "daily-item";
    dailyItem.innerHTML = `
      <p class="daily-date">${formatDay(dayDate)}</p>
      <div class="daily-icon">
        ${getWeatherIcon(iconId, 40)}
      </div>
      <div class="daily-temp-container">
        <p class="daily-temp">${dayTemp}°C</p>
        <p class="daily-description">${dayData[0].weather[0].description}</p>
      </div>
    `;
    dailyForecastContainer.appendChild(dailyItem);
  });
  if (dailyForecastContainer.children.length === 0) {
    dailyForecastContainer.innerHTML = '<p class="error-hint">5-day forecast data unavailable</p>';
  }
}

function groupForecastByDay(forecastList) {
  const dailyData = {};
  forecastList.forEach(item => {
    if (!item || !item.dt) return;
    const date = new Date(item.dt * 1000).toDateString();
    if (!dailyData[date]) {
      dailyData[date] = [];
    }
    dailyData[date].push(item);
  });
  return dailyData;
}

function calculateAverageTemp(dayData) {
  if (!dayData || dayData.length === 0) return 0;
  const sum = dayData.reduce((acc, item) => acc + (item.main ? item.main.temp : 0), 0);
  return sum / dayData.length;
}

function getMostFrequentWeatherId(dayData) {
  if (!dayData || dayData.length === 0 || !dayData[0].weather || !dayData[0].weather[0]) {
    return 800;
  }
  const weatherIdCounts = {};
  let maxCount = 0;
  let mostFrequentId = dayData[0].weather[0].id;
  dayData.forEach(item => {
    if (!item.weather || !item.weather[0]) return;
    const id = item.weather[0].id;
    weatherIdCounts[id] = (weatherIdCounts[id] || 0) + 1;
    if (weatherIdCounts[id] > maxCount) {
      maxCount = weatherIdCounts[id];
      mostFrequentId = id;
    }
  });
  return mostFrequentId;
}

function formatDate(date) {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

function formatDay(date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatHour(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", hour12: true });
}

function getWeatherIcon(weatherId, size = 64) {
  let iconSvg = "";
  const strokeColor = getIconColor(weatherId);
  if (weatherId >= 200 && weatherId < 300) {
    // Thunderstorm
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
      <path d="M13 19l-2 3"></path>
      <path d="M13 11l-4 8"></path>
    </svg>`;
  } else if (weatherId >= 300 && weatherId < 500) {
    // Drizzle
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
      <path d="M11 13v2"></path>
      <path d="M14 13v2"></path>
    </svg>`;
  } else if (weatherId >= 500 && weatherId < 600) {
    // Rain
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
      <path d="M11 13v4"></path>
      <path d="M14 13v4"></path>
    </svg>`;
  } else if (weatherId >= 600 && weatherId < 700) {
    // Snow
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
      <path d="M11 15h.01"></path>
      <path d="M14 15h.01"></path>
      <path d="M11 18h.01"></path>
      <path d="M14 18h.01"></path>
    </svg>`;
  } else if (weatherId >= 700 && weatherId < 800) {
    // Atmosphere (Fog, Mist, etc.)
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10h18"></path>
      <path d="M3 14h18"></path>
      <path d="M3 18h18"></path>
      <path d="M3 6h18"></path>
    </svg>`;
  } else if (weatherId === 800) {
    // Clear
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="m17.66 17.66 1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.34 17.66-1.41 1.41"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
    </svg>`;
  } else {
    // Clouds
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
    </svg>`;
  }
  return iconSvg;
}

function getIconColor(weatherId) {
  if (weatherId >= 200 && weatherId < 300) return "#90caf9";
  if (weatherId >= 300 && weatherId < 500) return "#bbdefb";
  if (weatherId >= 500 && weatherId < 600) return "#64b5f6";
  if (weatherId >= 600 && weatherId < 700) return "#e3f2fd";
  if (weatherId >= 700 && weatherId < 800) return "#b0bec5";
  if (weatherId === 800) return "#ffb74d";
  return "#bdbdbd";
}

// ---------------- UI State Functions ---------------- //
function showLoading() {
  loadingContainer.classList.remove("hidden");
  errorContainer.classList.add("hidden");
  initialState.classList.add("hidden");
  weatherCard.classList.add("hidden");
}

function hideLoading() {
  loadingContainer.classList.add("hidden");
}

function showError(message) {
  hideLoading();
  errorContainer.classList.remove("hidden");
  initialState.classList.remove("hidden");
  weatherCard.classList.add("hidden");
  errorMessage.textContent = message;
}

function hideError() {
  errorContainer.classList.add("hidden");
}

function hideInitialState() {
  initialState.classList.add("hidden");
}

function showWeatherCard() {
  weatherCard.classList.remove("hidden");
}

// ---------------- Geoapify Autocomplete Suggestions ---------------- //
async function fetchCitySuggestions(query) {
  if (query.length < 2) {
    suggestionsContainer.innerHTML = "";
    return;
  }
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&limit=5&apiKey=${GEOAPIFY_API_KEY}`
    );
    const data = await response.json();
    // Map features to objects with city, state, and country.
    // Fallback: if "state" is missing, try state_district or county.
    const suggestions = data.features.map((feature) => {
      const props = feature.properties;
      return {
        city: props.city || props.name || "",
        state: props.state || props.state_district || props.county || "",
        country: props.country || ""
      };
    });
    return suggestions;
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
    suggestionsContainer.innerHTML = "";
    return [];
  }
}

function displaySuggestions(suggestions) {
  suggestionsContainer.innerHTML = "";
  if (!suggestions || suggestions.length === 0) return;

  const ul = document.createElement("ul");
  ul.classList.add("suggestions-list");

  suggestions.forEach((suggestion, index) => {
    let displayString = suggestion.city;
    if (suggestion.state) displayString += `, ${suggestion.state}`;
    if (suggestion.country) displayString += `, ${suggestion.country}`;

    const li = document.createElement("li");
    li.textContent = displayString;
    li.classList.add("suggestion-item");

    li.addEventListener("click", () => selectSuggestion(suggestion, displayString));
    li.addEventListener("mouseover", () => highlightSuggestion(index));
    ul.appendChild(li);
  });

  suggestionsContainer.appendChild(ul);
  selectedIndex = -1;
}

function selectSuggestion(suggestionObj, displayString) {
  cityInput.value = displayString;
  suggestionsContainer.innerHTML = "";
  lastSelectedSuggestion = suggestionObj;
  fetchWeatherData(displayString);
}

function handleKeyDown(event) {
  const items = document.querySelectorAll(".suggestion-item");
  if (!items.length) return;

  if (event.key === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % items.length;
    highlightSuggestion(selectedIndex);
    event.preventDefault();
  } else if (event.key === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    highlightSuggestion(selectedIndex);
    event.preventDefault();
  } else if (event.key === "Enter" && selectedIndex !== -1) {
    event.preventDefault();
    selectSuggestion(
      // We can access the suggestion using the stored index.
      items[selectedIndex].suggestionObj,
      items[selectedIndex].textContent
    );
    // Alternatively, since our click listener already handles selection, you can call:
    // selectSuggestion(lastSelectedSuggestion, items[selectedIndex].textContent);
  }
}

function highlightSuggestion(index) {
  const items = document.querySelectorAll(".suggestion-item");
  items.forEach((item, i) => {
    item.classList.toggle("highlighted", i === index);
  });
}
