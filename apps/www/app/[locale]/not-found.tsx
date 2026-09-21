import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다.</h1>
        <p className="text-muted-foreground">
          주소를 확인하거나 대시보드로 이동해 주세요.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-primary px-4 py-2 text-primary-foreground"
        >
          대시보드로 이동
        </Link>
      </div>
    </main>
  );
}
