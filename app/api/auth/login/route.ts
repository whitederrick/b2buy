/**
 * app/api/auth/login/route.ts
 * ------------------------------------------------------------------
 *  POST { email, password }
 *  → 200 { ok:true, user: { id, email } }
 *  → 401 { ok:false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }
 *
 *  - 서버 클라이언트(쿠키 공유)로 signInWithPassword 호출
 *  - 성공 시 세션 쿠키가 response의 Set-Cookie 헤더에 담김
 * ------------------------------------------------------------------
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 }); }

  if (!body.email || !body.password) {
    return NextResponse.json({ ok: false, error: "이메일/비밀번호를 입력하세요." }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password
  });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email }
  });
}
