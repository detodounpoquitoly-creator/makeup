import { cookies } from "next/headers";
import { createHmac } from "crypto";

/** Panel de administración: acceso con contraseña (env ADMIN_PASSWORD). */
const password = () => process.env.ADMIN_PASSWORD || "maquillaje2026";

/** Token derivado de la contraseña: si la cambian, las sesiones viejas mueren. */
const token = () =>
  createHmac("sha256", password()).update("makup-admin").digest("hex").slice(0, 32);

export const COOKIE = "makup_admin";

export async function esAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get(COOKIE)?.value === token();
}

export const valorCookie = token;
