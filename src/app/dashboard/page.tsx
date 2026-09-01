import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { CSRF_COOKIE } from "@/lib/csrf";
import { getSessionUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const csrfToken = (await cookies()).get(CSRF_COOKIE)?.value ?? "";

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold">Área logada</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Sessão ativa como <strong>{user.username}</strong> (id {user.id}).
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        O identificador da sessão fica em um cookie httpOnly; a página resolve esse
        identificador na tabela <code className="font-mono">sessions</code> a cada
        requisição.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <LogoutButton csrfToken={csrfToken} />
        <Link href="/" className="text-sm underline">
          Início
        </Link>
      </div>
    </main>
  );
}
