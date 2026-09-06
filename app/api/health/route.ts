import { NextResponse } from "next/server";

export function GET() {
  const hasPublicSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
      && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
  return NextResponse.json({
    status: "ok",
    service: "travel-agent",
    database: hasPublicSupabaseConfig ? "configured" : "not_configured",
  });
}
