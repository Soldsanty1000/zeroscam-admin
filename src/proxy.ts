import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCsp, createNonce, resolveApiUrl } from '@/lib/security';

// Content-Security-Policy con nonce: se genera uno nuevo por petición, se manda
// al render en `x-nonce` y Next.js lo pone en sus propios scripts. Por eso todas
// las páginas se renderizan en cada petición (ver `app/layout.tsx`).
// Guía: node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md

const isDev = process.env.NODE_ENV === 'development';
const api = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

export function proxy(request: NextRequest) {
  const nonce = createNonce();
  // Solo si el panel ya llegó por https: subir a https un panel servido por
  // http lo dejaría sin recursos.
  const secure =
    request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  const csp = buildCsp({ nonce, apiOrigin: api.origin, isDev, upgradeInsecure: secure && !isDev });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Todo salvo los archivos estáticos, que no llevan CSP.
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
