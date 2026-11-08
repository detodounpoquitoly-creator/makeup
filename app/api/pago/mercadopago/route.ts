import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";

type TurnoPago = {
  id: number;
  estado: string;
  sena_monto: number;
  servicio: { nombre: string } | null;
};

/**
 * POST /api/pago/mercadopago { id_turno }
 * - Crea la preferencia de MP con el monto de la seña SIEMPRE sacado de la base.
 * - Con JSON devuelve { init_point } (lo usa el flujo de reserva).
 * - Con formulario (form POST desde /reserva) redirige directo al checkout.
 */
export async function POST(req: NextRequest) {
  const token = process.env.MP_ACCESS_TOKEN;
  const esJson = (req.headers.get("content-type") ?? "").includes("application/json");

  const responder = (status: number, error: string, initPoint?: string, idTurno = 0) => {
    if (esJson) {
      return initPoint
        ? NextResponse.json({ init_point: initPoint })
        : NextResponse.json({ error }, { status });
    }
    // Formulario (desde la página de la reserva): al checkout o de vuelta a la página.
    const destino = new URL(initPoint || `/reserva/${idTurno || ""}`, req.nextUrl.origin);
    return NextResponse.redirect(destino, { status: 303 });
  };

  if (!token) return responder(503, "Mercado Pago no está configurado todavía.");

  try {
    let idTurno = 0;
    if (esJson) {
      const j = (await req.json().catch(() => ({}))) as { id_turno?: number };
      idTurno = Number(j.id_turno);
    } else {
      const f = await req.formData();
      idTurno = Number(f.get("id_turno"));
    }
    if (!Number.isInteger(idTurno) || idTurno <= 0) {
      return responder(400, "Reserva inválida.", undefined);
    }

    const { data: t } = await sb()
      .from("turnos")
      .select("id,estado,sena_monto,servicio: id_servicio(nombre)")
      .eq("id", idTurno)
      .maybeSingle();
    const turno = t as TurnoPago | null;
    if (!turno) return responder(404, "Reserva no encontrada.", undefined, idTurno);
    if (turno.estado !== "PENDIENTE") {
      return responder(409, "Esta reserva ya está gestionada.", undefined, idTurno);
    }

    await sb().from("turnos").update({ metodo: "MERCADOPAGO" }).eq("id", idTurno);

    const site = req.nextUrl.origin;
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            title: `Seña - ${turno.servicio?.nombre ?? "Maquillaje"} (Turno #${turno.id})`,
            quantity: 1,
            unit_price: Number(turno.sena_monto),
            currency_id: "ARS",
          },
        ],
        external_reference: String(turno.id),
        back_urls: {
          success: `${site}/reserva/${turno.id}`,
          pending: `${site}/reserva/${turno.id}`,
          failure: `${site}/reserva/${turno.id}`,
        },
        auto_return: "approved",
        notification_url: `${site}/api/pago/webhook`,
      }),
    });
    const j = (await r.json()) as { init_point?: string; message?: string };
    if (!r.ok || !j.init_point) {
      return responder(502, "No pudimos iniciar el pago con Mercado Pago.", undefined);
    }

    return responder(200, "", j.init_point);
  } catch (e) {
    return responder(500, e instanceof Error ? e.message : "Error interno.", undefined);
  }
}
