import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { liberarVencidos } from "@/lib/turnos";
import { calcularSlots, capacidadFranja, aISO } from "@/lib/agenda";
import type { Franja } from "@/lib/agenda";

const ACTIVOS = ["PENDIENTE", "CONFIRMADO"] as const;

/** Franjas de agenda por día de la semana (0 = domingo). */
async function agendaPorDia() {
  const { data } = await sb().from("agenda").select("dia,desde,hasta").eq("activo", true);
  const mapa = new Map<number, Franja>();
  for (const f of data ?? []) mapa.set(f.dia, f);
  return mapa;
}

/**
 * GET /api/disponibilidad?mes=2026-11&duracion=60  → { fechas: { "2026-11-12": 5 } }
 * GET /api/disponibilidad?fecha=2026-11-12&duracion=60 → { slots: [{ hora, fin }] }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const duracion = Math.max(15, Number(searchParams.get("duracion")) || 60);
    const cfg = await getConfig();
    const extra = Math.max(0, Number(cfg.min_extra) || 0);
    await liberarVencidos();

    const franjas = await agendaPorDia();
    const mes = searchParams.get("mes");
    const fecha = searchParams.get("fecha");

    // ── Resumen del mes (puntos del calendario) ──
    if (mes) {
      if (!/^\d{4}-\d{2}$/.test(mes)) {
        return NextResponse.json({ error: "Mes inválido." }, { status: 400 });
      }
      const [a, m] = mes.split("-").map(Number);
      const primero = new Date(a, m - 1, 1);
      const ultimo = new Date(a, m, 0);
      const desde = aISO(primero);
      const hasta = aISO(ultimo);

      const [turnosRes, bloqueosRes] = await Promise.all([
        sb().from("turnos").select("fecha").gte("fecha", desde).lte("fecha", hasta).in("estado", [...ACTIVOS]),
        sb().from("bloqueos").select("fecha").gte("fecha", desde).lte("fecha", hasta),
      ]);
      const ocupados = new Map<string, number>();
      for (const t of turnosRes.data ?? []) {
        ocupados.set(t.fecha, (ocupados.get(t.fecha) ?? 0) + 1);
      }
      const bloqueados = new Set((bloqueosRes.data ?? []).map((b) => b.fecha));

      const fechas: Record<string, number> = {};
      const hoy = aISO(new Date());
      for (let d = 1; d <= ultimo.getDate(); d++) {
        const dObj = new Date(a, m - 1, d);
        const iso = aISO(dObj);
        if (iso < hoy || bloqueados.has(iso) || !franjas.has(dObj.getDay())) continue;
        const libres = Math.max(
          0,
          capacidadFranja(franjas.get(dObj.getDay())!, duracion, extra) - (ocupados.get(iso) ?? 0),
        );
        if (libres > 0) fechas[iso] = libres;
      }
      return NextResponse.json({ fechas });
    }

    // ── Horarios exactos de un día ──
    if (fecha) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
      }
      const franja = franjas.get(new Date(`${fecha}T12:00:00`).getDay());
      if (!franja) return NextResponse.json({ slots: [] });

      const { data: turnos } = await sb()
        .from("turnos")
        .select("hora,fin")
        .eq("fecha", fecha)
        .in("estado", [...ACTIVOS]);

      const ahora = new Date();
      const ahoraMin = fecha === aISO(ahora) ? ahoraminutos(ahora) : undefined;
      return NextResponse.json({
        slots: calcularSlots(franja, duracion, extra, turnos ?? [], ahoraMin),
      });
    }

    return NextResponse.json({ error: "Pasá mes o fecha." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: mensaje(e) }, { status: 500 });
  }
}

const ahoraminutos = (d: Date) => d.getHours() * 60 + d.getMinutes();

const mensaje = (e: unknown) => (e instanceof Error ? e.message : "Error interno.");
