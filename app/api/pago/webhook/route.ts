import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { avisar } from "@/lib/mail";
import { pesos } from "@/lib/config";

type MPNotificacion = { action?: string; data?: { id?: string | number } };

/**
 * Webhook de Mercado Pago: no tiene sesión de usuario, por eso todo el access
 * se hace con el cliente de servicio. Verificamos el pago contra la API de MP
 * (no confiamos en el cuerpo de la notificación) y confirmamos el turno.
 */
export async function POST(req: NextRequest) {
  try {
    const cuerpo = (await req.json().catch(() => ({}))) as MPNotificacion;
    if (cuerpo.action !== "payment.created" || !cuerpo.data?.id) {
      return NextResponse.json({ ok: true });
    }

    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: "MP no configurado." }, { status: 500 });

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${cuerpo.data.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return NextResponse.json({ ok: true }); // no frenamos al notificador
    const pago = (await r.json()) as {
      status?: string;
      transaction_amount?: number;
      external_reference?: string;
    };

    if (pago.status !== "approved") return NextResponse.json({ ok: true });
    const idTurno = Number(pago.external_reference);
    if (!Number.isInteger(idTurno) || idTurno <= 0) return NextResponse.json({ ok: true });

    const { data: turno } = await sb()
      .from("turnos")
      .select("id,estado,nombre,fecha,hora,sena_monto,servicio: id_servicio(nombre)")
      .eq("id", idTurno)
      .maybeSingle() as { data: {
        id: number; estado: string; nombre: string; fecha: string; hora: string;
        sena_monto: number; servicio: { nombre: string } | null;
      } | null };
    if (!turno || turno.estado !== "PENDIENTE") return NextResponse.json({ ok: true });

    const { error } = await sb()
      .from("turnos")
      .update({
        estado: "CONFIRMADO",
        metodo: "MERCADOPAGO",
        mp_payment_id: String(cuerpo.data.id),
        confirmado_at: new Date().toISOString(),
      })
      .eq("id", idTurno);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const cfg = await getConfig();
    await avisar(
      "TURNO_CONFIRMADO",
      cfg.email_admin || null,
      `Pago recibido: turno #${turno.id} CONFIRMADO`,
      [
        `Seña cobrada por Mercado Pago: ${pesos(pago.transaction_amount ?? turno.sena_monto)}`,
        `Turno #${turno.id}: ${turno.servicio?.nombre ?? ""} — ${turno.fecha} ${turno.hora}`,
        `Clienta: ${turno.nombre}`,
      ].join("\n"),
    );

    return NextResponse.json({ ok: true });
  } catch {
    // Igual respondemos 200: MP reintenta si hace falta.
    return NextResponse.json({ ok: true });
  }
}
