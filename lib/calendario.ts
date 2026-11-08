import { sb } from "./supabase";

/**
 * Calendario: link secreto (.ics) para Google Calendar / iPhone / iCloud
 * y helpers para los eventitos que ve la clienta.
 *
 * El "feed" se publica en /api/calendario/<clave> — su clave vive en config
 * (cal_clave) y se genera sola la primera vez que se abre el panel.
 */

export type TurnoCal = {
  id: number;
  codigo: string | null;
  fecha: string;
  hora: string;
  fin: string | null;
  nombre: string;
  telefono: string | null;
  estado: string;
  sena_monto: number;
  servicio: { nombre: string; precio: number; duracion_min: number } | null;
};

/** Clave secreta del feed: la crea si no existe. */
export async function claveFeed(): Promise<string> {
  const { data } = await sb().from("config").select("valor").eq("clave", "cal_clave").maybeSingle() as {
    data: { valor: string } | null;
  };
  if (data?.valor) return data.valor;

  // 32 caracteres seguros para URL
  const clave = Array.from({ length: 24 }, () =>
    "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 31)],
  ).join("");
  await sb().from("config").upsert({ clave: "cal_clave", valor: clave }, { onConflict: "clave" });
  return clave;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha/hora locales (Argentina, UTC-3) → "20261108T220000Z". */
export const aUTC = (fecha: string, hora: string, deltaMin = 0): string => {
  const [a, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = (hora || "00:00").split(":").map(Number);
  return `${a}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm + deltaMin)}00Z`;
};

/** Minutos entre dos horas "HH:MM". */
export const duracionMin = (desde: string, hasta: string | null, fallback = 60): number => {
  if (!hasta) return fallback;
  const [h1, m1] = desde.split(":").map(Number);
  const [h2, m2] = hasta.split(":").map(Number);
  const d = h2 * 60 + m2 - (h1 * 60 + m1);
  return d > 0 ? d : fallback;
};

const escapeICS = (s: string) =>
  (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

/** Un evento VEVENT de una reserva. */
export function vEvento(t: TurnoCal): string {
  const serv = t.servicio;
  const dur = duracionMin(t.hora, t.fin, serv?.duracion_min ?? 60);
  const uid = `sm-${t.id}@sofymakeup.app`;
  const titulo = serv ? `${serv.nombre} — ${t.nombre}` : `Turno — ${t.nombre}`;
  const detalle = [
    `Código de reserva: ${t.codigo ?? `SM-${1000 + t.id}`}`,
    serv ? `Servicio: ${serv.nombre} (${serv.duracion_min} min)` : "",
    serv ? `Total: $ ${serv.precio.toLocaleString("es-AR")} · seña $ ${t.sena_monto.toLocaleString("es-AR")}` : "",
    t.telefono ? `Tel: ${t.telefono}` : "",
    "Sofy MakeUp — Gorriti 4521, Palermo · CABA",
  ].filter(Boolean).join(" | ");

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${aUTC(t.fecha, t.hora)}`,
    `DTEND:${aUTC(t.fecha, t.hora, dur)}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `SUMMARY:${escapeICS(titulo)}`,
    `DESCRIPTION:${escapeICS(detalle)}`,
    "LOCATION:Gorriti 4521\\, Palermo\\, CABA",
    t.estado === "PENDIENTE" ? "STATUS:TENTATIVE" : "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICS(`En 1 hora: ${titulo}`)}`,
    "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
}

/** Calendario completo. */
export function vCalendario(eventos: string[], nombre = "Reservas Sofy MakeUp"): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sofy MakeUp//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(nombre)}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
    ...eventos,
    "END:VCALENDAR",
  ].join("\r\n");
}
