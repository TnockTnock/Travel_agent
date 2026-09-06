import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { validateTripInput } from "@/lib/trips/validation";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return NextResponse.json({ error: "Войдите через Telegram, чтобы увидеть поездки." }, { status: 401 });

    const { data, error } = await supabase
      .from("trip_members")
      .select("role, participation_start, participation_end, trips(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Failed to load trips", error);
      return NextResponse.json({ error: "Не удалось загрузить поездки. Попробуйте обновить страницу." }, { status: 500 });
    }

    return NextResponse.json({ trips: data ?? [] });
  } catch (error) {
    console.error("Trips GET is not configured", error);
    return NextResponse.json({ error: "Сервер поездок пока не настроен." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateTripInput(body);
    if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return NextResponse.json({ error: "Войдите через Telegram, чтобы создать поездку." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    if (!profile?.full_name) {
      return NextResponse.json({ error: "Сначала заполните ФИО в профиле." }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("trips")
      .insert({
        owner_id: user.id,
        title: validation.value.title,
        origin: validation.value.origin,
        destination_country: validation.value.destinationCountry,
        destination: validation.value.destination,
        start_date: validation.value.startDate,
        end_date: validation.value.endDate,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create trip", error);
      return NextResponse.json({ error: "Не удалось создать поездку. Проверьте профиль и попробуйте снова." }, { status: 500 });
    }

    return NextResponse.json({ trip: data }, { status: 201 });
  } catch (error) {
    console.error("Trips POST is not configured", error);
    return NextResponse.json({ error: "Сервер поездок пока не настроен." }, { status: 503 });
  }
}
