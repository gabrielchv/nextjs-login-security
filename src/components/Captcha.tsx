"use client";

import { useState } from "react";

/**
 * Renders the server-generated SVG challenge.
 *
 * The image URL carries a nonce so a reload always reaches the route handler —
 * and therefore mints a fresh signed cookie — instead of hitting the cache.
 * `refreshToken` lets the parent force a new challenge after a failed attempt,
 * since the server consumes the cookie on every try.
 */
export function Captcha({
  value,
  onChange,
  refreshToken = 0,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  refreshToken?: number;
  disabled?: boolean;
}) {
  const [manualRefresh, setManualRefresh] = useState(0);

  // Deterministic on server and client, so no hydration mismatch. The route
  // answers with `Cache-Control: no-store`, so a changed value always refetches.
  const nonce = `${refreshToken}-${manualRefresh}`;

  return (
    <div className="space-y-2">
      <label htmlFor="captcha" className="block text-sm font-medium">
        Digite o código da imagem
      </label>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/captcha?n=${nonce}`}
          alt="Imagem do CAPTCHA"
          width={180}
          height={60}
          className="rounded border border-slate-300 dark:border-slate-700"
        />
        <button
          type="button"
          onClick={() => setManualRefresh((value) => value + 1)}
          className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Trocar imagem
        </button>
      </div>
      <input
        id="captcha"
        name="captcha"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoComplete="off"
        maxLength={5}
        required
        className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono uppercase tracking-widest outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-300"
      />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        O código expira em 2 minutos e vale para uma única tentativa.
      </p>
    </div>
  );
}
