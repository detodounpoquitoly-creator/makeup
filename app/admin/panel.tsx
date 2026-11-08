"use client";

import { useState } from "react";
import type { DatosAdmin, ServicioRow, CategoriaRow, BloqueoRow } from "@/lib/datos-admin";

const TABS = ["Turnos", "Servicios", "Categorías", "Agenda", "Bloqueos", "Config", "Avisos"] as const;
type Tab = (typeof TABS)[number];

const DIAS_NOMBRE = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ESTADO_CLASE: Record<string, string> = {
  PENDIENTE: "bg-chip text-fg",
  CONFIRMADO: "bg-acento text-acento-fg",
  VENCIDO: "bg-linea text-fg-suave",
  CANCELADO: "bg-linea text-fg-suave",
};
const ESTADO_AVISO: Record<string, string> = {
  ENVIADO: "text-green-700",
  ERROR: "text-red-700",
  PENDIENTE: "text-muted",
};
const pesos = (n: number | string | null | undefined) =>
  `$ ${Number(n ?? 0).toLocaleString("es-AR")}`;
const laFecha = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]} ${a}`;
};

export default function PanelAdmin({ inicial }: { inicial: DatosAdmin }) {
  const [datos, setDatos] = useState<DatosAdmin>(inicial);
  const [tab, setTab] = useState<Tab>("Turnos");
  const [filtro, setFiltro] = useState<string>("todos");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const recargar = async () => {
    const r = await fetch("/api/admin/datos");
    if (r.ok) setDatos((await r.json()) as DatosAdmin);
  };

  const guardar = async (cuerpo: Record<string, unknown>, mensaje: string) => {
    setError("");
    setAviso("");
    setCargando(true);
    try {
      const r = await fetch("/api/admin/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "No se pudo guardar.");
      await recargar();
      setAviso(mensaje);
      setTimeout(() => setAviso(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  };

  const salir = async () => {
    await fetch("/api/admin/salir", { method: "POST" });
    window.location.reload();
  };

  const turnosVisibles =
    filtro === "todos" ? datos.turnos : datos.turnos.filter((t) => t.estado === filtro);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-20 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="serif text-2xl">Panel — {datos.config.marca || datos.config.nombre_negocio}</h1>
        <div className="flex items-center gap-3 text-sm">
          <a href="/" className="text-muted hover:underline">Ver sitio</a>
          <button type="button" onClick={salir} className="text-muted hover:underline">Salir</button>
        </div>
      </div>

      <nav className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab === t ? "bg-acento text-acento-fg" : "bg-chip text-fg-suave hover:bg-linea"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {(error || aviso || cargando) && (
        <p className={`mt-4 rounded-xl px-4 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-panel text-fg-suave"}`}>
          {error || aviso || "Guardando…"}
        </p>
      )}

      {/* ── Turnos ── */}
      {tab === "Turnos" && (
        <section className="mt-5">
          <div className="flex flex-wrap gap-2 text-xs">
            {["todos", "PENDIENTE", "CONFIRMADO", "VENCIDO", "CANCELADO"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`rounded-full border px-3 py-1 ${filtro === f ? "border-acento bg-acento text-acento-fg" : "border-linea bg-card text-fg-suave"}`}
              >
                {f === "todos" ? "Todos" : f === "PENDIENTE" ? "Pendientes" : f === "CONFIRMADO" ? "Confirmados" : f === "VENCIDO" ? "Vencidos" : "Cancelados"}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {turnosVisibles.length === 0 && (
              <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted shadow-sm">
                No hay turnos en esta lista.
              </p>
            )}
            {turnosVisibles.map((t) => (
              <article key={t.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {laFecha(t.fecha)} · {t.hora}–{t.fin} · {t.servicio?.nombre}
                      {t.codigo ? <span className="muted ml-2">{t.codigo}</span> : null}
                    </p>
                    <p className="mt-1 text-sm text-fg-suave">
                      {t.nombre} · {t.telefono}
                      {t.instagram ? ` · ${t.instagram}` : ""}
                    </p>
                    {t.notas && <p className="mt-1 text-xs text-muted">“{t.notas}”</p>}
                    <p className="mt-1 text-xs text-muted">
                      Seña {pesos(t.sena_monto)}
                      {t.metodo ? ` · ${t.metodo === "TRANSFERENCIA" ? "transferencia" : "Mercado Pago"}` : ""}
                      {t.estado === "PENDIENTE" && t.vence_at
                        ? ` · vence ${new Date(t.vence_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] tracking-wide uppercase ${ESTADO_CLASE[t.estado] ?? "bg-chip"}`}>
                      {t.estado}
                    </span>
                    {t.estado === "PENDIENTE" && (
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          disabled={cargando}
                          onClick={() => guardar({ tabla: "turno", turno: { id: t.id, estado: "CONFIRMADO" } }, "Turno confirmado ✓")}
                          className="rounded-full bg-acento px-3 py-1 text-acento-fg hover:bg-acento-suave disabled:opacity-40"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          disabled={cargando}
                          onClick={() => guardar({ tabla: "turno", turno: { id: t.id, estado: "CANCELADO" } }, "Turno cancelado")}
                          className="rounded-full border border-linea px-3 py-1 text-fg-suave hover:bg-chip disabled:opacity-40"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Servicios ── */}
      {tab === "Servicios" && (
        <section className="mt-5 space-y-4">
          {datos.servicios.map((s) => (
            <ServicioForm key={s.id} servicio={s} categorias={datos.categorias} guardar={guardar} />
          ))}
          <ServicioForm servicio={null} categorias={datos.categorias} guardar={guardar} />
        </section>
      )}

      {/* ── Categorías ── */}
      {tab === "Categorías" && (
        <section className="mt-5 space-y-4">
          {datos.categorias.map((c) => (
            <form
              key={c.id}
              className="rounded-2xl bg-card p-4 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                guardar(
                  {
                    tabla: "categoria",
                    accion: "editar",
                    datos: { id: c.id, nombre: f.get("nombre"), tag: f.get("tag"), orden: f.get("orden") },
                  },
                  "Categoría guardada",
                );
              }}
            >
              <p className="serif text-lg">Categoría</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <input name="nombre" defaultValue={c.nombre} className={inputCls} placeholder="Nombre" required />
                <input name="tag" defaultValue={c.tag} className={`${inputCls} col-span-2`} placeholder="Frase corta para la web" />
                <input name="orden" type="number" min={0} defaultValue={c.orden} className={inputCls} placeholder="Orden" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted">
                  {datos.servicios.filter((s) => s.categoria_id === c.id).length} servicios
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => guardar({ tabla: "categoria", accion: "borrar", datos: { id: c.id } }, "Categoría borrada")}
                    className="text-sm text-muted hover:underline"
                  >
                    Borrar
                  </button>
                  <button type="submit" className="rounded-full bg-acento px-4 py-1.5 text-sm text-acento-fg hover:bg-acento-suave">
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          ))}

          <form
            className="rounded-2xl border-2 border-dashed border-linea bg-card p-4 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              guardar({ tabla: "categoria", accion: "crear", datos: { nombre: f.get("nombre"), tag: f.get("tag"), orden: f.get("orden") } }, "Categoría agregada");
              e.currentTarget.reset();
            }}
          >
            <p className="serif text-lg">Agregar categoría</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <input name="nombre" className={inputCls} placeholder="Nombre" required />
              <input name="tag" className={`${inputCls} col-span-2`} placeholder="Frase corta para la web" />
              <input name="orden" type="number" min={0} defaultValue={99} className={inputCls} placeholder="Orden" />
            </div>
            <button type="submit" className="mt-3 rounded-full bg-acento px-4 py-1.5 text-sm text-acento-fg hover:bg-acento-suave">
              Agregar
            </button>
          </form>
        </section>
      )}

      {/* ── Agenda ── */}
      {tab === "Agenda" && (
        <section className="mt-5 space-y-3">
          <p className="text-sm text-muted">
            Horarios por día (te atiende entre esas horas). Desmarcado = el día no aparece en el calendario.
          </p>
          {DIAS_NOMBRE.map((nombre, dia) => (
            <AgendaFila key={dia} dia={dia} nombre={nombre} fila={datos.agenda.find((a) => a.dia === dia) ?? null} guardar={guardar} />
          ))}
        </section>
      )}

      {/* ── Bloqueos ── */}
      {tab === "Bloqueos" && (
        <section className="mt-5 space-y-4">
          <form
            className="rounded-2xl bg-card p-4 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const fecha = String(f.get("fecha") ?? "");
              if (!fecha) return;
              guardar({ tabla: "bloqueo", accion: "crear", datos: { fecha, motivo: f.get("motivo") } }, "Fecha bloqueada");
              e.currentTarget.reset();
            }}
          >
            <p className="serif text-lg">Bloquear una fecha</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <input name="fecha" type="date" required className="rounded-xl border border-linea bg-panel px-3 py-2" />
              <input name="motivo" placeholder="Motivo (opcional)" className="flex-1 rounded-xl border border-linea bg-panel px-3 py-2" />
              <button type="submit" disabled={cargando} className="rounded-full bg-acento px-4 py-2 text-sm text-acento-fg hover:bg-acento-suave disabled:opacity-40">
                Bloquear
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {datos.bloqueos.length === 0 && (
              <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted shadow-sm">No hay fechas bloqueadas.</p>
            )}
            {datos.bloqueos.map((b: BloqueoRow) => (
              <div key={b.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-sm">
                <p>
                  <b>{laFecha(b.fecha)}</b>
                  {b.motivo ? <span className="ml-2 text-sm text-muted">{b.motivo}</span> : null}
                </p>
                <button
                  type="button"
                  disabled={cargando}
                  onClick={() => guardar({ tabla: "bloqueo", accion: "borrar", datos: { id: b.id } }, "Fecha habilitada")}
                  className="text-sm text-muted hover:underline disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Config ── */}
      {tab === "Config" && <Configuracion config={datos.config} guardar={guardar} />}

      {/* ── Avisos ── */}
      {tab === "Avisos" && (
        <section className="mt-5 space-y-2">
          <p className="text-sm text-muted">
            Mensajes de reservas y confirmaciones. Se envían por mail si Resend está configurado; si no,
            quedan guardados acá.
          </p>
          {datos.avisos.length === 0 && (
            <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted shadow-sm">Todavía no hay avisos.</p>
          )}
          {datos.avisos.map((a) => (
            <div key={a.id} className="rounded-2xl bg-card px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">{a.asunto}</p>
                <span className={`shrink-0 text-xs ${ESTADO_AVISO[a.estado] ?? "text-muted"}`}>{a.estado}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {new Date(a.creado_at).toLocaleString("es-AR")}
                {a.para ? ` · para ${a.para}` : " (sin email configurado)"}
              </p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

/* ── Subcomponentes ──────────────────────────────────────────────────────── */

type GuardarFn = (cuerpo: Record<string, unknown>, mensaje: string) => Promise<void>;

const inputCls = "rounded-xl border border-linea bg-panel px-3 py-2 text-sm outline-none focus:border-acento";

function ServicioForm({
  servicio, categorias, guardar,
}: { servicio: ServicioRow | null; categorias: CategoriaRow[]; guardar: GuardarFn }) {
  const esNuevo = servicio === null;
  const [form, setForm] = useState({
    nombre: servicio?.nombre ?? "",
    descripcion: servicio?.descripcion ?? "",
    duracion_min: String(servicio?.duracion_min ?? 60),
    precio: String(servicio?.precio ?? ""),
    sena_monto: String(servicio?.sena_monto ?? ""),
    imagen: servicio?.imagen ?? "",
    orden: String(servicio?.orden ?? 0),
    activo: servicio?.activo ?? true,
    categoria_id: String(servicio?.categoria_id ?? ""),
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string; type?: string; checked?: boolean } }) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  return (
    <form
      className={`rounded-2xl bg-card p-4 shadow-sm ${esNuevo ? "border-2 border-dashed border-linea" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        guardar(
          {
            tabla: "servicio",
            accion: esNuevo ? "crear" : "editar",
            datos: { ...form, id: servicio?.id },
          },
          esNuevo ? "Servicio agregado" : "Servicio guardado",
        );
      }}
    >
      <p className="serif text-lg">{esNuevo ? "Agregar servicio" : "Editar servicio"}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input className={inputCls} placeholder="Nombre" value={form.nombre} onChange={set("nombre")} required />
        <select className={inputCls} value={form.categoria_id} onChange={set("categoria_id")}>
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <input className={inputCls} type="number" min={15} step={5} placeholder="Duración (min)" value={form.duracion_min} onChange={set("duracion_min")} required />
        <input className={inputCls} type="number" min={0} placeholder="Precio total" value={form.precio} onChange={set("precio")} required />
        <input className={inputCls} type="number" min={0} placeholder="Seña" value={form.sena_monto} onChange={set("sena_monto")} required />
        <input className={inputCls} placeholder="Imagen (ej: /fotos/novia.jpg)" value={form.imagen} onChange={set("imagen")} />
        <input className={inputCls} type="number" min={0} placeholder="Orden" value={form.orden} onChange={set("orden")} />
        <input className={`${inputCls} col-span-2 sm:col-span-3`} placeholder="Descripción corta" value={form.descripcion} onChange={set("descripcion")} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-fg-suave">
          <input type="checkbox" checked={form.activo} onChange={set("activo")} /> Visible en la web
        </label>
        <div className="flex gap-3">
          {!esNuevo && (
            <button
              type="button"
              onClick={() => guardar({ tabla: "servicio", accion: "borrar", datos: { id: servicio!.id } }, "Servicio borrado")}
              className="text-sm text-muted hover:underline"
            >
              Borrar
            </button>
          )}
          <button type="submit" className="rounded-full bg-acento px-4 py-1.5 text-sm text-acento-fg hover:bg-acento-suave">
            {esNuevo ? "Agregar" : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}

function AgendaFila({
  dia, nombre, fila, guardar,
}: { dia: number; nombre: string; fila: { id: number; desde: string; hasta: string; activo: boolean } | null; guardar: GuardarFn }) {
  const [form, setForm] = useState({
    desde: fila?.desde ?? "10:00",
    hasta: fila?.hasta ?? "19:00",
    activo: fila?.activo ?? false,
  });
  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        guardar({ tabla: "agenda", accion: "crear", datos: { dia, ...form } }, `${nombre} guardado`);
      }}
    >
      <span className="w-24 font-medium">{nombre}</span>
      <input type="time" value={form.desde} onChange={(e) => setForm((f) => ({ ...f, desde: e.target.value }))} className={inputCls} />
      <span className="text-muted">a</span>
      <input type="time" value={form.hasta} onChange={(e) => setForm((f) => ({ ...f, hasta: e.target.value }))} className={inputCls} />
      <label className="flex items-center gap-1.5 text-sm text-fg-suave">
        <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} /> Atiende
      </label>
      <button type="submit" className="ml-auto rounded-full bg-acento px-3 py-1.5 text-xs text-acento-fg hover:bg-acento-suave">
        Guardar
      </button>
    </form>
  );
}

type ClaveConfig =
  | "marca" | "marca_sufijo" | "kicker"
  | "hero_titulo" | "hero_acento" | "hero_texto" | "hero_tag"
  | "sobre_titulo" | "sobre_p1" | "sobre_p2" | "sobre_stats"
  | "estudio_direccion" | "estudio_horarios" | "estudio_nota"
  | "instagram" | "telefono_wa" | "email_admin" | "alias_cbu"
  | "nombre_negocio"
  | "hold_minutos" | "horas_vence_transferencia" | "min_extra";

const CAMPOS: { clave: ClaveConfig; etiqueta: string; area?: boolean; ayuda?: string }[] = [
  { clave: "marca", etiqueta: "Nombre corto (logo)" },
  { clave: "marca_sufijo", etiqueta: "Sufijo del logo (ej: MAKEUP)" },
  { clave: "kicker", etiqueta: "Línea de arriba de la portada (ej: MAQUILLADORA PROFESIONAL · BUENOS AIRES)" },
  { clave: "hero_titulo", etiqueta: "Portada — título (parte 1)" },
  { clave: "hero_acento", etiqueta: "Portada — título en color (parte 2)" },
  { clave: "hero_texto", etiqueta: "Portada — texto", area: true },
  { clave: "hero_tag", etiqueta: "Portada — etiqueta de la foto (ej: LOOK NOVIA · 2026)" },
  { clave: "sobre_titulo", etiqueta: "Sobre mí — título" },
  { clave: "sobre_p1", etiqueta: "Sobre mí — párrafo 1", area: true },
  { clave: "sobre_p2", etiqueta: "Sobre mí — párrafo 2", area: true },
  { clave: "sobre_stats", etiqueta: "Sobre mí — cifras (separadas por | )", ayuda: "Ej: +150 novias|+800 looks sociales|8 años de oficio" },
  { clave: "estudio_direccion", etiqueta: "Estudio — dirección" },
  { clave: "estudio_horarios", etiqueta: "Estudio — horarios" },
  { clave: "estudio_nota", etiqueta: "Estudio — nota (ej: Con turno previo)" },
  { clave: "instagram", etiqueta: "Instagram (ej: sofy.makeup)" },
  { clave: "telefono_wa", etiqueta: "WhatsApp (formato 549…)", ayuda: "Para los botones de WhatsApp del sitio." },
  { clave: "email_admin", etiqueta: "Tu email", ayuda: "Donde llegan los avisos de reservas." },
  { clave: "alias_cbu", etiqueta: "Alias / CBU para la seña", area: true },
  { clave: "hold_minutos", etiqueta: "Minutos de bloqueo del horario (ej: 60)" },
  { clave: "horas_vence_transferencia", etiqueta: "Horas de gracia para transferencias" },
  { clave: "min_extra", etiqueta: "Minutos de recambio entre turnos" },
];

function Configuracion({ config, guardar }: { config: Record<string, string>; guardar: GuardarFn }) {
  const [form, setForm] = useState<Record<ClaveConfig, string>>(
    Object.fromEntries(CAMPOS.map(({ clave }) => [clave, config[clave] ?? ""])) as Record<ClaveConfig, string>,
  );

  return (
    <form
      className="mt-5 rounded-2xl bg-card p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        guardar(
          { tabla: "config", datos: CAMPOS.map(({ clave }) => ({ clave, valor: form[clave] })) },
          "Configuración guardada",
        );
      }}
    >
      <p className="serif text-lg">Configuración del sitio</p>
      <p className="mt-1 text-sm text-muted">Acá se edita todo lo que ve la web: portada, textos, Sobre mí y datos de contacto.</p>
      <div className="mt-4 space-y-3">
        {CAMPOS.map(({ clave, etiqueta, area, ayuda }) => (
          <label key={clave} className="block">
            <span className="mb-1 block text-xs tracking-widest text-muted uppercase">{etiqueta}</span>
            {area ? (
              <textarea
                rows={2}
                value={form[clave]}
                onChange={(e) => setForm((f) => ({ ...f, [clave]: e.target.value }))}
                className="w-full rounded-xl border border-linea bg-panel px-3 py-2 text-sm outline-none focus:border-acento"
              />
            ) : (
              <input
                value={form[clave]}
                onChange={(e) => setForm((f) => ({ ...f, [clave]: e.target.value }))}
                className="w-full rounded-xl border border-linea bg-panel px-3 py-2 text-sm outline-none focus:border-acento"
              />
            )}
            {ayuda && <span className="mt-1 block text-xs text-muted">{ayuda}</span>}
          </label>
        ))}
      </div>
      <button type="submit" className="mt-5 rounded-full bg-acento px-6 py-2.5 text-sm tracking-widest text-acento-fg uppercase hover:bg-acento-suave">
        Guardar configuración
      </button>
    </form>
  );
}
