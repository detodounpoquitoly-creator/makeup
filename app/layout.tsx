import type { Metadata } from "next";
import "./globals.css";
import { configurado } from "@/lib/supabase";
import { getConfig, estiloApariencia } from "@/lib/config";

export const metadata: Metadata = {
  title: "Maquillaje Profesional — Reservá tu turno",
  description:
    "Servicios de maquillaje profesional: social, novias, quinceañeras y más. Elegí día y horario y reservá online pagando la seña.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let estilo = "";
  if (configurado) {
    try {
      estilo = estiloApariencia(await getConfig());
    } catch {
      estilo = "";
    }
  }

  return (
    <html lang="es">
      <head>{estilo ? <style dangerouslySetInnerHTML={{ __html: estilo }} /> : null}</head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
