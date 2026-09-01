import { cookies } from "next/headers";
import Link from "next/link";
import { InjectionLoginForm } from "@/components/InjectionLoginForm";
import { CSRF_COOKIE } from "@/lib/csrf";

export default async function LoginInjectionPage() {
  const csrfToken = (await cookies()).get(CSRF_COOKIE)?.value ?? "";

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <Link href="/" className="text-sm underline">
        ← Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Login (versão vulnerável)</h1>

      <div className="mt-4 rounded border-2 border-red-400 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        <p className="font-semibold">Vulnerável de propósito</p>
        <p className="mt-1">
          Esta rota monta a query concatenando o que você digita e compara a senha
          contra uma coluna em texto puro. Existe só para demonstração — nunca use
          este código em produção.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <InjectionLoginForm csrfToken={csrfToken} />
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Rode o mesmo payload na{" "}
        <Link href="/login" className="underline">
          rota corrigida
        </Link>{" "}
        para ver a diferença.
      </p>
    </main>
  );
}
