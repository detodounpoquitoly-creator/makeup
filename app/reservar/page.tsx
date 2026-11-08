import { sb, configurado } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { liberarVencidos } from "@/lib/turnos";
import FaltaConfig from "@/components/falta-config";
import FlujoReserva from "./flujo-reserva";

export const dynamic = "force-dynamic";

export type ServicioFlujo = {
  id: number;
  nombre: string;
  duracion_min: number;
  precio: number;
  sena_monto: number;
  descripcion: string | null;
  categoria_id: number | null;
};
export type CategoriaFlujo = { id: number; nombre: string; tag: string };

export default async function PaginaReservar({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  if (!configurado) return <FaltaConfig />;
  await liberarVencidos();

  const { categoria } = await searchParams;
  const [cfg, { data: categorias }, { data: servicios }] = await Promise.all([
    getConfig(),
    sb().from("categorias").select("*").order("orden"),
    sb().from("servicios").select("id,nombre,duracion_min,precio,sena_monto,descripcion,categoria_id").eq("activo", true).order("orden"),
  ]);

  return (
    <FlujoReserva
      categorias={(categorias ?? []) as CategoriaFlujo[]}
      servicios={(servicios ?? []) as ServicioFlujo[]}
      config={{
        alias_cbu: cfg.alias_cbu,
        telefono_wa: cfg.telefono_wa,
        marca: cfg.marca,
        estudio_direccion: cfg.estudio_direccion,
        estudio_horarios: cfg.estudio_horarios,
        estudio_nota: cfg.estudio_nota,
        hold_minutos: cfg.hold_minutos,
        mpActivo: Boolean(process.env.MP_ACCESS_TOKEN),
      }}
      categoriaInicial={Number(categoria) || null}
    />
  );
}
