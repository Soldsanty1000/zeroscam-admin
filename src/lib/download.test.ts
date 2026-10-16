import { describe, expect, it } from 'vitest';
import { exportFileName } from './download';

describe('exportFileName', () => {
  it('deja intacto un folio normal', () => {
    expect(exportFileName('ZS-2026-000042')).toBe('ZS-2026-000042.json');
  });

  it('solo conserva [A-Za-z0-9_.-]', () => {
    const name = exportFileName('ZS 2026/../000042"; rm -rf *');
    expect(name).toMatch(/^[A-Za-z0-9_.-]+$/);
    expect(name).not.toContain('/');
    expect(name).not.toContain(' ');
    expect(name.endsWith('.json')).toBe(true);
  });

  it('no deja puntos al inicio ni rutas relativas', () => {
    expect(exportFileName('../../etc/passwd')).toBe('_.._etc_passwd.json');
    expect(exportFileName('..')).toBe('expediente.json');
    expect(exportFileName('.bashrc')).toBe('bashrc.json');
  });

  it('usa un nombre por defecto cuando no hay folio válido', () => {
    expect(exportFileName('')).toBe('expediente.json');
    expect(exportFileName(undefined)).toBe('expediente.json');
    expect(exportFileName(null)).toBe('expediente.json');
  });

  it('limita la longitud y quita caracteres de control o bidi', () => {
    expect(exportFileName('A'.repeat(500)).length).toBeLessThanOrEqual(64 + '.json'.length);
    expect(exportFileName('ZS‮-1\n')).toBe('ZS_-1_.json');
  });
});
