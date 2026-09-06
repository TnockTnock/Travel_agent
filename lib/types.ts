export type PlanStatus = "wishlist" | "approved" | "booked" | "recheck";
export type TripTab = "transport" | "stays" | "events" | "places" | "next";

export type TripItem = {
  id: string;
  category: TripTab;
  title: string;
  subtitle: string;
  details: string;
  source: string;
  sourceUrl?: string;
  price: number;
  status: PlanStatus;
  icon: string;
  tint: string;
};

export type Trip = {
  id: string;
  title: string;
  origin: string;
  destination: string;
  dates: string;
  members: number;
  cover: string;
};
