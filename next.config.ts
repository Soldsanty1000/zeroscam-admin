import type { NextConfig } from 'next';
import { resolveApiUrl, securityHeaders } from './src/lib/security';

const production = process.env.NODE_ENV === 'production';

// Si la URL de la API es insegura en producción, el build falla aquí y no
// llega un panel que mande el Bearer en claro.
const api = resolveApiUrl(
  process.env.NEXT_PUBLIC_API_URL,
  production,
  process.env.ALLOW_INSECURE_API_URL === 'true',
);

const nextConfig: NextConfig = {
  // Genera .next/standalone: un server.js mínimo para la imagen de Docker
  output: "standalone",
  // No anunciar "X-Powered-By: Next.js".
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders({ production, https: api.https }),
      },
    ];
  },
};

export default nextConfig;
