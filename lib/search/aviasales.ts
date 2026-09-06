import type { SearchParams, SearchResult } from "@/lib/search/types";

const cityCodes: Record<string, string> = {
  "москва": "MOW",
  "москве": "MOW",
  "санкт-петербург": "LED",
  "петербург": "LED",
  "бангкок": "BKK",
  "стамбул": "IST",
  "дубай": "DXB",
  "париж": "PAR",
  "лондон": "LON",
};

function iata(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length === 3 ? normalized.toUpperCase() : cityCodes[normalized];
}

type AviasalesResponse = {
  success: boolean;
  currency?: string;
  error?: string;
  data?: Array<{ origin: string; destination: string; origin_airport?: string; destination_airport?: string; price: number; airline: string; flight_number?: string; departure_at: string; return_at?: string; transfers?: number; duration?: number; link?: string }>;
};

export function aviasalesConfigured() {
  return Boolean(process.env.TRAVELPAYOUTS_API_TOKEN);
}

export async function searchAviasales(params: SearchParams): Promise<SearchResult[]> {
  const token = process.env.TRAVELPAYOUTS_API_TOKEN;
  if (!token) throw new Error("TRAVELPAYOUTS_API_TOKEN is not configured.");
  const origin = iata(params.origin);
  const destination = iata(params.destination);
  if (!origin || !destination) throw new Error("Для поиска билетов укажите город или IATA-код аэропорта.");

  const query = new URLSearchParams({ origin, destination, departure_at: params.startDate, return_at: params.endDate, one_way: "false", sorting: "price", direct: "false", currency: "RUB", market: "ru", limit: "30", page: "1", token });
  const response = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${query}`, { headers: { "Accept-Encoding": "gzip, deflate" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Aviasales returned HTTP ${response.status}.`);
  const payload = await response.json() as AviasalesResponse;
  if (!payload.success) throw new Error(payload.error || "Aviasales search failed.");

  return (payload.data ?? []).map((item, index) => ({
    id: `aviasales-${origin}-${destination}-${index}`,
    category: "transport" as const,
    title: `${params.origin} → ${params.destination}`,
    subtitle: `${item.airline}${item.flight_number ? ` · ${item.flight_number}` : ""} · ${item.transfers ?? 0} пересадок`,
    details: `${item.duration ? `${Math.floor(item.duration / 60)} ч ${item.duration % 60} мин` : "Время уточняется"} · цена из кэша Aviasales`,
    source: "Aviasales / Travelpayouts",
    sourceUrl: item.link ? `https://www.aviasales.com${item.link}` : undefined,
    provider: "aviasales",
    availabilityStatus: "cached" as const,
    price: item.price,
    currency: payload.currency || "RUB",
    icon: "✈",
    tint: "blue",
    updatedAt: new Date().toISOString(),
    isDemo: false,
  }));
}
