/**
 * app/api/auth/signup/route.ts
 * ------------------------------------------------------------------
 *  POST { email, password, user_id, manager_name, phone_number,
 *         company_reg_no, company_name, ceo_name, ...옵션 }
 *  → 201 { ok:true, userId, loginId, email }
 *  → 400 { ok:false, error }
 *  → 409 { ok:false, error: "이미 가입된 이메일/아이디" }
 *
 *  - Service Role 로 public.signup_b2buy_user RPC 호출
 *  - 가입 성공 후 쿠키 세션 생성은 클라이언트(브라우저) signInWithPassword로
 *    이어서 처리 (브라우저에서 자동으로 쿠키 저장됨)
 * ------------------------------------------------------------------
 */
import { NextRequest, NextResponse } from "next/server";
import { signup, type SignupInput } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Partial<SignupInput>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 }); }

  // 1) 입력값 검증
  const required: (keyof SignupInput)[] = [
    "email", "password", "user_id", "manager_name", "phone_number",
    "company_reg_no", "company_name", "ceo_name"
  ];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim() === "") {
      return NextResponse.json({ ok: false, error: `${k} 은(는) 필수입니다.` }, { status: 400 });
    }
  }
  if (String(body.password).length < 8) {
    return NextResponse.json({ ok: false, error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.email))) {
    return NextResponse.json({ ok: false, error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!/^\d{3}-?\d{2}-?\d{5}$/.test(String(body.company_reg_no).replace(/\s/g, ""))) {
    return NextResponse.json({ ok: false, error: "사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)" }, { status: 400 });
  }

  // 2) 회원가입 RPC
  const result = await signup(body as SignupInput);
  if (!result.ok) {
    // unique 위반 등은 409
    const status = /duplicate|unique|already/i.test(result.error ?? "") ? 409 : 500;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({
    ok: true,
    userId:  result.userId,
    loginId: result.loginId,
    email:   result.email
  }, { status: 201 });
}
