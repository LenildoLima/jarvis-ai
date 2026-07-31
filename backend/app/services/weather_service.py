import httpx

_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


async def get_weather(location: str) -> str:
    """
    Busca o clima atual real para uma localização usando a Open-Meteo
    (API gratuita, sem necessidade de chave, com dados estruturados e
    atualizados — diferente de busca de texto, que pode trazer páginas
    em cache e desatualizadas para dados que mudam a cada hora).
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            geo_response = await client.get(
                _GEOCODE_URL,
                params={"name": location, "count": 1, "language": "pt"},
            )
            geo_data = geo_response.json()
            results = geo_data.get("results")
            if not results:
                return f"Não encontrei a localização '{location}' para checar o clima."

            place = results[0]
            lat, lon = place["latitude"], place["longitude"]
            place_name = place.get("name", location)

            forecast_response = await client.get(
                _FORECAST_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                    "daily": "temperature_2m_max,temperature_2m_min",
                    "timezone": "auto",
                },
            )
            data = forecast_response.json()
            current = data.get("current", {})
            daily = data.get("daily", {})

            temp = current.get("temperature_2m")
            humidity = current.get("relative_humidity_2m")
            wind = current.get("wind_speed_10m")
            high = daily.get("temperature_2m_max", [None])[0]
            low = daily.get("temperature_2m_min", [None])[0]

            return (
                f"Clima atual em {place_name}: {temp}°C, "
                f"umidade {humidity}%, vento {wind} km/h. "
                f"Previsão para hoje: máxima de {high}°C e mínima de {low}°C."
            )
        except Exception as exc:
            return f"Erro ao buscar o clima: {exc}"
