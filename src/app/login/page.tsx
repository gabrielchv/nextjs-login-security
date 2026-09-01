import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { CSRF_COOKIE } from "@/lib/csrf";
import { MAX_ATTEMPTS } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/session";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");

  // Minted by src/proxy.ts before this render, so it is always present here.
  const csrfToken = (await cookies()).get(CSRF_COOKIE)?.value ?? "";

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <Link href="/" className="text-sm underline">
        ← Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Login (versão corrigida)</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Consulta parametrizada, hash scrypt, CSRF, CAPTCHA e bloqueio após{" "}
        {MAX_ATTEMPTS} tentativas.
      </p>

      <div className="mt-6 rounded-lg border border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <LoginForm csrfToken={csrfToken} />
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Teste com <code className="font-mono">alice / senha123</code>, ou tente o
        payload <code className="font-mono">&apos; OR &apos;1&apos;=&apos;1&apos; --</code> e
        compare com a{" "}
        <Link href="/login-injection" className="underline">
          rota vulnerável
        </Link>
        .
      </p>
    </main>
  );
}
