/**
 * lib/auth.ts
 * ------------------------------------------------------------------
 * B2BUY 인증 헬퍼 (Supabase Auth + public.users 프로필)
 *  - signup(): 회원가입 (auth.users + public.users 트랜잭션)
 *  - login() / logout(): 표준 Supabase Auth
 *  - getCurrentUser(): 서버에서 현재 로그인한 사용자 + 프로필 조회
 *  - getCurrentUserOrNull(): 미로그인 시 null 반환
 * ------------------------------------------------------------------
 */
import { getServerSupabase, getAdminSupabase, type DealRow } from "./supabase";

export interface B2BUserProfile {
  id: string;
  user_id: string;
  manager_name: string;
  phone_number: string;
  email: string;
  department: string | null;
  position: string | null;
  company_reg_no: string;
  company_name: string;
  ceo_name: string;
  company_phone: string | null;
  company_address: string | null;
  zip_code: string | null;
  biz_type: string | null;
  biz_item: string | null;
  default_shipping_type: "사무실" | "창고" | "공장" | "기타";
  default_shipping_addr: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignupInput {
  email: string;
  password: string;
  user_id: string;           // 로그인 ID
  manager_name: string;
  phone_number: string;
  company_reg_no: string;
  company_name: string;
  ceo_name: string;
  department?: string;
  position?: string;
  company_phone?: string;
  company_address?: string;
  zip_code?: string;
  biz_type?: string;
  biz_item?: string;
}

// -----------------------------------------------------------------------------
// 1) 회원가입
//    - 서버에서 Service Role 로 RPC 호출 (auth.users에 직접 INSERT 가능)
//    - 클라이언트에서는 signInWithPassword로 바로 로그인 처리
// -----------------------------------------------------------------------------
export async function signup(input: SignupInput): Promise<{
  ok: boolean;
  userId?: string;
  loginId?: string;
  email?: string;
  error?: string;
}> {
  const admin = getAdminSupabase();
  const { data, error } = await admin.rpc("signup_b2buy_user", {
    p_email:          input.email,
    p_password:       input.password,
    p_user_id:        input.user_id,
    p_manager_name:   input.manager_name,
    p_phone_number:   input.phone_number,
    p_company_reg_no: input.company_reg_no,
    p_company_name:   input.company_name,
    p_ceo_name:       input.ceo_name,
    p_department:     input.department     ?? null,
    p_position:       input.position       ?? null,
    p_company_phone:  input.company_phone  ?? null,
    p_company_address: input.company_address ?? null,
    p_zip_code:       input.zip_code       ?? null,
    p_biz_type:       input.biz_type       ?? null,
    p_biz_item:       input.biz_item       ?? null
  });

  if (error) return { ok: false, error: error.message };
  const r = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    userId:  r?.user_id,
    loginId: r?.login_id,
    email:   r?.email
  };
}

// -----------------------------------------------------------------------------
// 2) 서버에서 현재 사용자 (profile 포함) 가져오기
// -----------------------------------------------------------------------------
export async function getCurrentUser(): Promise<B2BUserProfile | null> {
  return getCurrentUserOrNull();
}

export async function getCurrentUserOrNull(): Promise<B2BUserProfile | null> {
  const supabase = await getServerSupabase();
  const { data: sess } = await supabase.auth.getUser();
  if (!sess?.user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", sess.user.id)
    .single<B2BUserProfile>();

  if (error || !data) return null;
  return data;
}

// -----------------------------------------------------------------------------
// 3) 로그인 / 로그아웃 (브라우저 클라이언트)
//    - lib/supabase.ts 의 getBrowserSupabase() 재사용
// -----------------------------------------------------------------------------
import { getBrowserSupabase } from "./supabase";

export async function login(email: string, password: string) {
  const supabase = getBrowserSupabase();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function logout() {
  const supabase = getBrowserSupabase();
  return supabase.auth.signOut();
}

// =============================================================================
// (참고) DealRow는 lib/supabase.ts에서 re-export가 가능하지만, 현재 구조를
//  유지하기 위해 lib/supabase의 타입을 가져와 사용.
// =============================================================================
export type { DealRow };
