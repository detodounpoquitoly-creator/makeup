import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { avisar } from "@/lib/mail";

/**
 * POST /api/turnos/cancelar { id, codigo }
 * Cancelación autogestionada: solo con el código de la reserva (SM-XXXX)
 * y solo si está PENDIENTE o CONFIRMADO.
 */
export async function POST(req: NextRequest) {
  try {
    const { id, codigo } = (await req.json().catch(() => ({}))) as { id?: number; codigo?: string };
    if (!Number.isInteger(id) || !codigo) {
      return NextResponse.json({ error: "Faltan los datos de la reserva." }, { status: 400 });
    }

    const { data: turno } = await sb()
      .from("turnos")
      .select("id,codigo,estado,nombre,fecha,hora,servicio: id_servicio(nombre)")
      .eq("id", Number(id))
      .maybeSingle() as { data: {
        id: number; codigo: string | null; estado: string; nombre: string;
        fecha: string; hora: string; servicio: { nombre: string } | null;
      } | null };

    if (!turno) return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
    if (turno.estado === "CANCELADO" || turno.estado === "VENCIDO") {
      return NextResponse.json({ error: "Esta reserva ya está cerrada." }, { status: 409 });
    }

    if ((turno.codigo ?? "").toUpperCase() !== String(codigo).trim().toUpperCase()) {
      return NextResponse.json({ error: "El código no corresponde a esta reserva." }, { status: 403 });
    }

    const { error } = await sb().from("turnos").update({ estado: "CANCELADO" }).eq("id", Number(id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const cfg = await getConfig();
    await avisar(
      "TURNO_CANCELADO",
      cfg.email_admin || null,
      `Reserva ${turno.codigo ?? turno.id} cancelada por la clienta`,
      [
        `Turno #${turno.id}: ${turno.servicio?.nombre ?? ""} — ${turno.fecha} ${turno.hora}`,
        `Clienta: ${turno.nombre}`,
        "El horario queda libre.",
      ].join("\n"),
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno." },
      { status: 500 },
    );
  }
}
