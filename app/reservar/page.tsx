import { sb, configurado } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { liberarVencidos } from "@/lib/turnos";
import FaltaConfig from "@/components/falta-config";
import FlujoReserva from "./flujo-reserva";

export const dynamic = "force-dynamic";

export default async function PaginaReservar({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string }>;
}) {
  if (!configurado) return <FaltaConfig />;
  await liberarVencidos();

  const { servicio } = await searchParams;
  const [cfg, { data: servicios }] = await Promise.all([
    getConfig(),
    sb().from("servicios").select("*").eq("activo", true).order("orden"),
  ]);

  return (
    <FlujoReserva
      servicios={servicios ?? []}
      config={{
        alias_cbu: cfg.alias_cbu,
        telefono_wa: cfg.telefono_wa,
        hold_minutos: cfg.hold_minutos,
        mpActivo: Boolean(process.env.MP_ACCESS_TOKEN),
      }}
      servicioInicial={Number(servicio) || null}
    />
  );
}
