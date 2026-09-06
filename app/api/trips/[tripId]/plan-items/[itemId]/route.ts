import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { validatePlanItemInput } from "@/lib/plan/validation";

type RouteContext = { params: Promise<{ tripId: string; itemId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { tripId, itemId } = await context.params;
    const input = await request.json();
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return NextResponse.json({ error: "Войдите через Telegram, чтобы изменить вариант." }, { status: 401 });

    if (input.status) {
      if (!["wishlist", "approved", "booked", "recheck"].includes(input.status)) return NextResponse.json({ error: "Некорректный статус варианта." }, { status: 400 });
      const { data, error } = await supabase.from("plan_items").update({ status: input.status, needs_recheck: input.status === "recheck" }).eq("id", itemId).eq("trip_id", tripId).select().single();
      if (error) return NextResponse.json({ error: "Не удалось изменить статус варианта." }, { status: 500 });
      return NextResponse.json({ item: data });
    }

    const validation = validatePlanItemInput(input);
    if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });
    const { data, error } = await supabase.from("plan_items").update({
      category: validation.value.category,
      title: validation.value.title,
      subtitle: validation.value.subtitle,
      details: validation.value.details,
      source_name: validation.value.sourceName,
      source_url: validation.value.sourceUrl,
      price_amount: validation.value.priceAmount,
      currency: validation.value.currency,
      status: validation.value.status,
    }).eq("id", itemId).eq("trip_id", tripId).select().single();
    if (error) return NextResponse.json({ error: "Не удалось изменить вариант." }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("Plan item PATCH is not configured", error);
    return NextResponse.json({ error: "Сервер плана пока не настроен." }, { status: 503 });
  }
}
