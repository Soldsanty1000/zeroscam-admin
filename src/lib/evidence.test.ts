import { describe, expect, it } from 'vitest';
import { EVIDENCE_PATH, matchesSignature, parseEvidence } from './evidence';

const HASH = '3f2a9c1e5b7d4e8a9c217d4e5f6a8b90';

describe('parseEvidence', () => {
  it('acepta las rutas autenticadas de jpg y pdf', () => {
    expect(parseEvidence(`/reports/12/evidence/${HASH}.jpg`)).toEqual({
      path: `/reports/12/evidence/${HASH}.jpg`,
      kind: 'image',
      name: `${HASH}.jpg`,
    });
    expect(parseEvidence(`/reports/1/evidence/${HASH}.pdf`)?.kind).toBe('pdf');
  });

  it.each([
    ['la ruta pública antigua', `/uploads/${HASH}.jpg`],
    ['un origen externo', `https://evil.test/reports/1/evidence/${HASH}.jpg`],
    ['un esquema javascript', 'javascript:alert(1)'],
    ['una ruta con ..', `/reports/1/evidence/../${HASH}.jpg`],
    ['una extensión no permitida (png)', `/reports/1/evidence/${HASH}.png`],
    ['una extensión no permitida (svg)', `/reports/1/evidence/${HASH}.svg`],
    ['un nombre que no son 32 hex', '/reports/1/evidence/abc.jpg'],
    ['un nombre con mayúsculas', `/reports/1/evidence/${HASH.toUpperCase()}.jpg`],
    ['un id que no es numérico', `/reports/uno/evidence/${HASH}.jpg`],
    ['un salto de línea al final', `/reports/1/evidence/${HASH}.jpg\n`],
    ['una cadena vacía', ''],
  ])('rechaza %s', (_caso, path) => {
    expect(parseEvidence(path)).toBeNull();
    expect(EVIDENCE_PATH.test(path)).toBe(false);
  });

  it('rechaza lo que no es texto', () => {
    expect(parseEvidence(undefined)).toBeNull();
    expect(parseEvidence(42)).toBeNull();
    expect(parseEvidence({ path: `/reports/1/evidence/${HASH}.jpg` })).toBeNull();
  });

  it('con el id del reporte, solo acepta evidencias de ese reporte', () => {
    const path = `/reports/7/evidence/${HASH}.jpg`;
    expect(parseEvidence(path, '7')).not.toBeNull();
    expect(parseEvidence(path, 7)).not.toBeNull();
    expect(parseEvidence(path, '8')).toBeNull();
    expect(parseEvidence(path, '70')).toBeNull();
  });
});

describe('matchesSignature', () => {
  it('reconoce un JPEG y un PDF por sus primeros bytes', () => {
    expect(matchesSignature('image', Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(matchesSignature('pdf', new TextEncoder().encode('%PDF-1.7'))).toBe(true);
  });

  it('rechaza un tipo que no coincide con lo que dice la extensión', () => {
    expect(matchesSignature('image', new TextEncoder().encode('<svg xmlns='))).toBe(false);
    expect(matchesSignature('image', new TextEncoder().encode('%PDF-1.7'))).toBe(false);
    expect(matchesSignature('pdf', Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(false);
    expect(matchesSignature('image', new Uint8Array())).toBe(false);
  });
});
