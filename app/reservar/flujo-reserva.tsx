"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

export type Servicio = {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: number;
  sena_monto: number;
  imagen: string | null;
  descripcion: string | null;
};

type Props = {
  servicios: Servicio[];
  config: { alias_cbu: string; telefono_wa: string; hold_minutos: string; mpActivo: boolean };
  servicioInicial: number | null;
};

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const aISO = (a: number, m: number, d: number) =>
  `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const hoyISO = () => aISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
const pesos = (n: number) => `$ ${n.toLocaleString("es-AR")}`;

export default function FlujoReserva({ servicios, config, servicioInicial }: Props) {
  const [paso, setPaso] = useState(1);
  const [servicio, setServicio] = useState<Servicio | null>(
    servicios.find((s) => s.id === servicioInicial) ?? null,
  );
  const [hoy, setHoy] = useState("");

  // ── Calendario ──
  const [anMes, setAnMes] = useState<[number, number]>([new Date().getFullYear(), new Date().getMonth()]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [fecha, setFecha] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ hora: string; fin: string }[]>([]);
  const [slotsCargando, setSlotsCargando] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);

  // ── Datos / turno ──
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [instagram, setInstagram] = useState("");
  const [notas, setNotas] = useState("");
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => setHoy(hoyISO()), []);

  // Puntos del calendario: días con turnos libres para el servicio elegido.
  const cargarResumen = useCallback(async () => {
    if (!servicio) return;
    const mes = `${anMes[0]}-${String(anMes[1] + 1).padStart(2, "0")}`;
    const r = await fetch(`/api/disponibilidad?mes=${mes}&duracion=${servicio.duracion_min}`);
    if (r.ok) {
      const j = await r.json();
      setResumen(j.fechas ?? {});
    }
  }, [servicio, anMes]);

  useEffect(() => {
    if (paso === 2) cargarResumen();
  }, [paso, cargarResumen]);

  // Horarios del día elegido.
  useEffect(() => {
    if (!fecha || !servicio) { setSlots([]); return; }
    let vivo = true;
    setSlotsCargando(true);
    setSlot(null);
    fetch(`/api/disponibilidad?fecha=${fecha}&duracion=${servicio.duracion_min}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((j) => { if (vivo) setSlots(j.slots ?? []); })
      .finally(() => { if (vivo) setSlotsCargando(false); });
    return () => { vivo = false; };
  }, [fecha, servicio]);

  const diasGrilla = useMemo(() => {
    const [a, m] = anMes;
    const primero = (new Date(a, m, 1).getDay() + 6) % 7; // lunes = 0
    const total = new Date(a, m + 1, 0).getDate();
    const celdas: (number | null)[] = Array(primero).fill(null);
    for (let d = 1; d <= total; d++) celdas.push(d);
    return celdas;
  }, [anMes]);

  const mesActualEs = anMes[0] === new Date().getFullYear() && anMes[1] === new Date().getMonth();
  const moverMes = (delta: number) => {
    setSlot(null);
    setFecha(null);
    setResumen({});
    setAnMes(([a, m]) => {
      const d = new Date(a, m + delta, 1);
      return [d.getFullYear(), d.getMonth()];
    });
  };

  const puedeSeguir = paso === 1 ? !!servicio : paso === 2 ? !!(fecha && slot) : false;

  const crearTurno = async () => {
    setError("");
    setEnviando(true);
    try {
      const r = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_servicio: servicio!.id,
          fecha,
          hora: slot,
          nombre,
          telefono,
          instagram,
          notas,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No pudimos crear la reserva.");
      setTurnoId(j.id);
      setPaso(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  };

  const pagarMP = async (): Promise<void> => {
    setError("");
    setEnviando(true);
    try {
      const r = await fetch("/api/pago/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_turno: turnoId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No pudimos iniciar el pago.");
      window.location.href = j.init_point;
      return;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEnviando(false);
    }
  };

  const elegirTransferencia = async () => {
    setError("");
    setEnviando(true);
    try {
      await fetch("/api/turnos/medio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: turnoId, medio: "TRANSFERENCIA" }),
      });
    } finally {
      setEnviando(false);
    }
    window.location.href = `/reserva/${turnoId}`;
  };

  if (!servicios.length) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="serif text-3xl">Reservar turno</h1>
        <p className="mt-4 text-fg-suave">Todavía no hay servicios cargados.</p>
        <Link href="/" className="mt-6 inline-block underline">Volver</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-8 pb-20">
      <Link href="/" className="text-sm text-muted hover:underline">← Volver</Link>
      <h1 className="serif mt-4 text-3xl">Reservar turno</h1>

      {/* Indicador de pasos */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        {["Servicio", "Día", "Datos", "Seña"].map((t, i) => {
          const n = i + 1;
          const activo = paso === n || (paso === 5 && n === 4);
          const hecho = paso > n && paso !== 5;
          return (
            <div key={t} className={`flex items-center gap-1 ${activo ? "text-fg font-medium" : ""}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${activo ? "bg-acento text-acento-fg" : hecho ? "bg-chip text-fg" : "bg-chip text-muted"}`}>
                {hecho ? "✓" : n}
              </span>
              {t}
            </div>
          );
        })}
      </div>

      {/* ── Paso 1: servicio ── */}
      {paso === 1 && (
        <section className="mt-6 divide-y divide-linea overflow-hidden rounded-2xl bg-card shadow-sm">
          {servicios.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServicio(s)}
              className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-panel ${servicio?.id === s.id ? "bg-panel" : ""}`}
            >
              <span className={`h-4 w-4 shrink-0 rounded-full border ${servicio?.id === s.id ? "border-acento bg-acento shadow-[inset_0_0_0_3px_var(--card)]" : "border-linea"}`} />
              {s.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imagen} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="serif flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chip text-acento">
                  {s.nombre.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="serif block">{s.nombre}</span>
                <span className="block text-xs text-muted">{s.duracion_min} min</span>
              </span>
              <span className="text-right">
                <span className="serif block">{pesos(s.precio)}</span>
                <span className="block text-xs text-muted">seña {pesos(s.sena_monto)}</span>
              </span>
            </button>
          ))}
        </section>
      )}

      {/* ── Paso 2: calendario + horarios ── */}
      {paso === 2 && servicio && (
        <section className="mt-6">
          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => !mesActualEs && moverMes(-1)}
                disabled={mesActualEs}
                className="rounded-full px-3 py-1 text-muted disabled:opacity-30 hover:bg-chip"
              >
                ‹
              </button>
              <p className="serif text-lg capitalize">{MESES[anMes[1]]} {anMes[0]}</p>
              <button type="button" onClick={() => moverMes(1)} className="rounded-full px-3 py-1 text-muted hover:bg-chip">›</button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted">
              {DIAS.map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {diasGrilla.map((d, i) => {
                if (d === null) return <span key={`v${i}`} />;
                const iso = aISO(anMes[0], anMes[1], d);
                const pasado = iso < hoy;
                const libres = resumen[iso] ?? 0;
                const habilitado = !pasado && libres > 0;
                const elegido = fecha === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!habilitado}
                    onClick={() => setFecha(iso)}
                    className={`relative aspect-square rounded-xl text-sm transition-colors ${
                      elegido ? "bg-acento text-acento-fg"
                      : habilitado ? "text-fg hover:bg-chip"
                      : "text-linea"
                    }`}
                  >
                    {d}
                    {habilitado && !elegido && (
                      <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-acento-suave" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {fecha && (
            <div className="mt-4 rounded-2xl bg-card p-5 shadow-sm">
              <p className="serif mb-3 text-lg">Horarios</p>
              {slotsCargando ? (
                <p className="text-sm text-muted">Cargando…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">No queda ningún horario libre ese día.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.hora}
                      type="button"
                      onClick={() => setSlot(s.hora)}
                      className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        slot === s.hora
                          ? "border-acento bg-acento text-acento-fg"
                          : "border-linea hover:bg-chip"
                      }`}
                    >
                      {s.hora} – {s.fin}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted">
            Al continuar te bloqueamos el horario por {config.hold_minutos} minutos para completar la reserva.
          </p>
        </section>
      )}

      {/* ── Paso 3: datos ── */}
      {paso === 3 && servicio && (
        <section className="mt-6 rounded-2xl bg-card p-5 shadow-sm">
          <div className="rounded-xl bg-panel px-4 py-3 text-sm text-fg-suave">
            <span className="serif text-fg">{servicio.nombre}</span> · {fecha} · {slot} –{" "}
            {slots.find((s) => s.hora === slot)?.fin ?? slot}
          </div>
          <div className="mt-4 space-y-3">
            <Campo etiqueta="Nombre y apellido" valor={nombre} alCambiar={setNombre} />
            <Campo etiqueta="Teléfono" valor={telefono} alCambiar={setTelefono} tipo="tel" />
            <Campo etiqueta="Usuario de Instagram (opcional)" valor={instagram} alCambiar={setInstagram} />
            <Campo etiqueta="Algo que contar (opcional)" valor={notas} alCambiar={setNotas} />
          </div>
        </section>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-card px-4 py-3 text-sm text-red-700 shadow-sm">{error}</p>
      )}

      {/* ── Botones de avance ── */}
      {paso < 4 && (
        <div className="mt-6 flex flex-col gap-2">
          {paso > 1 && (
            <button type="button" onClick={() => setPaso(paso - 1)} className="text-sm text-muted hover:underline">
              ← Atrás
            </button>
          )}
          <button
            type="button"
            disabled={!puedeSeguir || enviando}
            onClick={() => {
              setError("");
              if (paso === 3) { setPaso(4); return; }
              setPaso(paso + 1);
            }}
            className="rounded-full bg-acento py-3 text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave disabled:opacity-40"
          >
            Continuar →
          </button>
        </div>
      )}

      {/* ── Paso 4: revisar y confirmar ── */}
      {paso === 4 && servicio && (
        <div className="mt-6 rounded-2xl bg-card p-5 shadow-sm">
          <p className="serif text-lg">Confirmá tu reserva</p>
          <ul className="mt-3 space-y-1 text-sm text-fg-suave">
            <li><b className="text-fg">{servicio.nombre}</b> ({servicio.duracion_min} min)</li>
            <li>{fecha ?? ""} · {slot} – {slots.find((s) => s.hora === slot)?.fin ?? slot}</li>
            <li>{nombre} · {telefono}{instagram ? ` · ${instagram}` : ""}</li>
            <li className="pt-2">Total: <b className="text-fg">{pesos(servicio.precio)}</b></li>
            <li>Seña para reservar: <b className="text-fg">{pesos(servicio.sena_monto)}</b></li>
          </ul>
          <button
            type="button"
            disabled={enviando}
            onClick={crearTurno}
            className="mt-5 w-full rounded-full bg-acento py-3 text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave disabled:opacity-40"
          >
            {enviando ? "Reservando…" : "Confirmar reserva"}
          </button>
          <button type="button" onClick={() => setPaso(3)} className="mt-3 text-sm text-muted hover:underline">
            ← Cambiar datos
          </button>
        </div>
      )}

      {/* ── Paso 5: pago de la seña ── */}
      {paso === 5 && servicio && turnoId && (
        <div className="mt-6 rounded-2xl bg-card p-5 shadow-sm">
          <p className="serif text-lg">Último paso: la seña</p>
          <p className="mt-1 text-sm text-fg-suave">
            Tu horario quedó bloqueado. Pagá la seña de <b className="text-fg">{pesos(servicio.sena_monto)}</b> para confirmarlo.
          </p>

          {config.mpActivo && (
            <>
              <button
                type="button"
                onClick={pagarMP} disabled={enviando}
                className="mt-5 w-full rounded-full bg-acento py-3 text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave disabled:opacity-40"
              >
                {enviando ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                Se confirma solo cuando entra el pago.
              </p>
            </>
          )}

          <div className="mt-5 rounded-xl bg-panel p-4">
            <p className="text-xs tracking-widest text-muted uppercase">Pagá por transferencia</p>
            <p className="mt-2 text-sm break-all text-fg-suave">{config.alias_cbu}</p>
            <button
              type="button"
              onClick={elegirTransferencia}
              disabled={enviando}
              className="mt-3 w-full rounded-full bg-acento py-2.5 text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave disabled:opacity-40"
            >
              {enviando ? "Guardando…" : "Ya hice la transferencia"}
            </button>
            <p className="mt-2 text-xs text-muted">
              El turno queda en revisión hasta que llega el pago (tiene {config.hold_minutos} minutos más
              de gracia). Te avisamos por mail.
            </p>
          </div>

          <Link href={`/reserva/${turnoId}`} className="mt-4 block text-center text-sm text-muted hover:underline">
            Ver el estado de mi reserva →
          </Link>
        </div>
      )}
    </main>
  );
}

function Campo({
  etiqueta, valor, alCambiar, tipo = "text",
}: { etiqueta: string; valor: string; alCambiar: (v: string) => void; tipo?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs tracking-widest text-muted uppercase">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className="w-full rounded-xl border border-linea bg-panel px-4 py-2.5 text-fg outline-none focus:border-acento"
      />
    </label>
  );
}
