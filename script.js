// Weather API key and base URLs
const API_KEY = "ee5087aa22bdc92475bf283efa377cfa"; // Using the original API key from your project
const CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// DOM Elements
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const loadingContainer = document.getElementById('loading');
const errorContainer = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
setInterval(() => {
  const city = cityInput.value.trim();
  if (city) {
    fetchWeatherData(city);
  }
}, 10000);
let debounceTimeout;
cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    const city = cityInput.value.trim();
    if (city) {
      fetchWeatherData(city);
    }
  }, 1000); // 500ms debounce time
});
const initialState = document.getElementById('initial-state');
const weatherCard = document.getElementById('weather');
const locationElement = document.getElementById('location');
const dateElement = document.getElementById('date');
const weatherIconContainer = document.getElementById('weather-icon-container');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
const feelsLikeElement = document.getElementById('feels-like');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');
const pressureElement = document.getElementById('pressure');
const hourlyForecastContainer = document.getElementById('hourly-forecast-container');
const dailyForecastContainer = document.getElementById('daily-forecast-container');

// Event Listeners
searchForm.addEventListener('submit', handleSubmit);

// Functions
function handleSubmit(e) {
  e.preventDefault();
  const city = cityInput.value.trim();
  
  if (!city) return;
  
  fetchWeatherData(city);
}

async function fetchWeatherData(city) {
  // Show loading, hide other states
  showLoading();
  
  try {
    // Fetch current weather
    const currentWeatherResponse = await fetch(
      `${CURRENT_WEATHER_URL}?q=${city}&units=metric&appid=${API_KEY}`
    );
    
    if (!currentWeatherResponse.ok) {
      throw new Error('City not found or weather data unavailable');
    }
    
    const currentWeatherData = await currentWeatherResponse.json();
    
    // Fetch 5-day forecast (includes hourly data)
    const forecastResponse = await fetch(
      `${FORECAST_URL}?q=${city}&units=metric&appid=${API_KEY}`
    );
    
    if (!forecastResponse.ok) {
      throw new Error('Forecast data unavailable');
    }
    
    const forecastData = await forecastResponse.json();
    
    // Display all weather data
    displayWeather(currentWeatherData, forecastData);
  } catch (err) {
    console.error('Error fetching weather data:', err);
    showError(err.message);
  }
}

function displayWeather(currentData, forecastData) {
  // Hide loading, show weather
  hideLoading();
  hideError();
  hideInitialState();
  showWeatherCard();
  
  // Update current weather information
  locationElement.textContent = `${currentData.name}, ${currentData.sys.country}`;
  dateElement.textContent = formatDate(new Date());
  temperatureElement.textContent = `${Math.round(currentData.main.temp)}°C`;
  descriptionElement.textContent = currentData.weather[0].description;
  feelsLikeElement.textContent = `${Math.round(currentData.main.feels_like)}°C`;
  humidityElement.textContent = `${currentData.main.humidity}%`;
  windSpeedElement.textContent = `${currentData.wind.speed} m/s`;
  pressureElement.textContent = `${currentData.main.pressure} hPa`;
  
  // Update weather icon
  weatherIconContainer.innerHTML = getWeatherIcon(currentData.weather[0].id);
  
  // Display hourly forecast (next 24 hours)
  if (forecastData && forecastData.list && forecastData.list.length > 0) {
    displayHourlyForecast(forecastData.list.slice(0, 8)); // 8 items = 24 hours (3-hour intervals)
    
    // Display 5-day forecast
    displayDailyForecast(forecastData.list);
  } else {
    console.error('Invalid forecast data structure:', forecastData);
    hourlyForecastContainer.innerHTML = '<p class="error-hint">Hourly forecast data unavailable</p>';
    dailyForecastContainer.innerHTML = '<p class="error-hint">Daily forecast data unavailable</p>';
  }
}

function displayHourlyForecast(hourlyData) {
  hourlyForecastContainer.innerHTML = '';
  
  if (!hourlyData || hourlyData.length === 0) {
    hourlyForecastContainer.innerHTML = '<p class="error-hint">Hourly forecast data unavailable</p>';
    return;
  }
  
  hourlyData.forEach((item) => {
    const hour = new Date(item.dt * 1000);
    const temp = Math.round(item.main.temp);
    const iconId = item.weather[0].id;
    
    const hourlyItem = document.createElement('div');
    hourlyItem.className = 'hourly-item';
    
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
  dailyForecastContainer.innerHTML = '';
  
  if (!forecastList || forecastList.length === 0) {
    dailyForecastContainer.innerHTML = '<p class="error-hint">Daily forecast data unavailable</p>';
    return;
  }
  
  // Group forecast by day
  const dailyData = groupForecastByDay(forecastList);
  
  // Create forecast items for each day
  const dayKeys = Object.keys(dailyData);
  
  if (dayKeys.length === 0) {
    dailyForecastContainer.innerHTML = '<p class="error-hint">Daily forecast data unavailable</p>';
    return;
  }
  
  dayKeys.forEach((date, index) => {
    if (index === 0) return; // Skip today as we already show it in current weather
    if (index > 5) return; // Only show 5 days
    
    const dayData = dailyData[date];
    if (!dayData || dayData.length === 0) return;
    
    const dayTemp = Math.round(calculateAverageTemp(dayData));
    const dayDate = new Date(dayData[0].dt * 1000);
    const iconId = getMostFrequentWeatherId(dayData);
    
    const dailyItem = document.createElement('div');
    dailyItem.className = 'daily-item';
    
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
  
  // If no days were added (possibly because all were filtered out)
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
  
  const sum = dayData.reduce((acc, item) => {
    return acc + (item.main ? item.main.temp : 0);
  }, 0);
  
  return sum / dayData.length;
}

function getMostFrequentWeatherId(dayData) {
  if (!dayData || dayData.length === 0 || !dayData[0].weather || !dayData[0].weather[0]) {
    return 800; // Default to clear sky if no data
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
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

function formatDay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatHour(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true });
}

function getWeatherIcon(weatherId, size = 64) {
  let iconSvg = '';
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
  if (weatherId >= 200 && weatherId < 300) return "#90caf9"; // Thunderstorm
  if (weatherId >= 300 && weatherId < 500) return "#bbdefb"; // Drizzle
  if (weatherId >= 500 && weatherId < 600) return "#64b5f6"; // Rain
  if (weatherId >= 600 && weatherId < 700) return "#e3f2fd"; // Snow
  if (weatherId >= 700 && weatherId < 800) return "#b0bec5"; // Atmosphere
  if (weatherId === 800) return "#ffb74d"; // Clear
  return "#bdbdbd"; // Clouds
}

// UI State Functions
function showLoading() {
  loadingContainer.classList.remove('hidden');
  errorContainer.classList.add('hidden');
  initialState.classList.add('hidden');
  weatherCard.classList.add('hidden');
}

function hideLoading() {
  loadingContainer.classList.add('hidden');
}

function showError(message) {
  hideLoading();
  errorContainer.classList.remove('hidden');
  initialState.classList.remove('hidden');
  weatherCard.classList.add('hidden');
  errorMessage.textContent = message;
}

function hideError() {
  errorContainer.classList.add('hidden');
}

function hideInitialState() {
  initialState.classList.add('hidden');
}

function showWeatherCard() {
  weatherCard.classList.remove('hidden');
}

// Initialize with a default city if you want
// window.addEventListener('DOMContentLoaded', () => {
//   fetchWeatherData('London');
// });