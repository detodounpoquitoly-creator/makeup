import type { Metadata, Viewport } from "next";
import "./globals.css";
import { configurado } from "@/lib/supabase";
import { getConfig, estiloApariencia } from "@/lib/config";
import RegistrarSW from "@/components/registrar-sw";

export const metadata: Metadata = {
  title: "Maquillaje Profesional — Reservá tu turno",
  description:
    "Servicios de maquillaje profesional: social, novias, quinceañeras y más. Elegí día y horario y reservá online pagando la seña.",
  applicationName: "Maquillaje Profesional",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Maquillaje",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4b3621",
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
      <body className="min-h-dvh antialiased">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
