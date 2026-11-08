import Link from "next/link";
import { sb, configurado } from "@/lib/supabase";
import { getConfig, pesos } from "@/lib/config";
import FaltaConfig from "@/components/falta-config";

export const dynamic = "force-dynamic";

type Servicio = {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: number;
  sena_monto: number;
  imagen: string | null;
  descripcion: string | null;
};

const inicial = (nombre: string) => nombre.trim().charAt(0).toUpperCase() || "★";

export default async function Home() {
  if (!configurado) return <FaltaConfig />;

  const [cfg, { data: servicios }] = await Promise.all([
    getConfig(),
    sb().from("servicios").select("*").eq("activo", true).order("orden"),
  ]);

  const wa = (cfg.telefono_wa || "").replace(/\D/g, "");
  const waMsg = encodeURIComponent(
    `¡Hola ${cfg.nombre_negocio}! Quiero consultar por un turno de maquillaje.`,
  );

  return (
    <main>
      {/* ── Barra superior ── */}
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="serif text-xl tracking-wide">
          {cfg.nombre_negocio}
        </Link>
        <Link
          href="/reservar"
          className="rounded-full bg-acento px-5 py-2 text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave"
        >
          Reservar
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-4xl px-6 pt-10 pb-16 text-center">
        <p className="text-xs tracking-[0.3em] text-muted uppercase">Maquillaje profesional</p>
        <h1 className="serif mx-auto mt-4 max-w-xl text-4xl leading-tight sm:text-5xl">
          {cfg.texto_hero}
        </h1>
        <Link
          href="/reservar"
          className="mt-8 inline-block rounded-full bg-acento px-8 py-3 text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave"
        >
          Reservar turno
        </Link>
        {cfg.instagram ? (
          <p className="mt-4 text-sm text-muted">Instagram: {cfg.instagram}</p>
        ) : null}
      </section>

      {/* ── Servicios ── */}
      <section id="servicios" className="mx-auto max-w-2xl px-6 pb-16">
        <h2 className="serif mb-6 text-center text-2xl">Servicios</h2>
        <div className="divide-y divide-linea overflow-hidden rounded-2xl bg-card shadow-sm">
          {(servicios ?? []).map((s: Servicio) => (
            <Link
              key={s.id}
              href={`/reservar?servicio=${s.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-panel"
            >
              {s.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imagen} alt={s.nombre} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span className="serif flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-chip text-xl text-acento">
                  {inicial(s.nombre)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="serif block text-lg">{s.nombre}</span>
                <span className="block truncate text-sm text-muted">{s.descripcion}</span>
              </span>
              <span className="text-right">
                <span className="serif block text-lg">{pesos(s.precio)}</span>
                <span className="block text-xs text-muted">{s.duracion_min} min · seña {pesos(s.sena_monto)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Sobre mí ── */}
      <section className="bg-panel py-14">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="serif text-2xl">Sobre mí</h2>
          <p className="mt-4 text-fg-suave">{cfg.texto_sobre_mi}</p>
        </div>
      </section>

      {/* ── Galería (marcadores: reemplazá con fotos reales) ── */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        <h2 className="serif mb-6 text-center text-2xl">Trabajos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {["Social", "Novia", "Quinceañera", "Madrinas", "Civil", "Eventos"].map((t) => (
            <div
              key={t}
              className="serif flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-chip to-linea text-muted"
            >
              {t}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          (Imágenes de ejemplo — podés reemplazarlas con tus fotos)
        </p>
      </section>

      {/* ── Contacto ── */}
      <section id="contacto" className="mx-auto max-w-2xl px-6 pb-24 text-center">
        <h2 className="serif text-2xl">Contacto</h2>
        <p className="mt-3 text-fg-suave">
          Escribime por WhatsApp o reservá tu turno directo desde la web.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href={`https://wa.me/${wa}?text=${waMsg}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-acento px-6 py-3 text-sm tracking-widest text-acento-fg uppercase transition-colors hover:bg-acento-suave"
          >
            WhatsApp
          </a>
          <Link
            href="/reservar"
            className="rounded-full border border-linea bg-card px-6 py-3 text-sm tracking-widest uppercase transition-colors hover:bg-chip"
          >
            Reservar turno
          </Link>
        </div>
      </section>

      {/* ── Botón de WhatsApp flotante ── */}
      <a
        href={`https://wa.me/${wa}?text=${waMsg}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Escribir por WhatsApp"
        className="fixed right-5 bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-acento text-2xl text-acento-fg shadow-lg transition-transform hover:scale-105"
      >
        ✆
      </a>
    </main>
  );
}
