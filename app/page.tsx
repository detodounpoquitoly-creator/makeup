import Link from "next/link";
import { sb, configurado } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import FaltaConfig from "@/components/falta-config";
import { Arte } from "@/components/arte";
import { flecha, reloj, pin, calIcono, IconoWa, icoIg, icoMail } from "@/components/iconos";

export const dynamic = "force-dynamic";

type Categoria = { id: number; nombre: string; tag: string };
type ServicioMin = { id: number; categoria_id: number | null };

const TRABAJOS = [
  { id: "w1", label: "Social", sub: "Look glow · evento en Palermo", hues: ["#3e2b22", "#8a5a44", "#ddb9a3"] },
  { id: "w2", label: "Novias", sub: "Look natural · civil en San Isidro", hues: ["#2b2320", "#6e4a3a", "#c9a08c"] },
  { id: "w3", label: "Recreando: Madelyn Cline", sub: "Editorial eyes", hues: ["#40241e", "#96543f", "#e3b49b"] },
  { id: "w4", label: "Quinceañeras", sub: "Luminosa · fiesta en Recoleta", hues: ["#241e1b", "#54423a", "#b59a88"] },
  { id: "w5", label: "Editorial", sub: "Bronce & gloss", hues: ["#2b2320", "#6e4a3a", "#c9a08c"] },
  { id: "w6", label: "Egresadas", sub: "Smokey suave · 12 h de baile", hues: ["#3e2b22", "#8a5a44", "#ddb9a3"] },
];

export default async function Home() {
  if (!configurado) return <FaltaConfig />;

  const [cfg, { data: categorias }, { data: servicios }] = await Promise.all([
    getConfig(),
    sb().from("categorias").select("*").order("orden"),
    sb().from("servicios").select("id,categoria_id").eq("activo", true),
  ]);

  const wa = (cfg.telefono_wa || "").replace(/\D/g, "");
  const waMsg = encodeURIComponent(
    `¡Hola ${cfg.marca}! Quiero consultar por un turno de maquillaje.`,
  );
  const stats = (cfg.sobre_stats || "").split("|").filter(Boolean);
  const porCategoria = new Map<number, number>();
  for (const s of (servicios ?? []) as ServicioMin[]) {
    if (s.categoria_id) porCategoria.set(s.categoria_id, (porCategoria.get(s.categoria_id) ?? 0) + 1);
  }

  return (
    <>
      {/* ── Encabezado fijo ── */}
      <header className="top">
        <div className="wrap">
          <div className="topbar">
            <Link href="/" className="logo flex items-center">
              <span className="logo-n n">{cfg.marca || "Mi marca"}</span>
              {cfg.marca_sufijo ? <span className="s">{cfg.marca_sufijo}</span> : null}
            </Link>
            <div className="topbtns">
              <Link href="/reservar" className="btn btn-pri btn-sm only-desktop">RESERVAR {flecha}</Link>
            </div>
          </div>
          <nav className="nav">
            <a href="#servicios">SERVICIOS</a>
            <a href="#trabajos">TRABAJOS</a>
            <a href="#sobre">SOBRE MÍ</a>
            <a href="#contacto">CONTACTO</a>
            <Link href="/mis-reservas">MIS RESERVAS</Link>
          </nav>
        </div>
      </header>

      <main className="wrap">
        {/* ── Portada ── */}
        <section className="hero">
          <div>
            <p className="kicker">{cfg.kicker}</p>
            <h1 className="serif">
              {cfg.hero_titulo}
              <br />
              <em style={{ color: "var(--acento)" }}>{cfg.hero_acento}</em>
            </h1>
            <p className="body-txt" style={{ maxWidth: "28rem", marginBottom: "1.75rem" }}>
              {cfg.hero_texto}
            </p>
            <div className="row">
              <Link href="/reservar" className="btn btn-pri">RESERVAR TURNO {flecha}</Link>
              <a href="#trabajos" className="btn btn-out">VER TRABAJOS</a>
            </div>
            <p className="muted" style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {calIcono} Agenda abierta · {cfg.estudio_horarios}
            </p>
          </div>
          <div className="hero-img">
            {cfg.apariencia_hero_imagen ? (
              <img src={cfg.apariencia_hero_imagen} alt={`${cfg.marca || "Maquillaje"} — portada`} />
            ) : (
              <Arte hues={["#3e2b22", "#8a5a44", "#ddb9a3"]} abajo={`${(cfg.marca || "").toLowerCase()} makeup`} />
            )}
            <span className="img-tag">{cfg.hero_tag}</span>
          </div>
        </section>

        {/* ── Servicios por categoría ── */}
        <section id="servicios" className="sect scroll-mt-28">
          <div className="sect-head">
            <h2 className="serif">Servicios</h2>
            <span className="muted" style={{ letterSpacing: "0.2em", fontSize: 11 }}>ELEGÍ UNA CATEGORÍA</span>
          </div>
          <div className="grid g2">
            {(categorias ?? []).map((c: Categoria) => (
              <Link
                key={c.id}
                href={`/reservar?categoria=${c.id}`}
                className="svc-card"
              >
                <div>
                  <p className="nm">{c.nombre}</p>
                  <p className="tg">{c.tag}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="muted">
                    {porCategoria.get(c.id) ?? 0} servicio{(porCategoria.get(c.id) ?? 0) !== 1 ? "s" : ""}
                  </p>
                  <p className="rs">RESERVAR {flecha}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Trabajos ── */}
        <section id="trabajos" className="sect scroll-mt-28 pb-16">
          <p className="kicker">PORTFOLIO</p>
          <h2 className="serif" style={{ fontSize: "2.4rem", marginBottom: "2rem" }}>Trabajos</h2>
          <div className="works">
            {TRABAJOS.map((t) => (
              <figure key={t.id} className="work">
                <Arte hues={t.hues} abajo={(cfg.marca || "").toLowerCase() + " makeup"} />
                <figcaption>
                  <p className="l">{t.label}</p>
                  <p className="s">{t.sub}</p>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="muted" style={{ marginTop: "1.5rem" }}>
            Subí tus fotos reales desde el panel (Apariencias y Servicios).
          </p>
        </section>

        {/* ── Sobre mí ── */}
        <section id="sobre" className="about scroll-mt-28">
          <div className="about-photo">
            {cfg.apariencia_sobre_imagen ? (
              <img src={cfg.apariencia_sobre_imagen} alt={cfg.marca || "Sobre mí"} />
            ) : (
              <Arte hues={["#2b2320", "#6e4a3a", "#c9a08c"]} abajo={(cfg.marca || "").toLowerCase()} />
            )}
          </div>
          <div>
            <p className="kicker">SOBRE MÍ</p>
            <h2 className="serif" style={{ fontSize: "2.4rem", marginBottom: "1.25rem" }}>{cfg.sobre_titulo}</h2>
            {cfg.sobre_p1 ? <p className="body-txt" style={{ marginBottom: "1rem" }}>{cfg.sobre_p1}</p> : null}
            {cfg.sobre_p2 ? <p className="body-txt" style={{ marginBottom: "2rem" }}>{cfg.sobre_p2}</p> : null}
            {stats.length > 0 && (
              <div className="stats">
                {stats.map((s) => {
                  const [n, ...resto] = s.trim().split(" ");
                  return (
                    <div key={s} className="card stat">
                      <p className="n">{n}</p>
                      <p className="l">{resto.join(" ")}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="card p-6">
              <p className="lbl flex items-center gap-2">{pin} EN EL ESTUDIO</p>
              <p className="font-semibold" style={{ color: "var(--fg)" }}>{cfg.estudio_direccion}</p>
              <p className="muted mt-1">{cfg.estudio_horarios} · {cfg.estudio_nota}</p>
            </div>
          </div>
        </section>

        {/* ── Contacto ── */}
        <section id="contacto" className="sect scroll-mt-28 pb-16">
          <p className="kicker">HABLEMOS</p>
          <h2 className="serif" style={{ fontSize: "2.4rem", marginBottom: "2rem" }}>Contacto</h2>
          <div className="ct-cards">
            <a className="ct" href={`https://wa.me/${wa}?text=${waMsg}`} target="_blank" rel="noreferrer">
              <span className="ic"><IconoWa /></span>
              <div>
                <p className="lb">WHATSAPP</p>
                <p className="dt mt-1">{cfg.telefono_wa?.startsWith("549") ? `+54 9 ${cfg.telefono_wa.slice(3)}` : cfg.telefono_wa}</p>
                <p className="muted mt-1">Respuesta en el día</p>
              </div>
            </a>
            <a className="ct" href={`https://instagram.com/${encodeURIComponent((cfg.instagram || "").replace("@", ""))}`} target="_blank" rel="noreferrer">
              <span className="ic">{icoIg}</span>
              <div>
                <p className="lb">INSTAGRAM</p>
                <p className="dt mt-1">@{(cfg.instagram || "").replace("@", "")}</p>
                <p className="muted mt-1">Looks y novedades</p>
              </div>
            </a>
            <a className="ct" href={`mailto:${cfg.email_admin}`}>
              <span className="ic">{icoMail}</span>
              <div>
                <p className="lb">EMAIL</p>
                <p className="dt mt-1">{cfg.email_admin}</p>
                <p className="muted mt-1">Presupuestos y cursos</p>
              </div>
            </a>
          </div>
          <div className="card mt-6 flex flex-wrap gap-10 p-6">
            <div>
              <p className="lbl flex items-center gap-2">{pin} ESTUDIO</p>
              <p className="font-semibold">{cfg.estudio_direccion}</p>
            </div>
            <div>
              <p className="lbl flex items-center gap-2">{reloj} HORARIOS</p>
              <p className="font-semibold">{cfg.estudio_horarios}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── WhatsApp flotante (verde) ── */}
      <a
        href={`https://wa.me/${wa}?text=${waMsg}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Escribir por WhatsApp"
        className="fab"
      >
        <IconoWa tam={28} />
      </a>
    </>
  );
}
