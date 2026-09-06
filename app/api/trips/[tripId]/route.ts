import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { validateTripInput } from "@/lib/trips/validation";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params;
    const body = await request.json();
    const validation = validateTripInput(body);
    if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return NextResponse.json({ error: "Войдите через Telegram, чтобы изменить поездку." }, { status: 401 });

    const { data: previous, error: previousError } = await supabase
      .from("trips")
      .select("origin, destination_country, destination, start_date, end_date")
      .eq("id", tripId)
      .single();
    if (previousError || !previous) return NextResponse.json({ error: "Поездка не найдена." }, { status: 404 });

    const routeChanged = previous.origin !== validation.value.origin
      || previous.destination_country !== validation.value.destinationCountry
      || previous.destination !== validation.value.destination
      || previous.start_date !== validation.value.startDate
      || previous.end_date !== validation.value.endDate;

    const { data, error } = await supabase
      .from("trips")
      .update({
        title: validation.value.title,
        origin: validation.value.origin,
        destination_country: validation.value.destinationCountry,
        destination: validation.value.destination,
        start_date: validation.value.startDate,
        end_date: validation.value.endDate,
      })
      .eq("id", tripId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update trip", error);
      return NextResponse.json({ error: "Не удалось изменить поездку." }, { status: 500 });
    }

    if (routeChanged) {
      const { error: markError } = await supabase
        .from("plan_items")
        .update({ needs_recheck: true, status: "recheck" })
        .eq("trip_id", tripId);
      if (markError) console.error("Failed to mark plan items for recheck", markError);
    }

    return NextResponse.json({ trip: data, planNeedsRecheck: routeChanged });
  } catch (error) {
    console.error("Trip PATCH is not configured", error);
    return NextResponse.json({ error: "Сервер поездок пока не настроен." }, { status: 503 });
  }
}
