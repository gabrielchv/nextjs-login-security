"use client";

import Link from "next/link";
import { useState } from "react";

type InjectionResponse = {
  ok?: boolean;
  error?: string;
  username?: string;
  sql?: string;
};

const PAYLOADS = [
  { label: "Bypass total", username: "' OR '1'='1' --", password: "qualquer" },
  { label: "Entrar como alice", username: "alice' --", password: "qualquer" },
  { label: "Quebrar a query", username: "'", password: "qualquer" },
];

export function InjectionLoginForm({ csrfToken }: { csrfToken: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<InjectionResponse | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const response = await fetch("/api/login-injection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, csrfToken }),
    });
    const data: InjectionResponse = await response.json().catch(() => ({}));

    setPending(false);
    setResult(data);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="csrfToken" value={csrfToken} />

        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium">
            Usuário
          </label>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
            required
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-300"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            required
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-300"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {pending ? "Executando…" : "Entrar (rota vulnerável)"}
        </button>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium">Payloads prontos</p>
        <div className="flex flex-wrap gap-2">
          {PAYLOADS.map((payload) => (
            <button
              key={payload.label}
              type="button"
              onClick={() => {
                setUsername(payload.username);
                setPassword(payload.password);
                setResult(null);
              }}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {payload.label}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          {result.ok ? (
            <div className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              <p>
                Autenticado como <strong>{result.username}</strong> — sem saber a senha.
              </p>
              <Link href="/dashboard" className="mt-1 inline-block underline">
                Abrir a área logada
              </Link>
            </div>
          ) : (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {result.error}
            </div>
          )}

          {result.sql && (
            <div>
              <p className="mb-1 text-sm font-medium">SQL que chegou ao banco</p>
              <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                <code>{result.sql}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
