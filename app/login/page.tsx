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
  biz_type: string;
  biz_item: string;
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
  company_address: "",
  biz_type: "",
  biz_item: ""
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
      if (!res.ok || !json.ok) throw new Error(json.error || "로그인에 실패했습니다.");
      router.push("/deals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
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
          company_address: signupFields.company_address || undefined,
          biz_type: signupFields.biz_type,
          biz_item: signupFields.biz_item
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "회원가입에 실패했습니다.");

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupFields.email, password })
      });
      const loginJson = await loginRes.json();
      if (!loginRes.ok || !loginJson.ok) {
        throw new Error("가입은 완료되었지만 자동 로그인에 실패했습니다. 다시 로그인해 주세요.");
      }
      router.push("/deals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.");
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
            ? "B2BUY 사업자 회원 계정으로 로그인하세요."
            : "업태와 업종을 등록하면 관련 공동구매만 맞춤 제안합니다."}
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
            placeholder="owner@company.co.kr"
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
                  onChange={(value) => updateSignupField("manager_name", value)}
                  required
                />
                <Field
                  label="사업자등록번호"
                  value={signupFields.company_reg_no}
                  onChange={(value) => updateSignupField("company_reg_no", value)}
                  placeholder="123-45-67890"
                  required
                />
              </div>
              <Field
                label="회사명"
                value={signupFields.company_name}
                onChange={(value) => updateSignupField("company_name", value)}
                required
              />
              <Field
                label="대표자명"
                value={signupFields.ceo_name}
                onChange={(value) => updateSignupField("ceo_name", value)}
                required
              />
              <Field
                label="이메일"
                type="email"
                value={signupFields.email}
                onChange={(value) => updateSignupField("email", value)}
                placeholder="owner@company.co.kr"
                autoComplete="email"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="업태"
                  value={signupFields.biz_type}
                  onChange={(value) => updateSignupField("biz_type", value)}
                  placeholder="예: 제조업, 도소매업"
                  required
                />
                <Field
                  label="업종"
                  value={signupFields.biz_item}
                  onChange={(value) => updateSignupField("biz_item", value)}
                  placeholder="예: 화장품, 포장용기"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="부서"
                  value={signupFields.department}
                  onChange={(value) => updateSignupField("department", value)}
                />
                <Field
                  label="직책"
                  value={signupFields.position}
                  onChange={(value) => updateSignupField("position", value)}
                />
              </div>
              <Field
                label="회사 전화번호"
                value={signupFields.company_phone}
                onChange={(value) => updateSignupField("company_phone", value)}
              />
              <Field
                label="사업장 주소"
                value={signupFields.company_address}
                onChange={(value) => updateSignupField("company_address", value)}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-b2buy-primary py-3 text-sm font-extrabold text-white shadow hover:bg-b2buy-primaryDark disabled:opacity-60"
          >
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-b2buy-muted">
          <button
            type="button"
            className="font-bold text-b2buy-primary hover:underline"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "사업자 회원가입" : "로그인으로 돌아가기"}
          </button>
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
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-b2buy-ink">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl border border-b2buy-line bg-white px-3 py-2.5 text-sm outline-none focus:border-b2buy-primary"
      />
    </label>
  );
}
