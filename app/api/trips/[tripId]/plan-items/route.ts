import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { validatePlanItemInput } from "@/lib/plan/validation";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return NextResponse.json({ error: "Войдите через Telegram, чтобы увидеть план поездки." }, { status: 401 });

    const { data, error } = await supabase.from("plan_items").select("*").eq("trip_id", tripId).order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load plan items", error);
      return NextResponse.json({ error: "Не удалось загрузить план поездки." }, { status: 500 });
    }
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error("Plan items GET is not configured", error);
    return NextResponse.json({ error: "Сервер плана пока не настроен." }, { status: 503 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params;
    const validation = validatePlanItemInput(await request.json());
    if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return NextResponse.json({ error: "Войдите через Telegram, чтобы добавить вариант." }, { status: 401 });

    const { data, error } = await supabase.from("plan_items").insert({
      trip_id: tripId,
      created_by: user.id,
      category: validation.value.category,
      title: validation.value.title,
      subtitle: validation.value.subtitle,
      details: validation.value.details,
      source_name: validation.value.sourceName,
      source_url: validation.value.sourceUrl,
      price_amount: validation.value.priceAmount,
      currency: validation.value.currency,
      status: validation.value.status,
    }).select().single();

    if (error) {
      console.error("Failed to create plan item", error);
      return NextResponse.json({ error: "Не удалось добавить вариант в план." }, { status: 500 });
    }
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error("Plan items POST is not configured", error);
    return NextResponse.json({ error: "Сервер плана пока не настроен." }, { status: 503 });
  }
}
