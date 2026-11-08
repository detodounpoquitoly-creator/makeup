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

export const numero = (n: string | number | null | undefined) => Number(n ?? 0);

/** "$ 15.000" con separador de miles argentino. */
export const pesos = (n: string | number | null | undefined) =>
  `$ ${numero(n).toLocaleString("es-AR")}`;
