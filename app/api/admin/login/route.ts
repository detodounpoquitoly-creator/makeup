import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, valorCookie } from "@/lib/admin";

/** POST /api/admin/login { password } → cookie de sesión del panel. */
export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const esperada = process.env.ADMIN_PASSWORD || "maquillaje2026";
  if (!password || password !== esperada) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }
  const c = await cookies();
  c.set(COOKIE, valorCookie(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.json({ ok: true });
}
