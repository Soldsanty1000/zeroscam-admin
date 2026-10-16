import type { NextConfig } from "next";
import { resolveApiUrl, securityHeaders } from "./src/lib/security";

const production = process.env.NODE_ENV === "production";
const api = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

const nextConfig: NextConfig = {
  // Genera .next/standalone: un server.js mínimo para la imagen de Docker
  output: "standalone",
  // No anunciar "X-Powered-By: Next.js" (alerta de ZAP 10037).
  poweredByHeader: false,
  // X-Frame-Options, X-Content-Type-Options y demás (alertas de ZAP 10020 y 10021).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({ production, https: api.https }),
      },
    ];
  },
};

export default nextConfig;
