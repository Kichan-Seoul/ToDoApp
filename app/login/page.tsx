export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-10 text-center">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">로그인</h1>
        <p className="mt-1 text-sm text-zinc-500">
          GitHub 계정으로 로그인하고 할 일을 관리하세요.
        </p>
      </div>
      <a
        href="/auth/github"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
      >
        GitHub로 로그인
      </a>
    </div>
  );
}
