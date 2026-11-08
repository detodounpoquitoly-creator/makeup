import { configurado } from "@/lib/supabase";
import { esAdmin } from "@/lib/admin";
import { datosAdmin } from "@/lib/datos-admin";
import FaltaConfig from "@/components/falta-config";
import LoginAdmin from "./login-form";
import PanelAdmin from "./panel";

export const dynamic = "force-dynamic";

/** /admin: login con contraseña; dentro, el tablero de gestión. */
export default async function PaginaAdmin() {
  if (!configurado) return <FaltaConfig />;
  if (!(await esAdmin())) return <LoginAdmin />;
  const datos = await datosAdmin();
  return <PanelAdmin inicial={datos} />;
}
