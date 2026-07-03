// Integração de clima via Open-Meteo (gratuita, sem API key) + expo-location.

import * as Location from 'expo-location';

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  description: string;
  isRain: boolean;
  precipitationProb: number; // 0-100
}

export interface Weather {
  tempC: number;
  feelsLikeC: number;
  precipitationProb: number; // 0-100
  isRain: boolean;
  windKmh: number;
  description: string;
  place?: string;
  forecast?: DailyForecast[]; // próximos ~7 dias
}

// Mapeia o weather_code do Open-Meteo para uma descrição curta em PT-BR.
function describeCode(code: number): { text: string; rain: boolean } {
  if ([0].includes(code)) return { text: 'Céu limpo', rain: false };
  if ([1, 2].includes(code)) return { text: 'Parcialmente nublado', rain: false };
  if ([3].includes(code)) return { text: 'Nublado', rain: false };
  if ([45, 48].includes(code)) return { text: 'Neblina', rain: false };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: 'Garoa', rain: true };
  if ([61, 63, 65, 66, 67].includes(code)) return { text: 'Chuva', rain: true };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: 'Neve', rain: true };
  if ([80, 81, 82].includes(code)) return { text: 'Pancadas de chuva', rain: true };
  if ([95, 96, 99].includes(code)) return { text: 'Tempestade', rain: true };
  return { text: 'Tempo instável', rain: false };
}

export async function getWeather(): Promise<Weather> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permissão de localização negada');
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low,
  });
  const { latitude, longitude } = pos.coords;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
    `&hourly=precipitation_probability` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
    `&forecast_days=7&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao consultar o clima');
  const data = await res.json();

  const cur = data.current ?? {};
  const code = cur.weather_code ?? 0;
  const desc = describeCode(code);

  // probabilidade de chuva ~ próxima hora disponível
  let precipitationProb = 0;
  const probs: number[] = data.hourly?.precipitation_probability ?? [];
  if (probs.length) {
    precipitationProb = Math.max(...probs.slice(0, 6));
  }

  // previsão diária (próximos ~7 dias)
  const daily = data.daily ?? {};
  const times: string[] = daily.time ?? [];
  const forecast: DailyForecast[] = times.map((date, i) => {
    const dc = daily.weather_code?.[i] ?? 0;
    const dd = describeCode(dc);
    const prob = daily.precipitation_probability_max?.[i] ?? 0;
    return {
      date,
      tempMax: Math.round(daily.temperature_2m_max?.[i] ?? 0),
      tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 0),
      description: dd.text,
      isRain: dd.rain || prob >= 60,
      precipitationProb: prob,
    };
  });

  // tentativa best-effort de nome do local (não bloqueia se falhar)
  let place: string | undefined;
  try {
    const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geo[0]) place = geo[0].city ?? geo[0].region ?? undefined;
  } catch {
    // ignora
  }

  return {
    tempC: Math.round(cur.temperature_2m ?? 0),
    feelsLikeC: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
    precipitationProb,
    isRain: desc.rain || (cur.precipitation ?? 0) > 0.1 || precipitationProb >= 60,
    windKmh: Math.round(cur.wind_speed_10m ?? 0),
    description: desc.text,
    place,
    forecast,
  };
}

// Clima de fallback quando não há permissão/conexão — permite usar o app mesmo assim.
export function fallbackWeather(tempC = 22): Weather {
  return {
    tempC,
    feelsLikeC: tempC,
    precipitationProb: 0,
    isRain: false,
    windKmh: 8,
    description: 'Clima estimado',
  };
}
