import { NextResponse, type NextRequest } from "next/server";
import { esAdmin } from "@/lib/admin";
import { sb } from "@/lib/supabase";
import { avisar } from "@/lib/mail";
import { getConfig, pesos, numero } from "@/lib/config";

type Pedido = {
  tabla?: string;
  accion?: string;
  datos?: Record<string, unknown>;
  turno?: { id?: number; estado?: string };
};

const monto = (v: unknown) => Math.max(0, numero(v as string | number));
const entero = (v: unknown, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(numero(v as string | number))));
const texto = (v: unknown) => String(v ?? "").trim().slice(0, 500);

/**
 * POST /api/admin/guardar { tabla, accion, datos }
 * Todas las mutaciones del panel pasan por acá, con sesión iniciada.
 */
export async function POST(req: NextRequest) {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { tabla, accion, datos = {}, turno } = (await req.json().catch(() => ({}))) as Pedido;
    const sbc = sb();

    // ── Configuración (una o muchas claves) ──
    if (tabla === "config") {
      const pares = Array.isArray(datos)
        ? (datos as { clave: string; valor: string }[])
        : [{ clave: texto(datos.clave), valor: texto(datos.valor) }];
      for (const { clave, valor } of pares) {
        if (!clave) continue;
        const { error } = await sbc
          .from("config")
          .upsert({ clave, valor: texto(valor) }, { onConflict: "clave" });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // ── Estado de un turno (confirmar / cancelar) ──
    if (tabla === "turno") {
      const id = Number(turno?.id);
      const estado = turno?.estado ?? "";
      if (!Number.isInteger(id) || !["CONFIRMADO", "CANCELADO"].includes(estado)) {
        return NextResponse.json({ error: "Operación inválida." }, { status: 400 });
      }

      const { data: actual } = await sbc
        .from("turnos")
        .select("id,estado,nombre,fecha,hora,sena_monto,servicio: id_servicio(nombre)")
        .eq("id", id)
        .maybeSingle() as { data: {
          id: number; estado: string; nombre: string; fecha: string; hora: string;
          sena_monto: number; servicio: { nombre: string } | null;
        } | null };
      if (!actual) return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });

      const patch: Record<string, unknown> = { estado };
      if (estado === "CONFIRMADO") patch.confirmado_at = new Date().toISOString();
      const { error } = await sbc.from("turnos").update(patch).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      const cfg = await getConfig();
      await avisar(
        estado === "CONFIRMADO" ? "TURNO_CONFIRMADO" : "TURNO_CANCELADO",
        cfg.email_admin || null,
        `Turno #${id} ${estado === "CONFIRMADO" ? "confirmado manualmente" : "cancelado"}`,
        [
          `Turno #${id}: ${actual.servicio?.nombre ?? ""} — ${actual.fecha} ${actual.hora}`,
          `Clienta: ${actual.nombre}`,
          estado === "CONFIRMADO"
            ? `Se registró el pago manual de la seña (${pesos(actual.sena_monto)}).`
            : "El horario queda libre.",
        ].join("\n"),
      );
      return NextResponse.json({ ok: true });
    }

    // ── Servicios ──
    if (tabla === "servicio") {
      const campos = {
        nombre: texto(datos.nombre),
        duracion_min: entero(datos.duracion_min, 15, 480),
        precio: monto(datos.precio),
        sena_monto: monto(datos.sena_monto),
        imagen: texto(datos.imagen) || null,
        descripcion: texto(datos.descripcion) || null,
        activo: datos.activo !== false,
        orden: entero(datos.orden, 0, 999),
      };
      if (!campos.nombre) {
        return NextResponse.json({ error: "El servicio necesita nombre." }, { status: 400 });
      }

      if (accion === "crear") {
        const { error } = await sbc.from("servicios").insert(campos);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      } else if (accion === "editar") {
        if (!Number.isInteger(Number(datos.id))) {
          return NextResponse.json({ error: "Servicio inválido." }, { status: 400 });
        }
        const { error } = await sbc.from("servicios").update(campos).eq("id", Number(datos.id));
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      } else if (accion === "borrar") {
        const { error } = await sbc.from("servicios").delete().eq("id", Number(datos.id));
        if (error) return NextResponse.json({ error: error.message }, { status: 409 });
      } else {
        return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // ── Agenda (franjas por día) ──
    if (tabla === "agenda") {
      const dia = entero(datos.dia, 0, 6);
      const desde = texto(datos.desde);
      const hasta = texto(datos.hasta);
      if (!/^\d{2}:\d{2}$/.test(desde) || !/^\d{2}:\d{2}$/.test(hasta) || desde >= hasta) {
        return NextResponse.json({ error: "Horario de agenda inválido (desde < hasta)." }, { status: 400 });
      }
      if (accion === "crear") {
        // Un solo franja por día en el panel: si ya había, la reemplazamos.
        await sbc.from("agenda").delete().eq("dia", dia);
        const { error } = await sbc.from("agenda").insert({ dia, desde, hasta, activo: datos.activo !== false });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      } else if (accion === "borrar") {
        const { error } = await sbc.from("agenda").delete().eq("id", Number(datos.id));
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      } else {
        return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // ── Bloqueos de fechas ──
    if (tabla === "bloqueo") {
      const fecha = texto(datos.fecha);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
      }
      if (accion === "crear") {
        // Si ya estaba bloqueada, actualizamos el motivo.
        const { error } = await sbc
          .from("bloqueos")
          .upsert({ fecha, motivo: texto(datos.motivo) || null }, { onConflict: "fecha" });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      } else if (accion === "borrar") {
        const { error } = await sbc.from("bloqueos").delete().eq("id", Number(datos.id));
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      } else {
        return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Tabla desconocida." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno." },
      { status: 500 },
    );
  }
}
