import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";
import { claveFeed, vCalendario, vEvento, type TurnoCal } from "@/lib/calendario";

/**
 * GET /api/calendario/<clave>
 * Feed .ics privado con TODAS las reservas activas.
 * En Google Calendar: Otros calendarios → Suscribirse a un calendario → este URL.
 * En iPhone/iCloud/Mac: Calendarios → Add Calendar → Suscribirse a un calendario → webcal://…
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const buena = await claveFeed();
  if (clave !== buena) {
    return new NextResponse("Calendario no encontrado.", { status: 404 });
  }

  const { data } = await sb()
    .from("turnos")
    .select("id,codigo,fecha,hora,fin,nombre,telefono,estado,sena_monto,servicio: id_servicio(nombre,duracion_min,precio)")
    .in("estado", ["PENDIENTE", "CONFIRMADO"])
    .order("fecha");

  const turnos = (data ?? []) as unknown as TurnoCal[];
  const ics = vCalendario(turnos.map(vEvento));

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
