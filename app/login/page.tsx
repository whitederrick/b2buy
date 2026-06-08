"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

interface SignupFields {
  manager_name: string;
  company_reg_no: string;
  company_name: string;
  ceo_name: string;
  email: string;
  department: string;
  position: string;
  company_phone: string;
  company_address: string;
}

const EMPTY_SIGNUP: SignupFields = {
  manager_name: "",
  company_reg_no: "",
  company_name: "",
  ceo_name: "",
  email: "",
  department: "",
  position: "",
  company_phone: "",
  company_address: ""
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [signupFields, setSignupFields] = useState<SignupFields>(EMPTY_SIGNUP);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userId, password })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "로그인에 실패했습니다.");
      }
      router.push("/mypage");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          password,
          email: signupFields.email,
          manager_name: signupFields.manager_name,
          phone_number: signupFields.company_phone || "010-0000-0000",
          company_reg_no: signupFields.company_reg_no,
          company_name: signupFields.company_name,
          ceo_name: signupFields.ceo_name,
          department: signupFields.department || undefined,
          position: signupFields.position || undefined,
          company_phone: signupFields.company_phone || undefined,
          company_address: signupFields.company_address || undefined
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "회원가입에 실패했습니다.");
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupFields.email, password })
      });
      const loginJson = await loginRes.json();
      if (!loginRes.ok || !loginJson.ok) {
        throw new Error("가입은 완료되었지만 자동 로그인에 실패했습니다. 다시 로그인해 주세요.");
      }
      router.push("/mypage");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function updateSignupField<K extends keyof SignupFields>(key: K, value: string) {
    setSignupFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-b2buy-line bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-extrabold text-b2buy-ink">
          {mode === "login" ? "로그인" : "사업자 회원가입"}
        </h1>
        <p className="mt-1 text-xs text-b2buy-muted">
          {mode === "login"
            ? "B2BUY 소상공인 회원으로 로그인하세요."
            : "사업자등록번호와 담당자 정보를 입력해 가입할 수 있습니다."}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="mt-5 space-y-3"
        >
          <Field
            label="아이디 또는 이메일"
            value={userId}
            onChange={setUserId}
            placeholder="b2buy_owner"
            autoComplete="username"
          />
          <Field
            label="비밀번호"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="8자 이상"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="담당자명"
                  value={signupFields.manager_name}
                  onChange={(v) => updateSignupField("manager_name", v)}
                  placeholder="홍길동"
                />
                <Field
                  label="사업자등록번호"
                  value={signupFields.company_reg_no}
                  onChange={(v) => updateSignupField("company_reg_no", v)}
                  placeholder="123-45-67890"
                />
              </div>
              <Field
                label="법인명"
                value={signupFields.company_name}
                onChange={(v) => updateSignupField("company_name", v)}
                placeholder="주식회사 뷰티랩"
              />
              <Field
                label="대표자명"
                value={signupFields.ceo_name}
                onChange={(v) => updateSignupField("ceo_name", v)}
                placeholder="홍길동"
              />
              <Field
                label="이메일"
                type="email"
                value={signupFields.email}
                onChange={(v) => updateSignupField("email", v)}
                placeholder="hello@beautylab.co.kr"
                autoComplete="email"
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="부서"
                  value={signupFields.department}
                  onChange={(v) => updateSignupField("department", v)}
                  placeholder="구매팀"
                />
                <Field
                  label="직책"
                  value={signupFields.position}
                  onChange={(v) => updateSignupField("position", v)}
                  placeholder="대표"
                />
              </div>
              <Field
                label="회사 대표전화"
                value={signupFields.company_phone}
                onChange={(v) => updateSignupField("company_phone", v)}
                placeholder="02-1234-5678"
              />
              <Field
                label="사업장 주소"
                value={signupFields.company_address}
                onChange={(v) => updateSignupField("company_address", v)}
                placeholder="서울특별시 강남구 테헤란로 123"
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-b2buy-primary py-3 text-sm font-extrabold text-white shadow hover:bg-b2buy-primaryDark disabled:opacity-60"
          >
            {loading
              ? "처리 중..."
              : mode === "login"
              ? "로그인"
              : "회원가입"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-b2buy-muted">
          {mode === "login" ? (
            <>
              아직 회원이 아니신가요?{" "}
              <button
                type="button"
                className="font-bold text-b2buy-primary hover:underline"
                onClick={() => { setMode("signup"); setError(null); }}
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 회원이신가요?{" "}
              <button
                type="button"
                className="font-bold text-b2buy-primary hover:underline"
                onClick={() => { setMode("login"); setError(null); }}
              >
                로그인으로
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-b2buy-muted">
        <Link href="/" className="hover:underline">
          메인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", autoComplete
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-b2buy-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl border border-b2buy-line bg-white px-3 py-2.5 text-sm outline-none focus:border-b2buy-primary"
      />
    </label>
  );
}
