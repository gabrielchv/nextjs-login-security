"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Captcha } from "./Captcha";

type LoginResponse = {
  ok?: boolean;
  error?: string;
  attemptsLeft?: number;
  locked?: boolean;
};

export function LoginForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, captcha, csrfToken }),
    });
    const data: LoginResponse = await response.json().catch(() => ({}));

    setPending(false);

    if (response.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setError(data.error ?? "Falha no login.");
    setAttemptsLeft(typeof data.attemptsLeft === "number" ? data.attemptsLeft : null);

    // The server consumed the challenge, so a new image is always required.
    setCaptcha("");
    setCaptchaRefresh((value) => value + 1);
  }

  return (
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
          autoComplete="username"
          required
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-300"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-300"
        />
      </div>

      <Captcha
        value={captcha}
        onChange={setCaptcha}
        refreshToken={captchaRefresh}
        disabled={pending}
      />

      {error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <p>{error}</p>
          {attemptsLeft !== null && attemptsLeft > 0 && (
            <p className="mt-1 text-xs">
              Tentativas restantes antes do bloqueio: <strong>{attemptsLeft}</strong>
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        {pending ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
