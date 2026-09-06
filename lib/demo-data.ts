import type { Trip, TripItem } from "./types";

export const trips: Trip[] = [
  { id: "thailand", title: "Таиланд · Tomorrowland", origin: "Москва", destination: "Бангкок", dates: "3–15 декабря 2026", members: 4, cover: "🌴" },
  { id: "istanbul", title: "Стамбул на выходные", origin: "Москва", destination: "Стамбул", dates: "18–21 сентября 2026", members: 2, cover: "🕌" },
];

export const tripItems: TripItem[] = [
  { id: "flight", category: "transport", title: "Москва → Бангкок", subtitle: "Qatar Airways · 1 пересадка", details: "14 ч 40 мин · багаж включён", source: "Демо Amadeus", price: 58400, status: "approved", icon: "✈", tint: "blue" },
  { id: "stay", category: "stays", title: "Casa Nithra Bangkok", subtitle: "Бангкок · 4 ночи", details: "4.7 ★ · 1.8 км до центра", source: "Демо поставщика", price: 28600, status: "wishlist", icon: "⌂", tint: "violet" },
  { id: "event", category: "events", title: "Tomorrowland Thailand", subtitle: "Пятница, 8 декабря", details: "Музыкальный фестиваль · 12 км", source: "Официальный сайт", price: 19500, status: "approved", icon: "✦", tint: "orange" },
  { id: "place", category: "places", title: "The Grand Palace", subtitle: "Достопримечательность", details: "4.6 ★ · открыт до 16:30", source: "Демо карты", price: 0, status: "wishlist", icon: "⌖", tint: "green" },
];
