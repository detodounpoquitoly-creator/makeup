import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // La raíz del proyecto es esta carpeta (evita que Next busque arriba de acá).
  turbopack: { root: __dirname },
};

export default nextConfig;
