import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE } from "@/lib/admin";

/** POST /api/admin/salir: cierra la sesión del panel. */
export async function POST() {
  const c = await cookies();
  c.delete(COOKIE);
  return NextResponse.json({ ok: true });
}
