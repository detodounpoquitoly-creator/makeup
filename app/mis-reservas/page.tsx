import Link from "next/link";
import { redirect } from "next/navigation";
import { sb, configurado } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** /mis-reservas: la clienta busca su reserva con el código (SM-1024). */
export default async function MisReservas({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  if (!configurado) redirect("/");
  const { codigo } = await searchParams;
  const normalizado = (codigo ?? "").trim().toUpperCase().replace(/^SM[- ]?/, "");
  let error = "";

  if (normalizado) {
    const { data } = await sb()
      .from("turnos")
      .select("id")
      .eq("codigo", `SM-${normalizado}`)
      .maybeSingle();
    if (data) redirect(`/reserva/${data.id}`);
    error = "No encontré una reserva con ese código. Revisalo y probá otra vez.";
  }

  return (
    <main className="bk fade-in">
      <Link href="/" className="backlink">← Volver al inicio</Link>
      <h2 className="serif mt-6">Mis reservas</h2>
      <p className="sub">Poné el código que te dio la página al confirmar la reserva (ej: SM-1024).</p>

      <div className="card p-5">
        <form method="get">
          <label className="lbl" htmlFor="rv-codigo">CÓDIGO DE RESERVA</label>
          <input id="rv-codigo" name="codigo" className="input" placeholder="SM-1024" defaultValue={codigo ?? ""} />
          <button type="submit" className="btn btn-pri btn-block" style={{ marginTop: "1rem" }}>VER MI RESERVA →</button>
        </form>
        {error && <p className="status-err mt-4">{error}</p>}
      </div>
    </main>
  );
}
