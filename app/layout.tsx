import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "할일 + 계획 관리 앱",
  description: "일일 할 일, 주간 계획, 1년 목표를 연결하고 진행률을 자동 집계합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4 text-sm font-medium">
            <span className="text-base font-semibold">할일 + 계획</span>
            <Link href="/" className="text-zinc-600 hover:text-zinc-950">
              오늘
            </Link>
            <Link href="/weekly" className="text-zinc-600 hover:text-zinc-950">
              주간 계획
            </Link>
            <Link href="/goals" className="text-zinc-600 hover:text-zinc-950">
              1년 목표
            </Link>
            <UserMenu />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
