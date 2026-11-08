import { sb } from "./supabase";

/**
 * Pasa los turnos PENDIENTES cuya seña venció a VENCIDO.
 * Se llama en cada lectura de disponibilidad y del panel, así el horario
 * se libera solo (sin cron).
 */
export async function liberarVencidos(): Promise<void> {
  await sb()
    .from("turnos")
    .update({ estado: "VENCIDO" })
    .eq("estado", "PENDIENTE")
    .lt("vence_at", new Date().toISOString());
}
