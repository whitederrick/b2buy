/**
 * app/api/auth/me/route.ts
 * ------------------------------------------------------------------
 *  GET → { ok, user: B2BUserProfile | null }
 *  - 클라이언트에서 현재 로그인한 사용자와 public.users 프로필을 함께 반환
 *  - RSC에서도 사용 가능 (쿠키 기반)
 * ------------------------------------------------------------------
 */
import { NextResponse } from "next/server";
import { getCurrentUserOrNull } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUserOrNull();
  return NextResponse.json({ ok: true, user });
}
