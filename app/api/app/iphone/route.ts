import { NextResponse, type NextRequest } from "next/server";
import { configurado } from "@/lib/supabase";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

function escapar(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Dominio público del sitio (ORIGEN en Vercel, o el host del pedido). */
function origen(req: NextRequest) {
  const env = (process.env.ORIGEN || "").trim().replace(/\/+$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

/**
 * GET /api/app/iphone
 * Descarga un perfil de iOS (Web Clip) que agrega el sitio a la pantalla de inicio.
 */
export async function GET(req: NextRequest) {
  let nombre = "Maquillaje";
  if (configurado) {
    try {
      const cfg = await getConfig();
      nombre = (cfg.marca || cfg.nombre_negocio || nombre).trim() || nombre;
    } catch {
      // Sin base, usamos el nombre genérico.
    }
  }

  const sitio = origen(req);
  const etiqueta = escapar(nombre);
  const url = escapar(sitio);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.makup.webclip</string>
      <key>PayloadUUID</key>
      <string>6F2A1C7E-3B4D-4E8A-9C10-1A2B3C4D5E6F</string>
      <key>PayloadDisplayName</key>
      <string>${etiqueta}</string>
      <key>URL</key>
      <string>${url}</string>
      <key>Label</key>
      <string>${etiqueta}</string>
      <key>FullScreen</key>
      <true/>
      <key>IsRemovable</key>
      <true/>
      <key>IgnoreManifestScope</key>
      <true/>
    </dict>
  </array>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadIdentifier</key>
  <string>com.makup.webclip.profile</string>
  <key>PayloadUUID</key>
  <string>9D8E7F60-5A4B-4C3D-8E2F-0A1B2C3D4E5F</string>
  <key>PayloadDisplayName</key>
  <string>App ${etiqueta} (iPhone)</string>
  <key>PayloadDescription</key>
  <string>Agrega ${etiqueta} a la pantalla de inicio como una app.</string>
  <key>PayloadOrganization</key>
  <string>${etiqueta}</string>
</dict>
</plist>
`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/x-apple-aspen-config; charset=utf-8",
      "Content-Disposition": 'attachment; filename="app-maquillaje.mobileconfig"',
      "Cache-Control": "no-store",
    },
  });
}
