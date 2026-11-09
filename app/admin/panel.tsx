"use client";

import { useState } from "react";
import Link from "next/link";
import type { DatosAdmin, ServicioRow, CategoriaRow, BloqueoRow, Integraciones } from "@/lib/datos-admin";

const TABS = ["Turnos", "Servicios", "Categorías", "Agenda", "Bloqueos", "Config", "Apariencias", "Documentación", "Avisos"] as const;
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
          <Link href="/" className="text-muted hover:underline">Ver sitio</Link>
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

      {/* ── Apariencias ── */}
      {tab === "Apariencias" && <Apariencias config={datos.config} guardar={guardar} />}

      {/* ── Documentación ── */}
      {tab === "Documentación" && (
        <Documentacion config={datos.config} integraciones={datos.integraciones} />
      )}

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
  | "hold_minutos" | "horas_vence_transferencia" | "min_extra"
  | "caldav_user" | "caldav_pass" | "caldav_url" | "caldav_carpeta";

const CAMPOS: { clave: ClaveConfig; etiqueta: string; area?: boolean; ayuda?: string; secreto?: boolean; grupo?: string }[] = [
  { clave: "marca", etiqueta: "Nombre corto (logo)" },
  { clave: "nombre_negocio", etiqueta: "Título de la pestaña", ayuda: "Ej: Sofy MakeUp — Reservá tu turno" },
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
  { clave: "caldav_user", etiqueta: "CalDAV — mail de iCloud", grupo: "Calendario iCloud (CalDAV)", ayuda: "El mail completo de la cuenta de iCloud." },
  { clave: "caldav_pass", etiqueta: "CalDAV — contraseña de app", grupo: "Calendario iCloud (CalDAV)", secreto: true, ayuda: "No es la contraseña normal: se crea en appleid.apple.com → Iniciar sesión y seguridad → Contraseñas de app." },
  { clave: "caldav_url", etiqueta: "CalDAV — servidor", grupo: "Calendario iCloud (CalDAV)", ayuda: "Por defecto https://caldav.icloud.com/ (cambiar solo para otro servidor CalDAV)." },
  { clave: "caldav_carpeta", etiqueta: "CalDAV — carpeta (opcional)", grupo: "Calendario iCloud (CalDAV)", ayuda: "Ej: calendar/. Si se deja vacío se detecta sola." },
];

function Configuracion({ config, guardar }: { config: Record<string, string>; guardar: GuardarFn }) {
  const [form, setForm] = useState<Record<ClaveConfig, string>>(
    Object.fromEntries(CAMPOS.map(({ clave }) => [clave, config[clave] ?? ""])) as Record<ClaveConfig, string>,
  );
  const [probando, setProbando] = useState(false);
  const [prueba, setPrueba] = useState("");

  const probarCalDAV = async () => {
    setProbando(true);
    setPrueba("");
    try {
      const g = await fetch("/api/admin/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabla: "config", datos: CAMPOS.map(({ clave }) => ({ clave, valor: form[clave] })) }),
      });
      if (!g.ok) throw new Error("No se pudo guardar antes de probar.");
      const r = await fetch("/api/admin/caldav-probar", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; carpetas?: string[] };
      if (!r.ok || !j.ok) throw new Error(j.error ?? "No se pudo conectar.");
      const carpetas = j.carpetas ?? [];
      setPrueba(carpetas.length ? `Conexión OK. Carpetas: ${carpetas.join(", ")}` : "Conexión OK.");
    } catch (e) {
      setPrueba(e instanceof Error ? e.message : String(e));
    } finally {
      setProbando(false);
    }
  };

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
        {CAMPOS.map(({ clave, etiqueta, area, ayuda, secreto, grupo }, i) => {
          const nuevoGrupo = grupo && grupo !== CAMPOS[i - 1]?.grupo;
          return (
            <div key={clave}>
              {nuevoGrupo && (
                <p className="mt-6 mb-2 border-t border-linea pt-4 text-xs tracking-widest text-muted uppercase">{grupo}</p>
              )}
              <label className="block">
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
                    type={secreto ? "password" : "text"}
                    autoComplete={secreto ? "new-password" : undefined}
                    value={form[clave]}
                    onChange={(e) => setForm((f) => ({ ...f, [clave]: e.target.value }))}
                    className="w-full rounded-xl border border-linea bg-panel px-3 py-2 text-sm outline-none focus:border-acento"
                  />
                )}
                {ayuda && <span className="mt-1 block text-xs text-muted">{ayuda}</span>}
              </label>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className="rounded-full bg-acento px-6 py-2.5 text-sm tracking-widest text-acento-fg uppercase hover:bg-acento-suave">
          Guardar configuración
        </button>
        <button
          type="button"
          onClick={probarCalDAV}
          disabled={probando}
          className="rounded-full border border-linea px-6 py-2.5 text-sm tracking-widest text-fg-suave uppercase hover:bg-chip disabled:opacity-40"
        >
          {probando ? "Probando…" : "Probar conexión iCloud"}
        </button>
      </div>
      {prueba && (
        <p className={`mt-3 rounded-xl px-4 py-2 text-sm ${prueba.startsWith("Conexión OK") ? "bg-panel text-green-700" : "bg-red-50 text-red-700"}`}>
          {prueba}
        </p>
      )}
    </form>
  );
}

/* ── Apariencias ─────────────────────────────────────────────────────────── */

type ClaveApariencia =
  | "apariencia_acento" | "apariencia_acento_suave" | "apariencia_acento_fg"
  | "apariencia_fondo" | "apariencia_panel" | "apariencia_texto"
  | "apariencia_hero_imagen" | "apariencia_sobre_imagen";

const APARIENCIA_COLORES: { clave: ClaveApariencia; etiqueta: string }[] = [
  { clave: "apariencia_acento", etiqueta: "Color principal" },
  { clave: "apariencia_acento_suave", etiqueta: "Color principal (hover)" },
  { clave: "apariencia_acento_fg", etiqueta: "Texto sobre el color principal" },
  { clave: "apariencia_fondo", etiqueta: "Fondo del sitio" },
  { clave: "apariencia_panel", etiqueta: "Fondo de secciones y chips" },
  { clave: "apariencia_texto", etiqueta: "Color del texto" },
];

const APARIENCIA_IMAGENES: { clave: ClaveApariencia; etiqueta: string; ayuda: string }[] = [
  {
    clave: "apariencia_hero_imagen",
    etiqueta: "Foto de portada",
    ayuda: "Horizontal. Ej: /fotos/portada.jpg (o una URL https).",
  },
  {
    clave: "apariencia_sobre_imagen",
    etiqueta: "Foto de Sobre mí",
    ayuda: "Vertical. Ej: /fotos/sobre-mi.jpg (o una URL https).",
  },
];

const PRESETS: { nombre: string; colores: Partial<Record<ClaveApariencia, string>> }[] = [
  {
    nombre: "Sofy",
    colores: {
      apariencia_acento: "#4b3621", apariencia_acento_suave: "#3a2a19", apariencia_acento_fg: "#ffffff",
      apariencia_fondo: "#faf8f5", apariencia_panel: "#f1ece6", apariencia_texto: "#1a1512",
    },
  },
  {
    nombre: "Rosa",
    colores: {
      apariencia_acento: "#b03a5b", apariencia_acento_suave: "#8f2c48", apariencia_acento_fg: "#ffffff",
      apariencia_fondo: "#fdf6f7", apariencia_panel: "#f7e9ec", apariencia_texto: "#2a1a1e",
    },
  },
  {
    nombre: "Negro",
    colores: {
      apariencia_acento: "#1a1512", apariencia_acento_suave: "#000000", apariencia_acento_fg: "#ffffff",
      apariencia_fondo: "#faf8f5", apariencia_panel: "#efeae4", apariencia_texto: "#1a1512",
    },
  },
  {
    nombre: "Verde",
    colores: {
      apariencia_acento: "#2f5d46", apariencia_acento_suave: "#234736", apariencia_acento_fg: "#ffffff",
      apariencia_fondo: "#f6faf7", apariencia_panel: "#e8f1ea", apariencia_texto: "#14251c",
    },
  },
  {
    nombre: "Terracota",
    colores: {
      apariencia_acento: "#a2543f", apariencia_acento_suave: "#843f2f", apariencia_acento_fg: "#ffffff",
      apariencia_fondo: "#fdf7f3", apariencia_panel: "#f6e7e1", apariencia_texto: "#2a1a15",
    },
  },
];

function Apariencias({ config, guardar }: { config: Record<string, string>; guardar: GuardarFn }) {
  const claves = [...APARIENCIA_COLORES, ...APARIENCIA_IMAGENES].map((c) => c.clave);
  const [form, setForm] = useState<Record<ClaveApariencia, string>>(
    Object.fromEntries(claves.map((clave) => [clave, config[clave] ?? ""])) as Record<ClaveApariencia, string>,
  );

  const set = (k: ClaveApariencia) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const aplicar = (colores: Partial<Record<ClaveApariencia, string>>) =>
    setForm((f) => ({ ...f, ...colores }));

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        guardar(
          { tabla: "config", datos: claves.map((clave) => ({ clave, valor: form[clave] })) },
          "Apariencia guardada",
        );
      }}
    >
      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="serif text-lg">Paletas rápidas</p>
        <p className="mt-1 text-sm text-muted">Elegí una base y después ajustá cada color.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.nombre}
              type="button"
              onClick={() => aplicar(p.colores)}
              className="flex items-center gap-2 rounded-full border border-linea bg-panel px-3 py-1.5 text-sm hover:border-acento"
            >
              <span className="flex -space-x-1">
                {[p.colores.apariencia_acento, p.colores.apariencia_fondo, p.colores.apariencia_panel].map((c, i) => (
                  <span key={i} className="h-4 w-4 rounded-full border border-white" style={{ background: c }} />
                ))}
              </span>
              {p.nombre}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="serif text-lg">Colores</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {APARIENCIA_COLORES.map(({ clave, etiqueta }) => (
            <label key={clave} className="block">
              <span className="mb-1 block text-xs tracking-widest text-muted uppercase">{etiqueta}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form[clave] || "#000000"}
                  onChange={set(clave)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-linea bg-panel"
                />
                <input value={form[clave]} onChange={set(clave)} placeholder="#4b3621" className={inputCls} />
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="serif text-lg">Fotos</p>
        <p className="mt-1 text-sm text-muted">
          Subí las fotos a <code>public/fotos/</code> y escribí la ruta, o pegá una URL.
        </p>
        <div className="mt-3 space-y-3">
          {APARIENCIA_IMAGENES.map(({ clave, etiqueta, ayuda }) => (
            <label key={clave} className="block">
              <span className="mb-1 block text-xs tracking-widest text-muted uppercase">{etiqueta}</span>
              <input value={form[clave]} onChange={set(clave)} placeholder="/fotos/portada.jpg" className={inputCls} />
              <span className="mt-1 block text-xs text-muted">{ayuda}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="serif text-lg">Vista previa</p>
        <div className="mt-3 rounded-2xl border border-linea p-5" style={{ background: form.apariencia_fondo, color: form.apariencia_texto }}>
          <p className="text-xs tracking-widest uppercase" style={{ color: form.apariencia_acento }}>
            MAQUILLADORA PROFESIONAL
          </p>
          <p className="serif mt-1 text-2xl">Así se va a ver tu sitio</p>
          <p className="mt-1 text-sm">Texto de ejemplo para probar el contraste.</p>
          <div className="mt-4 rounded-xl p-4" style={{ background: form.apariencia_panel }}>
            <span
              className="rounded-full px-4 py-1.5 text-xs tracking-widest uppercase"
              style={{ background: form.apariencia_acento, color: form.apariencia_acento_fg }}
            >
              Reservar turno
            </span>
          </div>
        </div>
      </section>

      <button type="submit" className="rounded-full bg-acento px-6 py-2.5 text-sm tracking-widest text-acento-fg uppercase hover:bg-acento-suave">
        Guardar apariencia
      </button>
    </form>
  );
}

/* ── Documentación ───────────────────────────────────────────────────────── */

type Guia = {
  id: string;
  titulo: string;
  descripcion: string;
  listo: boolean;
  donde: string;
  imagenTitulo: string;
  imagenPasos: string[];
  pasos: string[];
  nota?: string;
  enlace?: { texto: string; url: string };
};

function Documentacion({ config, integraciones }: { config: Record<string, string>; integraciones: Integraciones }) {
  const wa = (config.telefono_wa ?? "").trim();
  const waOk = wa.replace(/\D/g, "").length >= 10 && wa !== "5491100000000";

  const guias: Guia[] = [
    {
      id: "instagram",
      titulo: "Instagram",
      descripcion: "El botón de Instagram del sitio abre tu perfil.",
      listo: Boolean((config.instagram ?? "").trim()),
      donde: "Panel → Config → Instagram",
      imagenTitulo: "instagram.com/tu.usuario",
      imagenPasos: ["Abrí tu perfil", "Copiá el @usuario", "Pegalo en Config"],
      pasos: [
        "Entrá a Instagram y abrí tu perfil.",
        "Copiá tu nombre de usuario (ej: sofy.makeup), sin la @.",
        "En el panel andá a Config → Instagram, pegalo y guardá.",
        "Abrí la portada del sitio y tocá el ícono de Instagram para probar.",
      ],
      enlace: { texto: "Abrir Instagram", url: "https://instagram.com" },
    },
    {
      id: "whatsapp",
      titulo: "WhatsApp",
      descripcion: "El botón flotante y los enlaces de consulta abren tu WhatsApp.",
      listo: waOk,
      donde: "Panel → Config → WhatsApp",
      imagenTitulo: "wa.me/5491122334455",
      imagenPasos: ["Copiá tu número", "Código de país 549", "Sin + ni espacios"],
      pasos: [
        "Escribí tu número con código de país, sin +, sin espacios ni guiones (ej: 5491122334455).",
        "En el panel andá a Config → WhatsApp y pegalo.",
        "Guardá y probá el botón verde flotante del sitio.",
      ],
      nota: "El formato correcto para Argentina es 549 + código de área + número.",
    },
    {
      id: "email",
      titulo: "Email de avisos",
      descripcion: "Ahí llegan las reservas y confirmaciones.",
      listo: Boolean((config.email_admin ?? "").trim()),
      donde: "Panel → Config → Tu email",
      imagenTitulo: "reservas@tudominio.com",
      imagenPasos: ["Tu email real", "Config → Tu email", "Guardar"],
      pasos: [
        "Decidí a qué email querés que lleguen los avisos de reservas.",
        "En el panel andá a Config → Tu email, escribilo y guardá.",
        "Para que los mails salgan de verdad, activá Resend (guía más abajo).",
      ],
      nota: "Mientras Resend no esté configurado, los avisos igual quedan guardados en Panel → Avisos.",
    },
    {
      id: "alias",
      titulo: "Alias o CBU para transferencias",
      descripcion: "Se muestra en el paso de pago por transferencia.",
      listo: Boolean((config.alias_cbu ?? "").trim()),
      donde: "Panel → Config → Alias / CBU",
      imagenTitulo: "Alias / CBU",
      imagenPasos: ["Abrí tu homebanking", "Copiá alias o CBU", "Pegalo en Config"],
      pasos: [
        "Entrá a tu homebanking o app del banco.",
        "Copiá el alias o el CBU de tu cuenta.",
        "En el panel andá a Config → Alias / CBU, pegalo y guardá.",
        "Hacé una reserva de prueba y verificá que se muestre en el paso de transferencia.",
      ],
    },
    {
      id: "mercadopago",
      titulo: "Mercado Pago automático",
      descripcion: "Confirma la seña sola cuando entra el pago.",
      listo: integraciones.mercadopago,
      donde: "Vercel → Settings → Environment Variables → MP_ACCESS_TOKEN",
      imagenTitulo: "mercadopago.com.ar/developers",
      imagenPasos: ["Tus integraciones", "Credenciales de producción", "Copiar Access Token"],
      pasos: [
        "Entrá a mercadopago.com.ar/developers con tu cuenta y abrí «Tus integraciones».",
        "Creá una aplicación (o abrí la existente) y elegí el modo Producción.",
        "En «Credenciales», copiá el Access Token (no el público).",
        "En Vercel → Settings → Environment Variables agregá MP_ACCESS_TOKEN con ese valor.",
        "Hacé Redeploy y probá una reserva eligiendo Mercado Pago.",
      ],
      nota: "El monto de la seña se toma siempre de la base, nunca del navegador.",
      enlace: { texto: "Abrir panel de Mercado Pago", url: "https://www.mercadopago.com.ar/developers/panel/app" },
    },
    {
      id: "resend",
      titulo: "Mails con Resend",
      descripcion: "Envía los avisos por email en vez de solo guardarlos.",
      listo: integraciones.resend,
      donde: "Vercel → Environment Variables → RESEND_API_KEY",
      imagenTitulo: "resend.com/api-keys",
      imagenPasos: ["Crear cuenta", "Create API Key", "Copiar y cargar en Vercel"],
      pasos: [
        "Creá una cuenta en resend.com.",
        "Andá a API Keys → Create API Key y copiá la clave.",
        "En Vercel agregá RESEND_API_KEY con esa clave.",
        "Opcional: agregá RESEND_FROM con un remitente de tu dominio verificado.",
        "Hacé Redeploy. Mientras no esté, los avisos quedan en Panel → Avisos.",
      ],
      enlace: { texto: "Abrir Resend", url: "https://resend.com/api-keys" },
    },
    {
      id: "caldav",
      titulo: "Calendario iCloud (CalDAV)",
      descripcion: "Cada turno nuevo se guarda solo en tu calendario de iCloud.",
      listo: integraciones.caldav,
      donde: "Panel → Config → Calendario iCloud (CalDAV)",
      imagenTitulo: "appleid.apple.com",
      imagenPasos: ["Contraseñas de app", "Generar una nueva", "Cargar en Config"],
      pasos: [
        "Entrá a appleid.apple.com → Iniciar sesión y seguridad.",
        "En «Contraseñas de app» generá una nueva (nombre: Sofy MakeUp).",
        "En el panel, Config → CalDAV: cargá tu mail de iCloud y esa contraseña.",
        "Guardá y tocá «Probar conexión iCloud».",
      ],
      nota: "Usá la contraseña de app, no la contraseña normal de tu Apple ID.",
      enlace: { texto: "Abrir Apple ID", url: "https://appleid.apple.com/account/manage" },
    },
    {
      id: "fotos",
      titulo: "Fotos reales",
      descripcion: "Reemplazá las ilustraciones por tus trabajos.",
      listo: Boolean((config.apariencia_hero_imagen ?? "").trim() || (config.apariencia_sobre_imagen ?? "").trim()),
      donde: "Panel → Apariencias → Fotos",
      imagenTitulo: "public/fotos/",
      imagenPasos: ["Guardá la foto", "Escribí la ruta", "Guardá en Apariencias"],
      pasos: [
        "Guardá las fotos en la carpeta public/fotos/ del proyecto.",
        "En el panel andá a Apariencias → Fotos y escribí la ruta (ej: /fotos/portada.jpg).",
        "Para las fotos de servicios, usá Servicios → Imagen.",
        "Guardá y mirá la portada para confirmar que se ven bien.",
      ],
      nota: "Portada: foto horizontal. Sobre mí: foto vertical. Servicios: cuadrada o vertical.",
    },
    {
      id: "supabase",
      titulo: "Base de datos (Supabase)",
      descripcion: "Guarda turnos, servicios, config y avisos.",
      listo: integraciones.supabase,
      donde: "Vercel → Environment Variables → NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY",
      imagenTitulo: "supabase.com",
      imagenPasos: ["Crear proyecto", "SQL Editor → schema.sql", "Copiar claves a Vercel"],
      pasos: [
        "Creá un proyecto en supabase.com.",
        "En SQL Editor pegá y ejecutá supabase/schema.sql.",
        "En Project Settings → API copiá la URL y la service_role key.",
        "Cargalas en Vercel como NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
        "Hacé Redeploy.",
      ],
      enlace: { texto: "Abrir Supabase", url: "https://supabase.com" },
    },
  ];

  const listos = guias.filter((g) => g.listo).length;
  const progreso = Math.round((listos / guias.length) * 100);

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="serif text-lg">Documentación y pendientes</p>
        <p className="mt-1 text-sm text-muted">
          Guías paso a paso para terminar de configurar el sitio. Las que ya están listas se marcan en verde.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-chip">
            <div className="h-full rounded-full bg-acento" style={{ width: `${progreso}%` }} />
          </div>
          <span className="shrink-0 text-sm text-muted">{listos} de {guias.length} listas</span>
        </div>
        <p className="mt-3 text-xs text-muted">
          También está todo detallado en <code>LEEME.md</code> y <code>README.md</code> del repositorio.
        </p>
      </div>

      {guias.map((g) => (
        <article key={g.id} className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="serif text-lg">{g.titulo}</p>
              <p className="mt-1 text-sm text-fg-suave">{g.descripcion}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] tracking-wide uppercase ${
                g.listo ? "bg-green-100 text-green-700" : "bg-chip text-fg-suave"
              }`}
            >
              {g.listo ? "Listo" : "Pendiente"}
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-linea">
            <MockupGuia titulo={g.imagenTitulo} pasos={g.imagenPasos} acento={config.apariencia_acento} />
          </div>

          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-fg-suave">
            {g.pasos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>

          <p className="mt-3 rounded-xl bg-panel px-3 py-2 text-xs text-fg-suave">
            <b>Dónde:</b> {g.donde}
          </p>
          {g.nota && <p className="mt-2 text-xs text-muted">{g.nota}</p>}
          {g.enlace && (
            <a href={g.enlace.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-acento underline">
              {g.enlace.texto} ↗
            </a>
          )}
        </article>
      ))}

      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="serif text-lg">Recomendaciones futuras</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-fg-suave">
          <li>Probar una reserva completa en una ventana de incógnito después de cada cambio.</li>
          <li>Revisar precios, señas y horarios antes de cada temporada.</li>
          <li>Hacer una copia de seguridad de Supabase una vez por mes.</li>
          <li>Verificar el dominio propio y que el sitio abra siempre con HTTPS.</li>
          <li>Activar Resend con un dominio verificado para que los mails no caigan en spam.</li>
          <li>Sumar recordatorios automáticos por WhatsApp (requiere WhatsApp Business API).</li>
          <li>Agregar una galería real de trabajos administrable desde el panel.</li>
          <li>Evaluar lista de espera y reprogramación de turnos.</li>
          <li>Medir visitas y reservas con Vercel Analytics o Google Analytics.</li>
          <li>Publicar política de privacidad y términos para el tratamiento de datos.</li>
        </ul>
      </div>
    </section>
  );
}

function MockupGuia({ titulo, pasos, acento }: { titulo: string; pasos: string[]; acento?: string }) {
  const color = acento || "#4b3621";
  return (
    <svg viewBox="0 0 480 200" role="img" aria-label={`Guía: ${titulo}`} className="w-full">
      <rect width="480" height="200" fill="#ffffff" />
      <rect width="480" height="34" fill="#f1ece6" />
      <circle cx="18" cy="17" r="4" fill="#c4685f" />
      <circle cx="32" cy="17" r="4" fill="#d8b26a" />
      <circle cx="46" cy="17" r="4" fill="#7fae86" />
      <rect x="66" y="9" width="330" height="16" rx="8" fill="#ffffff" />
      <text x="78" y="21" fontSize="9" fill="#8a7e73">{titulo}</text>
      {pasos.slice(0, 3).map((p, i) => (
        <g key={p}>
          <rect x="20" y={50 + i * 46} width="440" height="38" rx="10" fill="#faf8f5" stroke="#e9e2da" />
          <circle cx="42" cy={69 + i * 46} r="12" fill={color} />
          <text x="42" y={73 + i * 46} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">{i + 1}</text>
          <text x="64" y={73 + i * 46} fontSize="11" fill="#1a1512">{p}</text>
        </g>
      ))}
    </svg>
  );
}
