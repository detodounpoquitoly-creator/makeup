"use client";

import { useState } from "react";

/** Acceso al panel: contraseña de la variable ADMIN_PASSWORD. */
export default function LoginAdmin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        window.location.reload();
        return;
      }
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Contraseña incorrecta.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <p className="text-sm tracking-widest text-muted uppercase">¡Hola!</p>
      <h1 className="serif text-2xl">MakeUp Sofy</h1>
      <p className="mt-1 text-sm text-muted">Completá tu contraseña para entrar.</p>
      <form onSubmit={enviar} className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs tracking-widest text-muted uppercase">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-linea bg-panel px-4 py-2.5 outline-none focus:border-acento"
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={enviando || !password}
          className="mt-4 w-full rounded-full bg-acento py-2.5 text-sm tracking-widest text-acento-fg uppercase hover:bg-acento-suave disabled:opacity-40"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
