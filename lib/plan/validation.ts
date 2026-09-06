import type { PlanStatus, TripTab } from "@/lib/types";

const categories: TripTab[] = ["transport", "stays", "events", "places", "next"];
const statuses: PlanStatus[] = ["wishlist", "approved", "booked", "recheck"];

export type PlanItemInput = {
  category: TripTab;
  title: string;
  subtitle?: string;
  details?: string;
  sourceName?: string;
  sourceUrl?: string;
  priceAmount?: number | null;
  currency?: string;
  status?: PlanStatus;
};

export function validatePlanItemInput(input: Partial<PlanItemInput>) {
  if (!categories.includes(input.category as TripTab)) return { ok: false as const, message: "Выберите корректную категорию." };
  if (typeof input.title !== "string" || input.title.trim().length < 2) return { ok: false as const, message: "Укажите название варианта." };
  if (input.priceAmount !== undefined && input.priceAmount !== null && (!Number.isFinite(input.priceAmount) || input.priceAmount < 0)) {
    return { ok: false as const, message: "Цена должна быть неотрицательным числом." };
  }
  if (input.status && !statuses.includes(input.status)) return { ok: false as const, message: "Выберите корректный статус." };

  return {
    ok: true as const,
    value: {
      category: input.category as TripTab,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      details: input.details?.trim() || null,
      sourceName: input.sourceName?.trim() || null,
      sourceUrl: input.sourceUrl?.trim() || null,
      priceAmount: input.priceAmount ?? null,
      currency: (input.currency || "RUB").trim().toUpperCase(),
      status: input.status || "wishlist",
    },
  };
}
