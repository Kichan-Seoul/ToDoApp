"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";

type Me = { username: string; avatarUrl: string };

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  });

export function UserMenu() {
  const router = useRouter();
  const { data: me } = useSWR<Me>("/api/auth/me", fetcher, { shouldRetryOnError: false });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!me) return null;

  return (
    <div className="ml-auto flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={me.avatarUrl} alt={me.username} className="h-8 w-8 rounded-full" />
      <span className="text-sm font-medium text-ink">{me.username}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-hairline px-3 py-1.5 text-sm font-medium text-ink transition hover:border-border-strong hover:bg-surface-soft"
      >
        로그아웃
      </button>
    </div>
  );
}
