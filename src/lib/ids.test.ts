import { describe, expect, it } from 'vitest';
import { isNumericId, pathWithId } from './ids';

describe('isNumericId', () => {
  it('acepta solo dígitos', () => {
    expect(isNumericId('42')).toBe(true);
    expect(isNumericId('0007')).toBe(true);
  });

  it.each(['', ' 1', '1 ', '1/../2', '1?x=1', '-1', '1.5', 'abc', '١٢', '1\n'])('rechaza %j', (value) => {
    expect(isNumericId(value)).toBe(false);
  });

  it('rechaza lo que no es texto', () => {
    expect(isNumericId(undefined)).toBe(false);
    expect(isNumericId(5)).toBe(false);
    expect(isNumericId(['1'])).toBe(false);
  });
});

describe('pathWithId', () => {
  it('codifica el id para que no cambie la ruta', () => {
    expect(pathWithId('/reports/', 5, '/status')).toBe('/reports/5/status');
    expect(pathWithId('/users/', '../admin?x=1#y')).toBe('/users/..%2Fadmin%3Fx%3D1%23y');
  });
});
