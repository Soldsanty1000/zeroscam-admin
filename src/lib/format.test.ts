import { describe, expect, it } from 'vitest';
import { IDN_MARK, defang } from './format';

describe('defang', () => {
  it('desactiva un enlace normal', () => {
    expect(defang('https://sitio.com/pago')).toBe('hxxps://sitio[.]com/pago');
    expect(defang('http://sitio.com')).toBe('hxxp://sitio[.]com');
  });

  it('cambia TODAS las ocurrencias de http(s):// y de puntos, no solo la primera', () => {
    const out = defang('http://a.com y https://b.mx/x.php, luego HTTP://C.NET');
    expect(out).toBe('hxxp://a[.]com y hxxps://b[.]mx/x[.]php, luego hxxp://C[.]NET');
    expect(out).not.toMatch(/https?:\/\//i);
    // Ningún punto queda "vivo": todos van entre corchetes.
    expect(out.replaceAll('[.]', '')).not.toContain('.');
  });

  it('quita caracteres de control y bidi, pero conserva saltos de línea y tabuladores', () => {
    // U+202E invierte el sentido de lectura; U+200B es un espacio de ancho cero; U+0007 es un control.
    const out = defang('pa‮ypal​.com\u0007\nlinea 2\tfin');
    expect(out).toBe('paypal[.]com\nlinea 2\tfin');
  });

  it('marca dominios con caracteres no ASCII', () => {
    // La "а" es cirílica: se ve igual que la "a" latina.
    expect(defang('https://аpple.com')).toBe(`${IDN_MARK}hxxps://аpple[.]com`);
  });

  it('marca dominios en punycode', () => {
    expect(defang('xn--pple-43d.com')).toBe(`${IDN_MARK}xn--pple-43d[.]com`);
  });

  it('no marca dominios ASCII ni palabras acentuadas que no son un dominio', () => {
    expect(defang('https://sitio.com')).not.toContain(IDN_MARK);
    expect(defang('Me llamaron para una revisión')).toBe('Me llamaron para una revisión');
  });

  it('en texto libre deja el punto que cierra la oración y desactiva los de un dominio', () => {
    const out = defang('Entré a pagos.banco-falso.com. Luego me pidieron datos.\nFin.', { prose: true });
    expect(out).toBe('Entré a pagos[.]banco-falso[.]com. Luego me pidieron datos.\nFin.');
  });

  it('sin la opción prose desactiva todos los puntos', () => {
    expect(defang('a.b. c.')).toBe('a[.]b[.] c[.]');
  });
});
