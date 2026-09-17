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
    <div className="ml-auto flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={me.avatarUrl} alt={me.username} className="h-7 w-7 rounded-full" />
      <span className="text-zinc-700">{me.username}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
      >
        로그아웃
      </button>
    </div>
  );
}
