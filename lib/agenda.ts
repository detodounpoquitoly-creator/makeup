/** Herramientas de horarios: todo se calcula en minutos desde "HH:MM". */

export type Slot = { hora: string; fin: string };
export type Franja = { desde: string; hasta: string };
export type Ocupado = { hora: string; fin: string };

export const aMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const aHHMM = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Fecha local (no UTC) formateada como YYYY-MM-DD. */
export const aISO = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const hoyISO = (): string => aISO(new Date());

/**
 * Turnos posibles para una franja: arranca en `desde` y avanza de a
 * (duracion + extra) minutos, sin pasar de `hasta`, sin superponerse con
 * turnos ya tomados y, si es hoy, sin ofrecer horarios que ya pasaron.
 */
export function calcularSlots(
  franja: Franja,
  duracionMin: number,
  extraMin: number,
  ocupados: Ocupado[],
  ahoraMin?: number,
): Slot[] {
  const slots: Slot[] = [];
  const paso = duracionMin + extraMin;
  const ini = aMin(franja.desde);
  const fin = aMin(franja.hasta);
  for (let t = ini; t + duracionMin <= fin; t += paso) {
    if (ahoraMin !== undefined && t < ahoraMin) continue;
    const tFin = t + duracionMin;
    const choca = ocupados.some((o) => t < aMin(o.fin) && tFin > aMin(o.hora));
    if (choca) continue;
    slots.push({ hora: aHHMM(t), fin: aHHMM(tFin) });
  }
  return slots;
}

/** Cuántos turnos entran como máximo en una franja (para los puntos del calendario). */
export function capacidadFranja(franja: Franja, duracionMin: number, extraMin: number): number {
  const paso = duracionMin + extraMin;
  return Math.max(0, Math.floor((aMin(franja.hasta) - aMin(franja.desde)) / paso));
}
