import type { MetadataRoute } from "next";
import { configurado } from "@/lib/supabase";
import { getConfig, colorSeguro } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let nombre = "Maquillaje Profesional";
  let acento = "#4b3621";
  let fondo = "#faf8f5";

  if (configurado) {
    try {
      const cfg = await getConfig();
      nombre = (cfg.marca || cfg.nombre_negocio || nombre).trim() || nombre;
      acento = colorSeguro(cfg.apariencia_acento, acento);
      fondo = colorSeguro(cfg.apariencia_fondo, fondo);
    } catch {
      // Si la base no responde, el manifest queda con los valores por defecto.
    }
  }

  return {
    id: "/",
    name: `${nombre} — Turnos`,
    short_name: nombre.slice(0, 12),
    description: `Reservá tu turno de maquillaje en ${nombre}.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es",
    background_color: fondo,
    theme_color: acento,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
