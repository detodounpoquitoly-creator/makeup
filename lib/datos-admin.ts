import { sb } from "@/lib/supabase";
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
};

export type AgendaRow = { id: number; dia: number; desde: string; hasta: string; activo: boolean };
export type BloqueoRow = { id: number; fecha: string; motivo: string | null };
export type TurnoRow = {
  id: number;
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

export type DatosAdmin = {
  servicios: ServicioRow[];
  agenda: AgendaRow[];
  bloqueos: BloqueoRow[];
  turnos: TurnoRow[];
  avisos: AvisoRow[];
  config: ConfigMap;
};

/** Todo lo que usa el panel, en una sola lectura (lo comparten la página y el API). */
export async function datosAdmin(): Promise<DatosAdmin> {
  await liberarVencidos();
  const sbc = sb();
  const [serv, ag, blo, tur, avi, cfg] = await Promise.all([
    sbc.from("servicios").select("*").order("orden"),
    sbc.from("agenda").select("*").order("dia"),
    sbc.from("bloqueos").select("*").order("fecha"),
    sbc
      .from("turnos")
      .select("id,fecha,hora,fin,nombre,telefono,instagram,notas,estado,sena_monto,metodo,vence_at,servicio: id_servicio(nombre)")
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false })
      .limit(400),
    sbc.from("avisos").select("id,tipo,para,asunto,estado,creado_at").order("creado_at", { ascending: false }).limit(100),
    getConfig(),
  ]);

  return {
    servicios: (serv.data ?? []) as ServicioRow[],
    agenda: (ag.data ?? []) as AgendaRow[],
    bloqueos: (blo.data ?? []) as BloqueoRow[],
    turnos: (tur.data ?? []) as unknown as TurnoRow[],
    avisos: (avi.data ?? []) as unknown as AvisoRow[],
    config: cfg,
  };
}
