import { NextRequest } from 'next/server';
// En esta versión la utilidad aún se llama `unstable_doesMiddlewareMatch` (la guía dice `...ProxyMatch`).
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';
import { config, proxy } from './proxy';

const get = (url: string, headers: Record<string, string> = {}) => proxy(new NextRequest(url, { headers }));

describe('proxy (CSP con nonce)', () => {
  it('pone el CSP en la respuesta y el mismo nonce en x-nonce hacia el render', () => {
    const response = get('http://localhost:3001/');
    const csp = response.headers.get('Content-Security-Policy') ?? '';
    // NextResponse.next({ request: { headers } }) deja los encabezados del render en x-middleware-request-*.
    const nonce = response.headers.get('x-middleware-request-x-nonce');
    expect(nonce).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(csp);
  });

  it('usa un nonce nuevo por petición', () => {
    const a = get('http://localhost:3001/').headers.get('x-middleware-request-x-nonce');
    const b = get('http://localhost:3001/').headers.get('x-middleware-request-x-nonce');
    expect(a).not.toBe(b);
  });

  it('permite conectar solo al propio origen y a la API, sin eval', () => {
    const csp = get('http://localhost:3001/login').headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("connect-src 'self' http://localhost:3000");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('sube a https solo si el panel llegó por https', () => {
    expect(get('http://localhost:3001/').headers.get('Content-Security-Policy')).not.toContain('upgrade-insecure-requests');
    expect(get('https://panel.zeroscam.mx/').headers.get('Content-Security-Policy')).toContain('upgrade-insecure-requests');
    expect(
      get('http://panel.zeroscam.mx/', { 'x-forwarded-proto': 'https' }).headers.get('Content-Security-Policy'),
    ).toContain('upgrade-insecure-requests');
  });

  it('corre en las páginas y no en los archivos estáticos', () => {
    const matches = (url: string) => unstable_doesMiddlewareMatch({ config, nextConfig, url });
    expect(matches('/')).toBe(true);
    expect(matches('/login')).toBe(true);
    expect(matches('/reportes/12')).toBe(true);
    expect(matches('/usuarios')).toBe(true);
    expect(matches('/_next/static/chunks/app.js')).toBe(false);
    expect(matches('/favicon.ico')).toBe(false);
    // Las precargas de next/link no necesitan CSP.
    expect(unstable_doesMiddlewareMatch({ config, nextConfig, url: '/', headers: { 'next-router-prefetch': '1' } })).toBe(false);
  });
});

describe('next.config.ts', () => {
  it('quita X-Powered-By y manda las cabeceras de seguridad en todas las rutas', async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = (await nextConfig.headers?.()) ?? [];
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');
    const keys = rules[0].headers.map((h) => h.key);
    for (const key of [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ]) {
      expect(keys).toContain(key);
    }
  });
});
