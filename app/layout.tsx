import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "B2BUY · 사업자 맞춤 공동구매",
  description:
    "업태와 업종에 맞는 검증된 공급 기회를 연결하고, 공동 수요를 모아 더 나은 구매 조건을 만드는 사업자 전용 공동구매 플랫폼입니다."
};

export const viewport: Viewport = {
  themeColor: "#FF5A1F"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-b2buy-bg">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="mt-12 border-t border-b2buy-line bg-white py-8 text-center text-xs text-b2buy-muted">
          <p>© 2026 B2BUY</p>
        </footer>
      </body>
    </html>
  );
}
