import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin";
import { getConfig } from "@/lib/config";
import { credCalDAV, descubrir } from "@/lib/caldav";

/**
 * POST /api/admin/caldav-probar
 * Verifica la conexión iCloud/CalDAV con lo guardado en Config
 * y lista las carpetas de calendario encontradas.
 */
export async function POST() {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const config = await getConfig();
  const cred = await credCalDAV(config);
  if (!cred) {
    return NextResponse.json(
      { ok: false, error: "Falta el mail o la contraseña específica de app en la configuración." },
      { status: 400 },
    );
  }

  const r = await descubrir(cred);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error ?? "No se pudo conectar." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, carpetas: r.carpetas ?? [] });
}
