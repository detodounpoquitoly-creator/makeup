import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";
import { getConfig } from "@/lib/config";

/**
 * POST /api/turnos/medio { id, medio }
 * Registra el método de pago elegido y recalcular el vencimiento:
 * - TRANSFERENCIA: más tiempo (horas_vence_transferencia) porque llega manualmente.
 * - MERCADOPAGO: se mantiene el bloqueo original (se confirma por webhook).
 */
export async function POST(req: NextRequest) {
  try {
    const { id, medio } = (await req.json().catch(() => ({}))) as { id?: number; medio?: string };
    if (!Number.isInteger(id) || (medio !== "TRANSFERENCIA" && medio !== "MERCADOPAGO")) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const { data: turno } = await sb()
      .from("turnos")
      .select("id,estado,metodo")
      .eq("id", Number(id))
      .maybeSingle() as { data: { id: number; estado: string; metodo: string | null } | null };
    if (!turno) return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
    if (turno.estado !== "PENDIENTE" || turno.metodo === "MERCADOPAGO") {
      return NextResponse.json({ ok: true });
    }

    const patch: Record<string, unknown> = { metodo: medio };
    if (medio === "TRANSFERENCIA") {
      const cfg = await getConfig();
      const horas = Math.max(1, Number(cfg.horas_vence_transferencia) || 12);
      patch.vence_at = new Date(Date.now() + horas * 3_600_000).toISOString();
    }

    const { error } = await sb().from("turnos").update(patch).eq("id", Number(id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno." },
      { status: 500 },
    );
  }
}
