import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin";
import { datosAdmin } from "@/lib/datos-admin";

/** GET /api/admin/datos: todo lo que usa el panel (solo con sesión iniciada). */
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    return NextResponse.json(await datosAdmin());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno." },
      { status: 500 },
    );
  }
}
