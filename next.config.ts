import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor mínimo autocontenido para la imagen Docker de producción (Dockerfile).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Solo en `next dev`: arriba a la derecha para no tapar la navegación inferior.
  devIndicators: { position: "top-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
