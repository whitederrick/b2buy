import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "B2BUY · 소상공인 중국 직소싱 펀딩형 공동구매",
  description:
    "뷰티·생활용품 부자재(공용기·펌프 등) 1688 공장 직소싱 펀딩형 공동구매 플랫폼. 모이면 모일수록 단가가 내려갑니다.",
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
          <p>© 2026 B2BUY (비투바이) · 소상공인을 위한 중국 직소싱 펀딩형 공동구매</p>
          <p className="mt-1">하나은행 가상계좌 에스크로 보호 · 안전 결제</p>
        </footer>
      </body>
    </html>
  );
}
