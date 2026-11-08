import { sb } from "./supabase";

/**
 * Registra un aviso: lo manda por mail si hay Resend configurado y siempre
 * deja una copia en la tabla `avisos` (visible en Panel → Avisos), así el
 * flujo nunca se corta aunque el mail no esté configurado todavía.
 */
export async function avisar(
  tipo: "RESERVA_RECIBIDA" | "TURNO_CONFIRMADO" | "TURNO_CANCELADO",
  para: string | null,
  asunto: string,
  cuerpo: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  let estado: "PENDIENTE" | "ENVIADO" | "ERROR" = "PENDIENTE";
  let detalle: string | null = null;

  if (key && para) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "Reservas <onboarding@resend.dev>",
          to: [para],
          subject: asunto,
          text: cuerpo,
        }),
      });
      estado = r.ok ? "ENVIADO" : "ERROR";
      if (!r.ok) detalle = (await r.text()).slice(0, 500);
    } catch (e) {
      estado = "ERROR";
      detalle = String(e).slice(0, 500);
    }
  }

  try {
    await sb().from("avisos").insert({ tipo, para, asunto, cuerpo, estado, detalle });
  } catch {
    // Si falla el registro del aviso no debe cortar la reserva.
  }
}
