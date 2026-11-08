/**
 * CalDAV: escribe/borra la reserva directo en el calendario de iCloud
 * (o cualquier servidor CalDAV:.mx,nextcloud,etc.) usando una
 * "contraseña específica de app" que Sofy crea en appleid.apple.com.
 *
 * Acá no hace falta OAuth: CalDAV es HTTP con usuario/clave.
 */

import type { TurnoCal } from "./calendario";
import { vEvento } from "./calendario";

type Cred = { base: string; user: string; pass: string; carpeta: string };

/** Credenciales desde config (si no está completo, no se empuja nada). */
export async function credCalDAV(config: Record<string, string>): Promise<Cred | null> {
  const user = (config.caldav_user ?? "").trim();
  const pass = (config.caldav_pass ?? "").trim();
  if (!user || !pass) return null;
  return {
    base: (config.caldav_url || "https://caldav.icloud.com/").replace(/\/?$/, "/"),
    user,
    pass,
    carpeta: (config.caldav_carpeta ?? "").trim(), // ej: "calendar/" (opcional)
  };
}

const auth = (c: Cred) => "Basic " + Buffer.from(`${c.user}:${c.pass}`).toString("base64");

const PROPFIND_PRINCIPAL = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`;

const PROPFIND_HOME = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:calendar-home-set/></d:prop></d:propfind>`;

const PROPFIND_CARPETAS = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:displayname/></d:prop></d:propfind>`;

/** Los href del XML (sirve para namespace "d:" o sin namespace). */
const hrefs = (xml: string): string[] =>
  [...xml.matchAll(/<(?:[A-Za-z0-9]+:)?href[^>]*>([^<]+)<\/(?:[A-Za-z0-9]+:)?href>/g)].map((m) => m[1]);

/**
 * Descubre la carpeta de calendario: iCloud necesita 2 saltos
 * (principal → home-set → carpetas). Devuelve la URL base de la carpeta.
 */
export async function descubrir(c: Cred): Promise<{ ok: boolean; carpeta?: string; carpetas?: string[]; error?: string }> {
  try {
    // 1. ¿quién soy?
    const r1 = await fetch(c.base, {
      method: "PROPFIND",
      headers: { Authorization: auth(c), Depth: "0", "Content-Type": "application/xml", "User-Agent": "SofyMakeUp/1.0" },
      body: PROPFIND_PRINCIPAL,
    });
    if (r1.status === 401) return { ok: false, error: "Mail o contraseña de app incorrectos." };
    if (!r1.ok) return { ok: false, error: `El servidor no respondió (código ${r1.status}).` };
    const hrefsPrincipal = hrefs(await r1.text());
    if (!hrefsPrincipal[0]) return { ok: false, error: "No pude identificar tu cuenta." };
    const urlPrincipal = new URL(hrefsPrincipal[0], c.base).toString();

    // 2. home-set
    const r2 = await fetch(urlPrincipal, {
      method: "PROPFIND",
      headers: { Authorization: auth(c), Depth: "0", "Content-Type": "application/xml", "User-Agent": "SofyMakeUp/1.0" },
      body: PROPFIND_HOME,
    });
    const principalXml = await r2.text();
    const homeRaw = hrefs(principalXml).find((h) => h.includes("calendars"));
    if (!homeRaw) return { ok: false, error: "No encontré tu calendario en la cuenta." };
    const home = new URL(homeRaw, urlPrincipal).toString();
    if (c.carpeta) {
      // Carpeta indicada en el panel: "calendar/" o la ruta completa
      const dentro = c.carpeta.startsWith("/calendars") ? c.base + c.carpeta.replace(/^\/?/, "") : home + c.carpeta.replace(/^\/?/, "");
      return { ok: true, carpeta: dentro, carpetas: [dentro] };
    }

    // 3. lista de carpetas (calendars hijos)
    const r3 = await fetch(home, {
      method: "PROPFIND",
      headers: { Authorization: auth(c), Depth: "1", "Content-Type": "application/xml", "User-Agent": "SofyMakeUp/1.0" },
      body: PROPFIND_CARPETAS,
    });
    const xml = await r3.text();
    const posibles = hrefs(xml)
      .filter((h) => h.includes("/calendars/") && !/inbox|tasks|scheduling|outbox/i.test(h))
      .map((h) => new URL(h, home).toString());
    const elegida = posibles.find((h) => h.endsWith("calendar/")) ?? posibles[0];
    if (!elegida) return { ok: false, error: "La cuenta no tiene una carpeta de calendario usable." };
    return { ok: true, carpeta: elegida, carpetas: posibles };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo conectar." };
  }
}

/** Escribe (o actualiza) el evento de un turno. No lanza error: si falla, avisa y sigue. */
export async function subir(turno: TurnoCal & { servicio: { nombre: string; duracion_min: number; precio: number } | null }): Promise<void> {
  try {
    const cfg = await import("./config").then((m) => m.getConfig());
    const c = await credCalDAV(cfg);
    if (!c) return;
    const d = await descubrir(c);
    if (!d.ok || !d.carpeta) {
      console.error("[caldav] descubrir:", d.error);
      return;
    }
    const uid = `sm-${turno.id}@sofymakeup.app`;
    await fetch(`${d.carpeta}${uid}.ics`, {
      method: "PUT",
      headers: { Authorization: auth(c), "Content-Type": "text/calendar; charset=utf-8", "User-Agent": "SofyMakeUp/1.0" },
      body: vEvento(turno),
    });
  } catch (e) {
    console.error("[caldav] upload:", e);
  }
}

/** Borra el evento (cuando se cancela o vence). */
export async function borrar(idTurno: number): Promise<void> {
  try {
    const cfg = await import("./config").then((m) => m.getConfig());
    const c = await credCalDAV(cfg);
    if (!c) return;
    const d = await descubrir(c);
    if (!d.carpeta) return;
    const uid = `sm-${idTurno}@sofymakeup.app`;
    await fetch(`${d.carpeta}${uid}.ics`, {
      method: "DELETE",
      headers: { Authorization: auth(c), "User-Agent": "SofyMakeUp/1.0" },
    });
  } catch (e) {
    console.error("[caldav] delete:", e);
  }
}
