import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { NavTabs } from "@/components/NavTabs";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "할일 + 계획 관리 앱",
  description: "일일 할 일, 주간 계획, 1년 목표를 연결하고 진행률을 자동 집계합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <header className="border-b border-hairline bg-canvas">
          <nav className="mx-auto flex max-w-5xl items-center gap-8 px-6">
            <Link href="/" className="flex h-20 items-center text-lg font-bold text-ink">
              할일 + 계획
            </Link>
            <NavTabs />
            <UserMenu />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
