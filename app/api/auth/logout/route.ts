/**
 * app/api/auth/logout/route.ts
 * ------------------------------------------------------------------
 *  POST → { ok:true }
 *  - 서버에서 세션 쿠키 제거
 * ------------------------------------------------------------------
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
