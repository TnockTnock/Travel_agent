import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { validateProfileInput } from "@/lib/profile/validation";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return NextResponse.json({ error: "Войдите, чтобы открыть профиль." }, { status: 401 });

    const { data, error } = await supabase.from("profiles").select("id, full_name, created_at, updated_at").eq("id", user.id).maybeSingle();
    if (error) {
      console.error("Failed to load profile", error);
      return NextResponse.json({ error: "Не удалось загрузить профиль." }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Profile GET is not configured", error);
    return NextResponse.json({ error: "Сервер профиля пока не настроен." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validation = validateProfileInput(body);
    if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase);
    if (!user) return NextResponse.json({ error: "Войдите, чтобы сохранить профиль." }, { status: 401 });

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: validation.value.fullName }, { onConflict: "id" })
      .select("id, full_name, created_at, updated_at")
      .single();

    if (error) {
      console.error("Failed to save profile", error);
      return NextResponse.json({ error: "Не удалось сохранить профиль." }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Profile PUT is not configured", error);
    return NextResponse.json({ error: "Сервер профиля пока не настроен." }, { status: 503 });
  }
}
