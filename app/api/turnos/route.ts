import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { liberarVencidos } from "@/lib/turnos";
import { avisar } from "@/lib/mail";
import { calcularSlots, aISO } from "@/lib/agenda";
import { pesos } from "@/lib/config";

type Servicio = {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: number;
  sena_monto: number;
};

type Cuerpo = {
  id_servicio?: number;
  fecha?: string;
  hora?: string;
  nombre?: string;
  telefono?: string;
  instagram?: string;
  notas?: string;
};

/** POST /api/turnos: crea la reserva y bloquea el horario ( estado PENDIENTE ). */
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => ({}))) as Cuerpo;
    const nombre = (b.nombre ?? "").trim();
    const telefono = (b.telefono ?? "").trim();
    const fecha = (b.fecha ?? "").trim();
    const hora = (b.hora ?? "").trim();

    if (!nombre || !telefono || !fecha || !hora) {
      return NextResponse.json({ error: "Falta completar datos de la reserva." }, { status: 400 });
    }
    if (nombre.length > 120 || telefono.length > 40) {
      return NextResponse.json({ error: "Datos demasiado largos." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
      return NextResponse.json({ error: "Fecha u horario inválido." }, { status: 400 });
    }

    const cfg = await getConfig();
    const extra = Math.max(0, Number(cfg.min_extra) || 0);
    await liberarVencidos();

    if (fecha < aISO(new Date())) {
      return NextResponse.json({ error: "Elegí una fecha futura." }, { status: 400 });
    }

    // Servicio (siempre activo): el precio y la seña salen SIEMPRE de la base.
    const { data: serv } = await sb()
      .from("servicios")
      .select("*")
      .eq("id", Number(b.id_servicio))
      .eq("activo", true)
      .maybeSingle();
    if (!serv) {
      return NextResponse.json({ error: "Ese servicio ya no está disponible." }, { status: 404 });
    }
    const servicio = serv as Servicio;

    // El horario tiene que seguir libre: lo recalculamos acá (no confiamos en el navegador).
    const diaSemana = new Date(`${fecha}T12:00:00`).getDay();
    const { data: franja } = await sb()
      .from("agenda")
      .select("desde,hasta")
      .eq("dia", diaSemana)
      .eq("activo", true)
      .maybeSingle();
    if (!franja) {
      return NextResponse.json({ error: "Ese día no atiendo. Elegí otro." }, { status: 400 });
    }

    const { data: ocupados } = await sb()
      .from("turnos")
      .select("hora,fin")
      .eq("fecha", fecha)
      .in("estado", ["PENDIENTE", "CONFIRMADO"]);

    const ahora = new Date();
    const ahoraMin = fecha === aISO(ahora) ? ahora.getHours() * 60 + ahora.getMinutes() : undefined;
    const slots = calcularSlots(franja, servicio.duracion_min, extra, ocupados ?? [], ahoraMin);
    const elegido = slots.find((s) => s.hora === hora);
    if (!elegido) {
      return NextResponse.json({ error: "Ese horario ya no está disponible. Elegí otro." }, { status: 409 });
    }

    // Crear el turno con el bloqueo de tiempo (hold).
    const holdMin = Math.max(5, Number(cfg.hold_minutos) || 60);
    const venceAt = new Date(Date.now() + holdMin * 60_000).toISOString();
    const { data: creado, error: errInsert } = await sb()
      .from("turnos")
      .insert({
        id_servicio: servicio.id,
        fecha,
        hora: elegido.hora,
        fin: elegido.fin,
        nombre,
        telefono,
        instagram: (b.instagram ?? "").trim() || null,
        notas: (b.notas ?? "").trim() || null,
        estado: "PENDIENTE",
        sena_monto: servicio.sena_monto,
        vence_at: venceAt,
      })
      .select("id")
      .single();
    if (errInsert || !creado) {
      // Doble clic / carrera: probablemente ya existe.
      return NextResponse.json(
        { error: "No pudimos guardar el turno, probá otra vez." },
        { status: 409 },
      );
    }

    const emailAdmin = cfg.email_admin;
    await avisar(
      "RESERVA_RECIBIDA",
      emailAdmin || null,
      `Nueva reserva #${creado.id}: ${servicio.nombre} — ${fecha} ${hora}`,
      [
        `Reserva #${creado.id}`,
        `Servicio: ${servicio.nombre} (${servicio.duracion_min} min)`,
        `Fecha y hora: ${fecha} de ${elegido.hora} a ${elegido.fin}`,
        `Clienta: ${nombre} · Tel: ${telefono}${b.instagram ? ` · IG: ${b.instagram}` : ""}`,
        `Total: ${pesos(servicio.precio)} · Seña: ${pesos(servicio.sena_monto)}`,
        b.notas ? `Notas: ${b.notas}` : "",
      ].filter(Boolean).join("\n"),
    );

    return NextResponse.json({ id: creado.id, fin: elegido.fin });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno." },
      { status: 500 },
    );
  }
}
