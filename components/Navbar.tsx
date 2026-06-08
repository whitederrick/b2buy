"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [bellOn, setBellOn] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-b2buy-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-b2buy-primary text-base font-extrabold text-white shadow">
            B
          </span>
          <span className="text-lg font-extrabold tracking-tight text-b2buy-ink">
            B2<span className="text-b2buy-primary">BUY</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/deals">공동구매</NavLink>
          <NavLink href="/deals?status=모집중">모집중</NavLink>
          <NavLink href="/deals?status=공구성공">완료된 공구</NavLink>
          <NavLink href="/mypage">마이페이지</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/deals"
            className="hidden rounded-lg bg-b2buy-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-b2buy-primaryDark sm:inline-block"
          >
            + 공동구매 신청하기
          </Link>
          <button
            onClick={() => setBellOn((v) => !v)}
            aria-label="알림"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-b2buy-ink hover:bg-b2buy-bg"
          >
            <span className="text-lg">🔔</span>
            {bellOn && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-b2buy-line bg-white px-3 py-1.5 text-xs font-bold text-b2buy-ink hover:bg-b2buy-bg"
          >
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-b2buy-ink hover:bg-b2buy-bg"
    >
      {children}
    </Link>
  );
}
