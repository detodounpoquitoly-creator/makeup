import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";
import { vCalendario, vEvento, type TurnoCal } from "@/lib/calendario";

/**
 * GET /api/evento/<id>
 * Archivo .ics de UNA reserva para que la clienta la agregue a su
 * calendario (iPhone / iCloud / Outlook / cualquier app).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return new NextResponse("Evento no encontrado.", { status: 404 });
  }

  const { data } = await sb()
    .from("turnos")
    .select("id,codigo,fecha,hora,fin,nombre,telefono,estado,sena_monto,servicio: id_servicio(nombre,duracion_min,precio)")
    .eq("id", idNum)
    .in("estado", ["PENDIENTE", "CONFIRMADO"])
    .maybeSingle();

  const turno = data as unknown as TurnoCal | null;
  if (!turno) return new NextResponse("Evento no encontrado.", { status: 404 });

  const ics = vCalendario([vEvento(turno)], "Turno Sofy MakeUp");
  const codigo = turno.codigo ?? `SM-${1000 + turno.id}`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reserva-${codigo}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
