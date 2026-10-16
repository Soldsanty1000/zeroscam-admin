import { describe, expect, it } from 'vitest';
import { buildCsp, createNonce, resolveApiUrl, securityHeaders } from './security';

describe('resolveApiUrl', () => {
  it('en producción acepta https', () => {
    expect(resolveApiUrl('https://api.zeroscam.mx/', true)).toEqual({
      url: 'https://api.zeroscam.mx',
      origin: 'https://api.zeroscam.mx',
      https: true,
    });
  });

  it('en producción acepta http solo para localhost y 127.0.0.1', () => {
    expect(resolveApiUrl('http://localhost:3000', true).https).toBe(false);
    expect(resolveApiUrl('http://127.0.0.1:3000', true).origin).toBe('http://127.0.0.1:3000');
  });

  it('en producción rechaza http hacia otro equipo', () => {
    expect(() => resolveApiUrl('http://192.168.1.50:3000', true)).toThrow(/https/);
    expect(() => resolveApiUrl('http://api.zeroscam.mx', true)).toThrow(/https/);
    // Un nombre que solo empieza como localhost no cuenta.
    expect(() => resolveApiUrl('http://localhost.evil.test', true)).toThrow(/https/);
  });

  it('acepta http:// hacia una IP de la red solo con allowInsecure', () => {
    expect(resolveApiUrl('http://192.168.20.10:3000', true, true).origin).toBe('http://192.168.20.10:3000');
    expect(() => resolveApiUrl('http://192.168.20.10:3000', true, false)).toThrow(/https/);
  });

  it('en desarrollo acepta http', () => {
    expect(resolveApiUrl('http://192.168.1.50:3000', false).origin).toBe('http://192.168.1.50:3000');
  });

  it('sin valor usa la API local', () => {
    expect(resolveApiUrl(undefined, true).url).toBe('http://localhost:3000');
    expect(resolveApiUrl('  ', true).url).toBe('http://localhost:3000');
  });

  it('rechaza lo que no es una URL http(s) o lleva credenciales', () => {
    expect(() => resolveApiUrl('no es url', false)).toThrow();
    expect(() => resolveApiUrl('javascript:alert(1)', false)).toThrow();
    expect(() => resolveApiUrl('ftp://api.zeroscam.mx', false)).toThrow();
    expect(() => resolveApiUrl('https://user:pass@api.zeroscam.mx', true)).toThrow(/usuario/);
  });
});

describe('buildCsp', () => {
  const base = { nonce: 'abc123', apiOrigin: 'https://api.zeroscam.mx' };

  it('trae las directivas de la política pedida', () => {
    const csp = buildCsp(base);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("connect-src 'self' https://api.zeroscam.mx");
    expect(csp).toContain("img-src 'self' blob: data:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('no permite eval en producción', () => {
    expect(buildCsp(base)).not.toContain('unsafe-eval');
    expect(buildCsp({ ...base, isDev: true })).toContain("'unsafe-eval'");
  });

  it('no permite scripts en línea sin nonce', () => {
    const script = buildCsp(base)
      .split('; ')
      .find((directive) => directive.startsWith('script-src'));
    expect(script).not.toContain('unsafe-inline');
  });

  it('upgrade-insecure-requests solo si se pide', () => {
    expect(buildCsp(base)).not.toContain('upgrade-insecure-requests');
    expect(buildCsp({ ...base, upgradeInsecure: true })).toContain('upgrade-insecure-requests');
  });
});

describe('createNonce', () => {
  it('genera un valor distinto cada vez, en base64', () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe('securityHeaders', () => {
  const find = (headers: { key: string; value: string }[], key: string) => headers.find((h) => h.key === key)?.value;

  it('manda las cabeceras fijas', () => {
    const headers = securityHeaders({ production: true, https: true });
    expect(find(headers, 'X-Frame-Options')).toBe('DENY');
    expect(find(headers, 'X-Content-Type-Options')).toBe('nosniff');
    expect(find(headers, 'Referrer-Policy')).toBe('no-referrer');
    expect(find(headers, 'Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(find(headers, 'Permissions-Policy')).toContain('camera=()');
  });

  it('HSTS solo en producción y con https', () => {
    expect(find(securityHeaders({ production: true, https: true }), 'Strict-Transport-Security')).toContain('max-age=');
    expect(find(securityHeaders({ production: true, https: false }), 'Strict-Transport-Security')).toBeUndefined();
    expect(find(securityHeaders({ production: false, https: true }), 'Strict-Transport-Security')).toBeUndefined();
  });
});
