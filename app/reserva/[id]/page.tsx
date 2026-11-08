import Link from "next/link";
import { notFound } from "next/navigation";
import { sb, configurado } from "@/lib/supabase";
import { getConfig, pesos } from "@/lib/config";
import CancelarReserva from "@/components/cancelar-reserva";
import { IconoWa } from "@/components/iconos";

export const dynamic = "force-dynamic";

type Turno = {
  id: number;
  codigo: string | null;
  fecha: string;
  hora: string;
  fin: string;
  nombre: string;
  estado: string;
  sena_monto: number;
  metodo: string | null;
  servicio: { nombre: string; duracion_min: number; precio: number } | null;
};

const ROTULO: Record<string, { texto: string; badge: string; detalle: string; cancelable: boolean }> = {
  PENDIENTE: {
    texto: "PENDIENTE DE SEÑA",
    badge: "wt",
    detalle: "Tu horario quedó bloqueado. Se confirma en cuanto llegue la seña.",
    cancelable: true,
  },
  CONFIRMADO: {
    texto: "CONFIRMADA",
    badge: "ok",
    detalle: "¡Listo! Te esperamos ese día y horario.",
    cancelable: true,
  },
  VENCIDO: {
    texto: "CANCELADA · VENCIDA",
    badge: "no",
    detalle: "El horario se liberó porque no llegó la seña a tiempo. Podés reservar de nuevo.",
    cancelable: false,
  },
  CANCELADO: {
    texto: "CANCELADA",
    badge: "no",
    detalle: "Esta reserva quedó cancelada.",
    cancelable: false,
  },
};

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
};

export default async function PaginaReserva({ params }: { params: Promise<{ id: string }> }) {
  if (!configurado) notFound();
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) notFound();

  const [cfg, turnoRes] = await Promise.all([
    getConfig(),
    sb()
      .from("turnos")
      .select("id,codigo,fecha,hora,fin,nombre,estado,sena_monto,metodo,servicio: id_servicio(nombre,duracion_min,precio)")
      .eq("id", idNum)
      .maybeSingle(),
  ]);
  const turno = turnoRes.data as Turno | null;
  if (!turno) notFound();

  const info = ROTULO[turno.estado] ?? ROTULO.PENDIENTE;
  const wa = (cfg.telefono_wa || "").replace(/\D/g, "");
  const waMsg = encodeURIComponent(
    `¡Hola ${cfg.marca}! Consulto por mi reserva ${turno.codigo ?? turno.id} de ${turno.servicio?.nombre ?? "maquillaje"} (${turno.fecha} ${turno.hora}).`,
  );

  return (
    <main className="wrap pt-8">
      <Link href="/" className="backlink">← Inicio</Link>

      <div className="res-card card fade-in mt-6" style={{ marginBottom: "6rem" }}>
        <div className="res-top">
          <div>
            <p className="font-semibold" style={{ color: "var(--fg)" }}>{turno.servicio?.nombre}</p>
            <p className="muted mt-1 capitalize">{fechaLarga(turno.fecha)} — {turno.hora}</p>
          </div>
          <span className={`badge ${info.badge}`}>{info.texto}</span>
        </div>

        <div className="res-meta">
          <span><b style={{ color: "var(--fg-suave)" }}>{turno.nombre}</b> · {turno.metodo === "TRANSFERENCIA" ? "transferencia" : turno.metodo === "MERCADOPAGO" ? "Mercado Pago" : "seña pendiente"}</span>
          <span>Código <b style={{ color: "var(--fg-suave)" }}>{turno.codigo}</b></span>
          <span>Total {pesos(turno.servicio?.precio ?? 0)}</span>
          <span>Seña {pesos(turno.sena_monto)}</span>
        </div>

        <p className="status-info mt-4">{info.detalle}</p>

        {turno.estado === "PENDIENTE" && (
          <div className="card p-4 mt-4">
            {turno.metodo !== "TRANSFERENCIA" && process.env.MP_ACCESS_TOKEN && (
              <form action="/api/pago/mercadopago" method="post">
                <input type="hidden" name="id_turno" value={turno.id} />
                <button type="submit" className="btn btn-pri btn-block">PAGAR SEÑA CON MERCADO PAGO</button>
                <p className="muted mt-2 text-center">Se confirma solo cuando entra el pago.</p>
              </form>
            )}
            <div className="status-info mt-3">
              <p className="muted" style={{ letterSpacing: "0.2em", fontSize: 10, fontWeight: 600 }}>TRANSFERENCIA</p>
              <p className="text-sm mt-1 break-all">{cfg.alias_cbu}</p>
            </div>
          </div>
        )}

        <div className="res-actions flex-wrap">
          <a
            href={`https://wa.me/${wa}?text=${waMsg}`}
            target="_blank"
            rel="noreferrer"
            className="link-wa"
          >
            <IconoWa tam={14} /> AVISAR POR WHATSAPP
          </a>
          {info.cancelable && <CancelarReserva idTurno={turno.id} />}
        </div>
      </div>
    </main>
  );
}

