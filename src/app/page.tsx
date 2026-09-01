import Link from "next/link";
import { getSessionUser } from "@/lib/session";

const CARDS = [
  {
    href: "/login" as const,
    title: "/login — versão corrigida",
    tone: "border-emerald-300 dark:border-emerald-900",
    items: [
      "Query parametrizada (prepared statement)",
      "Senha guardada como hash scrypt com salt",
      "Token CSRF conferido a cada POST",
      "Bloqueio de 15 min após 5 tentativas erradas",
      "CAPTCHA de uso único gerado no servidor",
    ],
  },
  {
    href: "/login-injection" as const,
    title: "/login-injection — versão vulnerável",
    tone: "border-red-300 dark:border-red-900",
    items: [
      "Usuário e senha concatenados direto na string SQL",
      "Senha comparada contra coluna em texto puro",
      "Sem bloqueio por tentativas",
      "Sem CAPTCHA",
      "Mostra a query montada para você ver o ataque",
    ],
  },
];

export default async function Home() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Login Security Lab</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        Duas telas de login sobre o mesmo banco SQLite: uma escrita com as defesas
        aplicadas, outra vulnerável de propósito. Compare o resultado do mesmo
        payload nas duas.
      </p>

      {user && (
        <p className="mt-4 rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          Sessão ativa como <strong>{user.username}</strong>.{" "}
          <Link href="/dashboard" className="underline">
            Ir para a área logada
          </Link>
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`rounded-lg border-2 bg-white p-5 transition hover:shadow-md dark:bg-slate-900 ${card.tone}`}
          >
            <h2 className="font-semibold">{card.title}</h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {card.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded border border-slate-300 bg-white p-5 text-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold">Contas de teste</p>
        <p className="mt-2 font-mono text-xs">alice / senha123</p>
        <p className="font-mono text-xs">bob / hunter2</p>
      </div>
    </main>
  );
}
