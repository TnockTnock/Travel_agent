import type { SearchParams, SearchResult } from "@/lib/search/types";

const result = (params: SearchParams, values: Omit<SearchResult, "category" | "updatedAt" | "isDemo">): SearchResult => ({
  ...values,
  category: params.category,
  updatedAt: new Date().toISOString(),
  isDemo: true,
  availabilityStatus: "unknown",
});

export async function searchDemoProviders(params: SearchParams): Promise<SearchResult[]> {
  if (params.category === "transport") {
    return [
      result(params, { id: "demo-flight-qatar", title: `${params.origin} → ${params.destination}`, subtitle: "Qatar Airways · 1 пересадка", details: "14 ч 40 мин · багаж включён", source: "Демо Amadeus", price: 58400, currency: "RUB", icon: "✈", tint: "blue" }),
      result(params, { id: "demo-flight-emirates", title: `${params.origin} → ${params.destination}`, subtitle: "Emirates · 1 пересадка", details: "16 ч 05 мин · багаж включён", source: "Демо Amadeus", price: 63100, currency: "RUB", icon: "✈", tint: "blue" }),
    ];
  }
  if (params.category === "stays") {
    return [
      result(params, { id: "demo-stay-casa", title: "Casa Nithra Bangkok", subtitle: `${params.destination} · 4 ночи`, details: "4.7 ★ · 1.8 км до центра", source: "Демо поставщика жилья", price: 28600, currency: "RUB", icon: "⌂", tint: "violet" }),
      result(params, { id: "demo-stay-riva", title: "Riva Surya Bangkok", subtitle: `${params.destination} · 4 ночи`, details: "4.6 ★ · у реки Чао Прайя", source: "Демо поставщика жилья", price: 39700, currency: "RUB", icon: "⌂", tint: "violet" }),
    ];
  }
  if (params.category === "events") {
    return [
      result(params, { id: "demo-event-tomorrowland", title: "Tomorrowland Thailand", subtitle: "Пятница, 8 декабря", details: "Музыкальный фестиваль · 12 км", source: "Официальный сайт", price: 19500, currency: "RUB", icon: "✦", tint: "orange" }),
      result(params, { id: "demo-event-food", title: "Bangkok Night Food Tour", subtitle: "Каждый вечер · с гидом", details: "Гастрономия · 3 часа", source: "Демо activities", price: 6400, currency: "RUB", icon: "✦", tint: "orange" }),
    ];
  }
  if (params.category === "places") {
    return [
      result(params, { id: "demo-place-palace", title: "The Grand Palace", subtitle: "Достопримечательность", details: "4.6 ★ · открыт до 16:30", source: "Демо карты", price: 0, currency: "RUB", icon: "⌖", tint: "green" }),
      result(params, { id: "demo-place-wat", title: "Wat Arun", subtitle: "Храм на реке", details: "4.7 ★ · лучше утром", source: "Демо карты", price: 1200, currency: "RUB", icon: "⌖", tint: "green" }),
    ];
  }
  return [];
}
