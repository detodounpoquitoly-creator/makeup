import Link from "next/link";
import { notFound } from "next/navigation";
import { sb, configurado } from "@/lib/supabase";
import { getConfig, pesos } from "@/lib/config";

export const dynamic = "force-dynamic";

type Turno = {
  id: number;
  fecha: string;
  hora: string;
  fin: string;
  nombre: string;
  estado: string;
  sena_monto: number;
  metodo: string | null;
  servicio: { nombre: string; duracion_min: number; precio: number } | null;
};

const ROTULO: Record<string, { texto: string; clase: string; detalle: string }> = {
  PENDIENTE: {
    texto: "Pendiente de seña",
    clase: "bg-chip text-fg",
    detalle: "Tu horario quedó bloqueado. Confirmamos en cuanto llegue la seña.",
  },
  CONFIRMADO: {
    texto: "Turno confirmado ✓",
    clase: "bg-acento text-acento-fg",
    detalle: "¡Listo! Te esperamos ese día y horario.",
  },
  VENCIDO: {
    texto: "Reserva vencida",
    clase: "bg-linea text-fg-suave",
    detalle: "El horario se liberó porque no llegó la seña a tiempo. Podés reservar de nuevo.",
  },
  CANCELADO: {
    texto: "Reserva cancelada",
    clase: "bg-linea text-fg-suave",
    detalle: "Esta reserva quedó cancelada.",
  },
};

export default async function PaginaReserva({ params }: { params: Promise<{ id: string }> }) {
  if (!configurado) notFound();
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) notFound();

  const [cfgResult, turnoResult] = await Promise.all([
    getConfig(),
    sb()
      .from("turnos")
      .select("id,fecha,hora,fin,nombre,estado,sena_monto,metodo,servicio: id_servicio(nombre,duracion_min,precio)")
      .eq("id", idNum)
      .maybeSingle(),
  ]);
  const turno = turnoResult.data as Turno | null;
  if (!turno) notFound();

  const cfg = cfgResult;
  const info = ROTULO[turno.estado] ?? ROTULO.PENDIENTE;
  const wa = (cfg.telefono_wa || "").replace(/\D/g, "");
  const waMsg = encodeURIComponent(
    `¡Hola! Hice una reserva de ${turno.servicio?.nombre ?? "maquillaje"} para el ${turno.fecha} a las ${turno.hora} (reserva #${turno.id}).`,
  );

  return (
    <main className="mx-auto max-w-xl px-6 py-10 pb-20">
      <Link href="/" className="text-sm text-muted hover:underline">← Inicio</Link>

      <section className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
        <span className={`inline-block rounded-full px-4 py-1.5 text-xs tracking-widest uppercase ${info.clase}`}>
          {info.texto}
        </span>
        <h1 className="serif mt-4 text-2xl">{turno.servicio?.nombre}</h1>
        <p className="mt-1 text-sm text-muted">
          {turno.servicio?.duracion_min} min · {turno.fecha} · {turno.hora} – {turno.fin}
        </p>
        <ul className="mt-4 space-y-1 text-sm text-fg-suave">
          <li>A nombre de: <b className="text-fg">{turno.nombre}</b></li>
          <li>Reserva nº {turno.id}</li>
          <li>Total: <b className="text-fg">{pesos(turno.servicio?.precio ?? 0)}</b></li>
          <li>Seña: <b className="text-fg">{pesos(turno.sena_monto)}</b>{turno.metodo ? ` · vía ${turno.metodo === "TRANSFERENCIA" ? "transferencia" : "Mercado Pago"}` : ""}</li>
        </ul>
        <p className="mt-4 rounded-xl bg-panel px-4 py-3 text-sm text-fg-suave">{info.detalle}</p>
      </section>

      {turno.estado === "PENDIENTE" && (
        <section className="mt-4 rounded-2xl bg-card p-5 shadow-sm">
          <p className="text-xs tracking-widest text-muted uppercase">Pagar la seña</p>
          {turno.metodo !== "TRANSFERENCIA" && (
            <PagarMP idTurno={turno.id} mpActivo={Boolean(process.env.MP_ACCESS_TOKEN)} />
          )}
          {turno.metodo !== "MERCADOPAGO" && (
            <div className="mt-3 rounded-xl bg-panel p-4">
              <p className="text-sm break-all text-fg-suave">{cfg.alias_cbu}</p>
              <p className="mt-2 text-xs text-muted">
                Si ya transferiste, esperá: se confirma cuando llega el pago.{turno.metodo === "TRANSFERENCIA" ? "" : " O volvé al flujo de reserva y elegí 'Ya hice la transferencia'."}
              </p>
            </div>
          )}
        </section>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={`https://wa.me/${wa}?text=${waMsg}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-acento py-3 text-center text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave"
        >
          Avisar por WhatsApp
        </a>
        <Link href="/" className="text-center text-sm text-muted hover:underline">Volver al inicio</Link>
      </div>
    </main>
  );
}

function PagarMP({ idTurno, mpActivo }: { idTurno: number; mpActivo: boolean }) {
  if (!mpActivo) return null;
  return (
    <form action="/api/pago/mercadopago" method="post">
      <input type="hidden" name="id_turno" value={idTurno} />
      <button
        type="submit"
        className="mt-3 w-full rounded-full bg-acento py-3 text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave"
      >
        Pagar con Mercado Pago
      </button>
    </form>
  );
}
