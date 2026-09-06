import { NextResponse } from "next/server";
import type { TripTab } from "@/lib/types";
import { searchDemoProviders } from "@/lib/search/demo-providers";
import type { SearchParams } from "@/lib/search/types";

const categories: TripTab[] = ["transport", "stays", "events", "places", "next"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") as TripTab | null;
  const origin = url.searchParams.get("origin")?.trim() || "Москва";
  const destination = url.searchParams.get("destination")?.trim() || "Бангкок";
  const startDate = url.searchParams.get("startDate") || "2026-12-03";
  const endDate = url.searchParams.get("endDate") || "2026-12-15";
  const guests = Math.max(1, Number(url.searchParams.get("guests") || 1));

  if (!category || !categories.includes(category)) return NextResponse.json({ error: "Выберите категорию поиска." }, { status: 400 });
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) return NextResponse.json({ error: "Количество путешественников должно быть от 1 до 20." }, { status: 400 });

  const params: SearchParams = { category, origin, destination, startDate, endDate, guests };
  const results = await searchDemoProviders(params);
  return NextResponse.json({ results, meta: { providerMode: "demo", checkedAt: new Date().toISOString(), message: "Демонстрационные результаты. Перед бронированием цена проверяется у поставщика." } });
}
