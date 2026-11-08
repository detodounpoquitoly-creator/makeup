"use client";

import { useState } from "react";

/** Cancelación autogestionada de la clienta con su código. */
export default function CancelarReserva({ idTurno }: { idTurno: number }) {
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cancelar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const r = await fetch("/api/turnos/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idTurno, codigo }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.ok) {
        window.location.reload();
        return;
      }
      setError(j.error ?? "No pudimos cancelar la reserva.");
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto) {
    return (
      <button type="button" className="link-danger" onClick={() => setAbierto(true)}>
        ✕ CANCELAR RESERVA
      </button>
    );
  }

  return (
    <form onSubmit={cancelar} className="w-full" style={{ marginTop: "0.75rem" }}>
      <label className="lbl" htmlFor="cn-codigo">CONFIRMÁ CON TU CÓDIGO (SM-1024)</label>
      <input
        id="cn-codigo"
        className="input"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="SM-1024"
        autoFocus
      />
      {error && <p className="status-err mt-3">{error}</p>}
      <div className="res-actions">
        <button type="submit" disabled={enviando || !codigo} className="link-danger">
          {enviando ? "Cancelando…" : "✕ CONFIRMAR CANCELACIÓN"}
        </button>
        <button type="button" className="muted underline" onClick={() => setAbierto(false)}>
          no, volver
        </button>
      </div>
    </form>
  );
}
