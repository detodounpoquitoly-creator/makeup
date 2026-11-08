"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CategoriaFlujo, ServicioFlujo } from "./page";

type Props = {
  categorias: CategoriaFlujo[];
  servicios: ServicioFlujo[];
  config: {
    alias_cbu: string;
    telefono_wa: string;
    marca: string;
    estudio_direccion: string;
    estudio_horarios: string;
    estudio_nota: string;
    hold_minutos: string;
    mpActivo: boolean;
  };
  categoriaInicial: number | null;
};

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const aISO = (a: number, m: number, d: number) =>
  `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const hoyISO = () => aISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
const pesos = (n: number) => `$ ${n.toLocaleString("es-AR")}`;

type Paso = "servicio" | "detalle" | "turno" | "datos" | "listo";
const ETIQUETAS: [Paso, string][] = [
  ["servicio", "Servicio"],
  ["detalle", "Detalle"],
  ["turno", "Turno"],
  ["datos", "Datos"],
];
const NUMPASO: Record<Paso, number> = { servicio: 1, detalle: 2, turno: 3, datos: 4, listo: 4 };

type TurnoCreado = { id: number; codigo: string; fecha: string; hora: string; fin?: string };

export default function FlujoReserva({ categorias, servicios, config, categoriaInicial }: Props) {
  const [paso, setPaso] = useState<Paso>(categoriaInicial ? "servicio" : "servicio");
  const [catId, setCatId] = useState<number | null>(categoriaInicial);
  const [servicio, setServicio] = useState<ServicioFlujo | null>(null);
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
  const [telefono2, setTelefono2] = useState("");
  const [instagram, setInstagram] = useState("");
  const [turno, setTurno] = useState<TurnoCreado | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => setHoy(hoyISO()), []);

  const servicioDe = (n: number) => servicios.find((s) => s.id === n) ?? null;
  const catDe = (n: number) => categorias.find((c) => c.id === n) ?? null;

  // Puntos del calendario: días con lugares libres para el servicio elegido.
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
    if (paso === "turno") cargarResumen();
  }, [paso, cargarResumen]);

  // Horarios del día elegido.
  useEffect(() => {
    if (!fecha || !servicio || paso !== "turno") {
      setSlots([]);
      return;
    }
    let vivo = true;
    setSlotsCargando(true);
    setSlot(null);
    fetch(`/api/disponibilidad?fecha=${fecha}&duracion=${servicio.duracion_min}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((j) => { if (vivo) setSlots(j.slots ?? []); })
      .finally(() => { if (vivo) setSlotsCargando(false); });
    return () => { vivo = false; };
  }, [fecha, servicio, paso]);

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

  // Validación como la demo: nombre completo, teléfono válido y repetido igual.
  const dig = (v: string) => (v || "").replace(/\D/g, "");
  const datosValidos = nombre.trim().length >= 3 && dig(telefono).length >= 8 && dig(telefono) === dig(telefono2);

  const irA = (p: Paso) => {
    setError("");
    setPaso(p);
    window.scrollTo({ top: 0 });
  };

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
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No pudimos crear la reserva.");
      setTurno(j as TurnoCreado);
      setPaso("listo");
      window.scrollTo({ top: 0 });
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
        body: JSON.stringify({ id_turno: turno!.id }),
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
        body: JSON.stringify({ id: turno!.id, medio: "TRANSFERENCIA" }),
      });
    } finally {
      setEnviando(false);
    }
    window.location.href = `/reserva/${turno!.id}`;
  };

  const nomDia = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
  };

  const servicioCat = catId ? servicios.filter((s) => s.categoria_id === catId) : [];

  // ── Pantalla de éxito (como la demo) ──
  if (paso === "listo" && turno && servicio) {
    return (
      <div className="bk fade-in" style={{ textAlign: "center", paddingTop: "3.5rem" }} key="ok">
        <div className="mx-auto flex items-center justify-center text-white" style={{ width: 80, height: 80, marginBottom: "1.5rem", borderRadius: "50%", background: "var(--acento)" }}>
          <svg style={{ width: 36, height: 36 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
        </div>
        <h2 className="serif" style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>¡Reserva registrada!</h2>
        <p className="body-txt">Código <b>{turno.codigo}</b></p>
        <p className="muted" style={{ marginBottom: "2rem", textTransform: "capitalize" }}>{nomDia(turno.fecha)} — {turno.hora}</p>

        <div className="card p-5 text-left" style={{ marginBottom: "1.5rem" }}>
          <p className="font-semibold" style={{ color: "var(--fg)" }}>{servicio.nombre}</p>
          <p className="muted mt-1">A nombre de {nombre}</p>
          <div style={{ borderTop: "1px solid #f0ebe3", marginTop: "1rem", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="lbl" style={{ margin: 0 }}>TOTAL</span>
            <span style={{ textAlign: "right" }}>
              <span className="font-semibold" style={{ fontSize: "1.1rem", color: "var(--fg)" }}>{pesos(servicio.precio)}</span>
              <span className="muted" style={{ display: "block" }}>seña {pesos(servicio.sena_monto)} · {servicio.duracion_min} min</span>
            </span>
          </div>
        </div>

        {error && <p className="status-err mb-4">{error}</p>}

        {config.mpActivo && (
          <>
            <button type="button" onClick={pagarMP} disabled={enviando} className="btn btn-pri btn-block">
              {enviando ? "Abriendo Mercado Pago…" : "PAGAR SEÑA CON MERCADO PAGO"}
            </button>
            <p className="muted mt-2">El turno se confirma solo cuando entra el pago.</p>
            <div className="card p-4 mt-4 text-left" style={{ textAlign: "left" }}>
              <p className="muted" style={{ letterSpacing: "0.2em", fontSize: 10, fontWeight: 600 }}>O PAGÁ POR TRANSFERENCIA</p>
              <p className="text-sm mt-2 break-all" style={{ color: "var(--fg-suave)" }}>{config.alias_cbu}</p>
              <button type="button" onClick={elegirTransferencia} disabled={enviando} className="btn btn-pri btn-block mt-3">
                {enviando ? "Guardando…" : "YA HICE LA TRANSFERENCIA"}
              </button>
              <p className="muted mt-2">Queda en revisión hasta que llega el pago; te avisamos.</p>
            </div>
          </>
        )}
        {!config.mpActivo && (
          <div className="card p-4 text-left">
            <p className="muted" style={{ letterSpacing: "0.2em", fontSize: 10, fontWeight: 600 }}>PAGÁ LA SEÑA POR TRANSFERENCIA</p>
            <p className="text-sm mt-2 break-all" style={{ color: "var(--fg-suave)" }}>{config.alias_cbu}</p>
            <button type="button" onClick={elegirTransferencia} disabled={enviando} className="btn btn-pri btn-block mt-3">
              {enviando ? "Guardando…" : "YA HICE LA TRANSFERENCIA"}
            </button>
            <p className="muted mt-2">El turno queda bloqueado y se confirma cuando llega el pago.</p>
          </div>
        )}

        <Link href={`/reserva/${turno.id}`} className="btn btn-pri btn-block" style={{ marginTop: "1.5rem" }}>VER MI RESERVA</Link>
        <Link href="/" className="btn btn-out btn-block mt-2">VOLVER AL INICIO</Link>
      </div>
    );
  }

  const pasoNum = NUMPASO[paso];

  return (
    <div className="bk fade-in">
      {/* Encabezado del paso */}
      <div className="bk-head">
        <button
          className="backlink"
          onClick={() => {
            if (paso === "servicio" && catId) setCatId(null);
            else if (paso === "detalle") setPaso("servicio");
            else if (paso === "turno") setPaso("detalle");
            else if (paso === "datos") setPaso("turno");
          }}
        >
          ← Volver
        </button>
        <p className="steplabel">PASO {pasoNum} DE 4</p>
      </div>

      <div className="progress">
        {ETIQUETAS.map(([p, t], i) => (
          <div key={p}>
            <div className={`bar${i + 1 <= pasoNum ? " on" : ""}`} />
            <p className={`cap${i + 1 === pasoNum ? " on" : ""}`}>{t}</p>
          </div>
        ))}
      </div>

      {error && <p className="status-err mb-4">{error}</p>}

      {/* ── PASO 1: elegí tu servicio (categoría → servicio) ── */}
      {paso === "servicio" && !catId && (
        <>
          <h2>Elegí tu servicio</h2>
          <p className="sub">¿Qué te gustaría reservar?</p>
          <div className="stack">
            {categorias.map((c) => (
              <button key={c.id} type="button" className="opt" onClick={() => setCatId(c.id)}>
                <span className="nm">{c.nombre}</span>
                <span className="muted flex items-center gap-2 ml-auto">
                  {servicios.filter((s) => s.categoria_id === c.id).length} servicios →
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {paso === "servicio" && catId && (
        <>
          <h2>{catDe(catId)?.nombre}</h2>
          <p className="sub">
            Elegí el servicio y su duración ·{" "}
            <button style={{ textDecoration: "underline" }} onClick={() => setCatId(null)}>
              cambiar categoría
            </button>
          </p>
          <div className="stack">
            {servicioCat.map((s) => (
              <button key={s.id} type="button" className={`opt${servicio?.id === s.id ? " sel" : ""}`} onClick={() => setServicio(s)}>
                <span className="radio" />
                <span style={{ flex: 1 }}>
                  <span className="nm">{s.nombre}</span>
                  <span className="meta">
                    {s.duracion_min} min · desde {pesos(s.precio)} · seña {pesos(s.sena_monto)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-pri btn-block"
            style={{ marginTop: "1.5rem" }}
            disabled={!servicio}
            onClick={() => irA("detalle")}
          >
            CONTINUAR →
          </button>
        </>
      )}

      {/* ── PASO 2: detalle ── */}
      {paso === "detalle" && servicio && (
        <>
          <h2>{servicio.nombre}</h2>
          <p className="sub">
            ⏱ {servicio.duracion_min} min · Seña {pesos(servicio.sena_monto)} · Total {pesos(servicio.precio)}
          </p>
          <p className="body-txt" style={{ marginBottom: "1.5rem" }}>{servicio.descripcion}</p>
          <div className="card p-5" style={{ marginBottom: "1.5rem" }}>
            <p className="lbl flex items-center gap-2">📍 EN EL ESTUDIO</p>
            <p className="font-semibold" style={{ color: "var(--fg)" }}>{config.estudio_direccion}</p>
            <p className="muted mt-1">{config.estudio_horarios} · {config.estudio_nota}</p>
          </div>
          <button type="button" className="btn btn-pri btn-block" onClick={() => irA("turno")}>CONTINUAR →</button>
        </>
      )}

      {/* ── PASO 3: turno ── */}
      {paso === "turno" && servicio && (
        <>
          <h2>Turnos</h2>
          <p className="sub">Elegí el día y el horario</p>
          <div className="card p-5" style={{ marginBottom: "1.25rem" }}>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                className="btn btn-out btn-sm"
                style={{ borderRadius: "50%", padding: "0.5rem 0.65rem" }}
                disabled={mesActualEs}
                onClick={() => moverMes(-1)}
              >
                ←
              </button>
              <p className="font-semibold capitalize">{MESES[anMes[1]]} {anMes[0]}</p>
              <button type="button" className="btn btn-out btn-sm" style={{ borderRadius: "50%", padding: "0.5rem 0.65rem" }} onClick={() => moverMes(1)}>→</button>
            </div>
            <div className="cal-grid">
              {DIAS.map((d, i) => <span key={`s${i}`} className="dow">{d}</span>)}
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
                    className={`cal-day${elegido ? " sel" : ""}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {fecha ? (
            <>
              <p className="muted" style={{ textTransform: "capitalize", marginBottom: "0.75rem" }}>{nomDia(fecha)}</p>
              {slotsCargando ? (
                <p className="status-info">Cargando horarios…</p>
              ) : slots.length === 0 ? (
                <p className="status-info">No queda ningún horario libre ese día.</p>
              ) : (
                <div className="slot-grid">
                  {slots.map((s) => (
                    <button
                      key={s.hora}
                      type="button"
                      onClick={() => setSlot(s.hora)}
                      className={`slot${slot === s.hora ? " sel" : ""}`}
                    >
                      {s.hora}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="status-info mb-5">Primero elegí un día del calendario 👆</p>
          )}

          <p className="hold">🔒 Te bloqueamos el horario por {config.hold_minutos} minutos para completar la reserva.</p>
          <button
            type="button"
            className="btn btn-pri btn-block"
            disabled={!slot}
            onClick={() => irA("datos")}
          >
            CONTINUAR →
          </button>
        </>
      )}

      {/* ── PASO 4: datos ── */}
      {paso === "datos" && servicio && (
        <>
          <h2>Cargá tus datos</h2>
          <p className="sub">Y te escribimos por WhatsApp con todo lo necesario para pagar la seña y confirmar tu reserva.</p>

          <div className="card p-5" style={{ marginBottom: "1.5rem" }}>
            <p className="font-semibold" style={{ color: "var(--fg)" }}>{servicio.nombre}</p>
            <p className="muted mt-1 capitalize">{nomDia(fecha!)} — {slot}</p>
            <div style={{ borderTop: "1px solid #f0ebe3", marginTop: "1rem", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p className="lbl" style={{ margin: 0 }}>TOTAL</p>
              <p style={{ textAlign: "right" }}>
                <span className="font-semibold" style={{ fontSize: "1.1rem", color: "var(--fg)" }}>{pesos(servicio.precio)}</span>
                <span className="muted" style={{ display: "block" }}>seña {pesos(servicio.sena_monto)} · {servicio.duracion_min} min</span>
              </p>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="lbl" htmlFor="nv-name">NOMBRE Y APELLIDO</label>
            <input id="nv-name" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre completo" />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="lbl" htmlFor="nv-tel">TELÉFONO (WHATSAPP)</label>
            <input id="nv-tel" className="input" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+54 9 11 ..." />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="lbl" htmlFor="nv-tel2">CONFIRMÁ TU TELÉFONO</label>
            <input id="nv-tel2" className="input" type="tel" value={telefono2} onChange={(e) => setTelefono2(e.target.value)} placeholder="+54 9 11 ..." />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="lbl" htmlFor="nv-ig">INSTAGRAM (OPCIONAL)</label>
            <input id="nv-ig" className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@tuusuario" />
          </div>

          {!datosValidos && (
            <p style={{ fontSize: 12, color: "#b0644f", marginBottom: "1rem" }}>
              Revisá los campos: nombre completo, teléfono válido y que ambos números coincidan.
            </p>
          )}

          <button type="button" className="btn btn-pri btn-block" disabled={!datosValidos || enviando} onClick={crearTurno}>
            {enviando ? "Reservando…" : "CONFIRMAR RESERVA"}
          </button>
        </>
      )}
    </div>
  );
}
