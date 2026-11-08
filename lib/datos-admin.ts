import { sb, configurado } from "@/lib/supabase";
import { getConfig, type ConfigMap } from "@/lib/config";
import { liberarVencidos } from "@/lib/turnos";

export type ServicioRow = {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: number;
  sena_monto: number;
  imagen: string | null;
  descripcion: string | null;
  activo: boolean;
  orden: number;
  categoria_id: number | null;
};

export type CategoriaRow = { id: number; nombre: string; tag: string; orden: number };

export type AgendaRow = { id: number; dia: number; desde: string; hasta: string; activo: boolean };
export type BloqueoRow = { id: number; fecha: string; motivo: string | null };
export type TurnoRow = {
  id: number;
  codigo: string | null;
  fecha: string;
  hora: string;
  fin: string;
  nombre: string;
  telefono: string;
  instagram: string | null;
  notas: string | null;
  estado: string;
  sena_monto: number;
  metodo: string | null;
  vence_at: string | null;
  servicio: { nombre: string } | null;
};
export type AvisoRow = {
  id: number;
  tipo: string;
  para: string | null;
  asunto: string;
  estado: string;
  creado_at: string;
};

export type Integraciones = {
  supabase: boolean;
  mercadopago: boolean;
  resend: boolean;
  caldav: boolean;
};

export type DatosAdmin = {
  servicios: ServicioRow[];
  categorias: CategoriaRow[];
  agenda: AgendaRow[];
  bloqueos: BloqueoRow[];
  turnos: TurnoRow[];
  avisos: AvisoRow[];
  config: ConfigMap;
  integraciones: Integraciones;
};

/** Todo lo que usa el panel, en una sola lectura (lo comparten la página y el API). */
export async function datosAdmin(): Promise<DatosAdmin> {
  await liberarVencidos();
  const sbc = sb();
  const [serv, cat, ag, blo, tur, avi, cfg] = await Promise.all([
    sbc.from("servicios").select("*").order("orden"),
    sbc.from("categorias").select("*").order("orden"),
    sbc.from("agenda").select("*").order("dia"),
    sbc.from("bloqueos").select("*").order("fecha"),
    sbc
      .from("turnos")
      .select("id,fecha,hora,fin,nombre,telefono,instagram,notas,estado,sena_monto,metodo,vence_at,codigo,servicio: id_servicio(nombre)")
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false })
      .limit(400),
    sbc.from("avisos").select("id,tipo,para,asunto,estado,creado_at").order("creado_at", { ascending: false }).limit(100),
    getConfig(),
  ]);

  return {
    servicios: (serv.data ?? []) as ServicioRow[],
    categorias: (cat.data ?? []) as unknown as CategoriaRow[],
    agenda: (ag.data ?? []) as AgendaRow[],
    bloqueos: (blo.data ?? []) as BloqueoRow[],
    turnos: (tur.data ?? []) as unknown as TurnoRow[],
    avisos: (avi.data ?? []) as unknown as AvisoRow[],
    config: cfg,
    integraciones: {
      supabase: configurado,
      mercadopago: Boolean(process.env.MP_ACCESS_TOKEN),
      resend: Boolean(process.env.RESEND_API_KEY),
      caldav: Boolean((cfg.caldav_user ?? "").trim() && (cfg.caldav_pass ?? "").trim()),
    },
  };
}
