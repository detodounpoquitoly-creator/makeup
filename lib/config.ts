import { sb } from "./supabase";

export type ConfigMap = Record<string, string>;

const defaults: ConfigMap = {
  telefono_wa: "5491100000000",
  email_admin: "",
  alias_cbu: "",
  nombre_negocio: "Maquillaje Profesional",
  instagram: "",
  texto_hero: "",
  texto_sobre_mi: "",
  marca: "Mi marca",
  marca_sufijo: "",
  kicker: "",
  hero_titulo: "",
  hero_acento: "",
  hero_texto: "",
  hero_tag: "",
  sobre_titulo: "",
  sobre_p1: "",
  sobre_p2: "",
  sobre_stats: "",
  estudio_direccion: "",
  estudio_horarios: "",
  estudio_nota: "",
  hold_minutos: "60",
  horas_vence_transferencia: "12",
  min_extra: "10",
  caldav_url: "https://caldav.icloud.com/",
  apariencia_acento: "#4b3621",
  apariencia_acento_suave: "#3a2a19",
  apariencia_acento_fg: "#ffffff",
  apariencia_fondo: "#faf8f5",
  apariencia_panel: "#f1ece6",
  apariencia_texto: "#1a1512",
  apariencia_hero_imagen: "",
  apariencia_sobre_imagen: "",
};

/** Configuración clave/valor leída de la base, con valores por defecto. */
export async function getConfig(): Promise<ConfigMap> {
  const { data, error } = await sb().from("config").select("clave,valor");
  if (error) throw new Error(`CONFIG_ERROR: ${error.message}`);
  const map = { ...defaults };
  for (const { clave, valor } of data ?? []) {
    if (valor != null && valor !== "") map[clave] = valor;
  }
  return map;
}

/** Color hex de 6 dígitos, para no inyectar CSS arbitrario desde la base. */
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const colorSeguro = (v: string | undefined, porDefecto: string): string => {
  const limpio = (v ?? "").trim();
  return COLOR_RE.test(limpio) ? limpio : porDefecto;
};

/** Variables CSS que pisan la paleta según lo elegido en Panel → Apariencias. */
export function estiloApariencia(cfg: ConfigMap): string {
  const vars: [string, string][] = [
    ["--acento", colorSeguro(cfg.apariencia_acento, "#4b3621")],
    ["--acento-suave", colorSeguro(cfg.apariencia_acento_suave, "#3a2a19")],
    ["--acento-fg", colorSeguro(cfg.apariencia_acento_fg, "#ffffff")],
    ["--bg", colorSeguro(cfg.apariencia_fondo, "#faf8f5")],
    ["--panel", colorSeguro(cfg.apariencia_panel, "#f1ece6")],
    ["--chip", colorSeguro(cfg.apariencia_panel, "#f1ece6")],
    ["--fg", colorSeguro(cfg.apariencia_texto, "#1a1512")],
  ];
  return `:root{${vars.map(([k, v]) => `${k}:${v};`).join("")}}`;
}

export const numero = (n: string | number | null | undefined) => Number(n ?? 0);

/** "$ 15.000" con separador de miles argentino. */
export const pesos = (n: string | number | null | undefined) =>
  `$ ${numero(n).toLocaleString("es-AR")}`;
