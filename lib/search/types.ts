import type { TripTab } from "@/lib/types";

export type SearchParams = {
  category: TripTab;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  guests: number;
};

export type SearchResult = {
  id: string;
  category: TripTab;
  title: string;
  subtitle: string;
  details: string;
  source: string;
  sourceUrl?: string;
  price: number;
  currency: string;
  icon: string;
  tint: string;
  updatedAt: string;
  isDemo: boolean;
};
