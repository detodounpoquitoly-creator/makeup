import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maquillaje Profesional — Reservá tu turno",
  description:
    "Servicios de maquillaje profesional: social, novias, quinceañeras y más. Elegí día y horario y reservá online pagando la seña.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
