import { describe, expect, it } from 'vitest';
import {
  countByStatus,
  latestValidated,
  matchesQuery,
  needsAttention,
  nextToReview,
  oldestUnreviewed,
  plural,
  sortReports,
  type Extra,
  type Report,
} from './reports';

const report = (id: number, status: string, riskLevel: string, createdAt: string, extra: Partial<Report> = {}): Report => ({
  id,
  fraudType: 'Phishing',
  status,
  riskLevel,
  description: '',
  createdAt,
  ...extra,
});

const a = report(1, 'RECIBIDO', 'NO_EVALUADO', '2026-10-01T10:00:00Z');
const b = report(2, 'EN_REVISION', 'ALTO', '2026-10-03T10:00:00Z');
const c = report(3, 'EN_REVISION', 'MUY_ALTO', '2026-10-02T10:00:00Z');
const d = report(4, 'VALIDADO', 'MUY_ALTO', '2026-10-04T10:00:00Z');
const e = report(5, 'RECIBIDO', 'ALTO', '2026-10-05T10:00:00Z');

const extras = new Map<number, Extra>([
  [1, { id: 1, title: 'Tienda que imita a Liverpool', city: 'Ciudad de México', confirmations: 9, comments: 0 }],
  [4, { id: 4, title: 'Correo falso', city: 'Mérida', confirmations: 30, comments: 2 }],
]);

describe('sortReports', () => {
  const all = [a, b, c, d, e];

  it('ordena del más reciente al más antiguo por defecto', () => {
    expect(sortReports(all, 'recent', extras).map((r) => r.id)).toEqual([5, 4, 2, 3, 1]);
  });

  it('ordena del más antiguo al más reciente', () => {
    expect(sortReports(all, 'oldest', extras).map((r) => r.id)).toEqual([1, 3, 2, 4, 5]);
  });

  it('por prioridad: mayor riesgo primero y, a igual riesgo, el que más espera', () => {
    expect(sortReports(all, 'priority', extras).map((r) => r.id)).toEqual([3, 4, 2, 5, 1]);
  });

  it('pone primero lo más confirmado por la comunidad', () => {
    expect(sortReports(all, 'support', extras).map((r) => r.id)).toEqual([4, 1, 5, 2, 3]);
  });

  it('no cambia la lista original', () => {
    const copy = [...all];
    sortReports(all, 'priority', extras);
    expect(all).toEqual(copy);
  });
});

describe('needsAttention', () => {
  it('solo cuenta reportes abiertos con riesgo alto o muy alto', () => {
    // d es muy alto pero ya está validado; a está abierto pero sin evaluar.
    expect(needsAttention([a, b, c, d, e]).map((r) => r.id)).toEqual([3, 2, 5]);
  });

  it('a igual riesgo, primero el que lleva más tiempo esperando', () => {
    const later = report(6, 'RECIBIDO', 'ALTO', '2026-10-09T10:00:00Z');
    expect(needsAttention([later, b]).map((r) => r.id)).toEqual([2, 6]);
  });
});

describe('nextToReview', () => {
  it('elige el abierto de mayor riesgo, aunque haya uno validado más grave', () => {
    expect(nextToReview([a, b, c, d, e])?.id).toBe(3);
  });

  it('sin riesgo evaluado, elige el que lleva más tiempo esperando', () => {
    const newer = report(7, 'RECIBIDO', 'NO_EVALUADO', '2026-10-08T10:00:00Z');
    expect(nextToReview([newer, a])?.id).toBe(1);
  });

  it('no devuelve nada si no hay reportes abiertos', () => {
    expect(nextToReview([d])).toBeUndefined();
  });
});

describe('latestValidated', () => {
  it('devuelve el validado más reciente', () => {
    const older = report(8, 'VALIDADO', 'BAJO', '2026-09-01T10:00:00Z');
    expect(latestValidated([older, d, a])?.id).toBe(4);
  });
});

describe('countByStatus', () => {
  it('cuenta los reportes de cada estado', () => {
    expect(countByStatus([a, b, c, d, e])).toEqual({ RECIBIDO: 2, EN_REVISION: 2, VALIDADO: 1 });
  });
});

describe('oldestUnreviewed', () => {
  it('devuelve el RECIBIDO más antiguo', () => {
    expect(oldestUnreviewed([e, b, a])?.id).toBe(1);
  });

  it('no devuelve nada si no hay reportes sin tomar', () => {
    expect(oldestUnreviewed([b, c, d])).toBeUndefined();
  });
});

describe('matchesQuery', () => {
  it('encuentra por título y ciudad sin importar acentos', () => {
    expect(matchesQuery(a, extras.get(1), 'liverpool mexico')).toBe(true);
    expect(matchesQuery(a, extras.get(1), 'liverpool monterrey')).toBe(false);
  });

  it('encuentra por folio', () => {
    expect(matchesQuery(a, undefined, 'ZS-2026-000001')).toBe(true);
  });

  it('una búsqueda vacía lo deja pasar todo', () => {
    expect(matchesQuery(a, undefined, '   ')).toBe(true);
  });
});

describe('plural', () => {
  it('usa singular solo para uno', () => {
    expect(plural(1, 'archivo', 'archivos')).toBe('1 archivo');
    expect(plural(0, 'archivo', 'archivos')).toBe('0 archivos');
    expect(plural(3, 'archivo', 'archivos')).toBe('3 archivos');
  });
});
