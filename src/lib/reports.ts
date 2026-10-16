// Reglas de la bandeja de reportes: orden, búsqueda y qué conviene atender
// primero. Son funciones puras para poder probarlas sin el navegador.

import { RISK_ORDER, folio } from './format';

export type Report = {
  id: number;
  fraudType: string;
  status: string;
  riskLevel: string;
  description: string;
  createdAt: string;
  urls?: string[];
  evidenceUrls?: string[];
};

/** Lo que agrega la vista de la app (`/community`): título, ciudad y actividad. */
export type Extra = {
  id: number;
  title: string;
  city: string;
  confirmations: number;
  comments: number;
};

/** Estados en los que un reporte todavía espera una decisión del equipo. */
export const OPEN_STATUSES: readonly string[] = ['RECIBIDO', 'EN_REVISION'];

/** Niveles de riesgo que piden revisarse antes que el resto. */
export const HIGH_RISK: readonly string[] = ['ALTO', 'MUY_ALTO'];

// ---------- Bandejas ----------

/** Un grupo de estados que se trabaja junto: lo que la persona ve como "una bandeja". */
export type Queue = { id: string; label: string; statuses: readonly string[] };

/** Bandejas de quien revisa (Administrador, Owner): agrupadas por lo que falta hacer. */
export const MODERATOR_QUEUES: readonly Queue[] = [
  { id: 'open', label: 'Por atender', statuses: ['RECIBIDO', 'EN_REVISION'] },
  { id: 'validated', label: 'Por canalizar', statuses: ['VALIDADO'] },
  { id: 'closed', label: 'Cerrados', statuses: ['CANALIZADO', 'RECHAZADO'] },
];

/** Policía solo recibe del servidor lo que ya pasó la revisión. */
export const POLICE_QUEUES: readonly Queue[] = [
  { id: 'validated', label: 'Validados', statuses: ['VALIDADO'] },
  { id: 'channeled', label: 'Canalizados', statuses: ['CANALIZADO'] },
];

/** Cuántos reportes hay en cada estado. */
export function countByStatus(reports: readonly Report[]): Record<string, number> {
  const by: Record<string, number> = {};
  for (const r of reports) by[r.status] = (by[r.status] ?? 0) + 1;
  return by;
}

// ---------- Orden ----------

export const SORTS = ['priority', 'recent', 'oldest', 'support'] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABEL: Record<Sort, string> = {
  priority: 'Prioridad: riesgo y espera',
  recent: 'Más recientes',
  oldest: 'Más antiguos',
  support: 'Más confirmados',
};

const time = (report: Report) => new Date(report.createdAt).getTime();
const riskStep = (report: Report) => RISK_ORDER.indexOf(report.riskLevel);

/** Lo más grave primero y, a igual riesgo, lo que lleva más tiempo esperando. */
const byPriority = (a: Report, b: Report) => riskStep(b) - riskStep(a) || time(a) - time(b);

/**
 * Devuelve una copia ordenada; no cambia la lista original. Fuera de
 * "prioridad", los empates se resuelven por fecha, del más reciente al más antiguo.
 */
export function sortReports(reports: readonly Report[], sort: Sort, extras: ReadonlyMap<number, Extra>): Report[] {
  const newest = (a: Report, b: Report) => time(b) - time(a);
  const copy = [...reports];
  switch (sort) {
    case 'priority':
      return copy.sort(byPriority);
    case 'oldest':
      return copy.sort((a, b) => time(a) - time(b));
    case 'support':
      return copy.sort(
        (a, b) => (extras.get(b.id)?.confirmations ?? 0) - (extras.get(a.id)?.confirmations ?? 0) || newest(a, b),
      );
    default:
      return copy.sort(newest);
  }
}

/** Reportes abiertos con riesgo alto o muy alto, en orden de prioridad. */
export function needsAttention(reports: readonly Report[]): Report[] {
  return reports.filter((r) => OPEN_STATUSES.includes(r.status) && HIGH_RISK.includes(r.riskLevel)).sort(byPriority);
}

/**
 * El reporte abierto que conviene revisar ahora: el de mayor riesgo y, a
 * igual riesgo, el que lleva más tiempo esperando.
 */
export function nextToReview(reports: readonly Report[]): Report | undefined {
  return reports.filter((r) => OPEN_STATUSES.includes(r.status)).sort(byPriority)[0];
}

/** El validado más reciente: lo último que el equipo de revisión pasó a la autoridad. */
export function latestValidated(reports: readonly Report[]): Report | undefined {
  return reports.filter((r) => r.status === 'VALIDADO').sort((a, b) => time(b) - time(a))[0];
}

/** El reporte RECIBIDO que lleva más tiempo sin que nadie lo tome. */
export function oldestUnreviewed(reports: readonly Report[]): Report | undefined {
  let oldest: Report | undefined;
  for (const report of reports) {
    if (report.status !== 'RECIBIDO') continue;
    if (!oldest || time(report) < time(oldest)) oldest = report;
  }
  return oldest;
}

/** Sin acentos y en minúsculas: "Revisión" y "revision" son la misma búsqueda. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Cada palabra de la búsqueda tiene que aparecer en algún dato del reporte. */
export function matchesQuery(report: Report, extra: Extra | undefined, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(
    [
      folio(report.id, report.createdAt),
      `#${report.id}`,
      extra?.title,
      extra?.city,
      report.fraudType,
      report.description,
      ...(report.urls ?? []),
    ].join(' '),
  );
  return words.every((word) => haystack.includes(word));
}

/** "1 archivo", "3 archivos". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
