export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-card border border-hairline bg-canvas p-10 text-center shadow-elevated">
        <h1 className="text-[22px] font-semibold text-ink">로그인</h1>
        <p className="mt-1.5 text-sm text-muted">
          GitHub 계정으로 로그인하고 할 일을 관리하세요.
        </p>
        <a
          href="/auth/github"
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-on-primary transition hover:bg-primary-active"
        >
          GitHub로 로그인
        </a>
      </div>
    </div>
  );
}
