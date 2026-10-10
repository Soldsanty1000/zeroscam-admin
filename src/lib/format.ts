// Textos y fechas que se repiten en todas las pantallas.

export const STATUSES = [
  'RECIBIDO',
  'EN_REVISION',
  'VALIDADO',
  'RECHAZADO',
  'CANALIZADO',
] as const;
export type Status = (typeof STATUSES)[number];

export const RISK_LEVELS = ['BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO'] as const;
export const RISK_ORDER = ['NO_EVALUADO', ...RISK_LEVELS];

export const STATUS_LABEL: Record<string, string> = {
  RECIBIDO: 'Recibido',
  EN_REVISION: 'En revisión',
  VALIDADO: 'Validado',
  RECHAZADO: 'Rechazado',
  CANALIZADO: 'Canalizado',
};

export const RISK_LABEL: Record<string, string> = {
  NO_EVALUADO: 'Sin evaluar',
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  MUY_ALTO: 'Muy alto',
};

/** `MUY_ALTO` → "Muy alto"; lo que no esté en el catálogo, sin guiones bajos. */
export function label(value: string): string {
  return (
    STATUS_LABEL[value] ??
    RISK_LABEL[value] ??
    value.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
  );
}

/** Folio del expediente, igual que el del servidor: `ZS-2026-000042`. */
export function folio(id: number, createdAt?: string): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `ZS-${year}-${String(id).padStart(6, '0')}`;
}

const dateTime = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const relative = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' });

export function formatDateTime(value: string): string {
  return dateTime.format(new Date(value));
}

export function formatDate(value: string): string {
  return dateOnly.format(new Date(value));
}

/** "hace 3 horas", "ayer"; después de un mes, la fecha. */
export function timeAgo(value: string): string {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
  ];
  let amount = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(amount) < size) return relative.format(Math.round(amount), unit);
    amount /= size;
  }
  return formatDate(value);
}

/** Enlace "desactivado" para que nadie lo abra por accidente: hxxps://sitio[.]com */
export function defang(url: string): string {
  return url.replace(/^http/i, 'hxxp').replace(/\./g, '[.]');
}

export function initials(name: string, lastName = ''): string {
  return ((name[0] ?? '') + (lastName[0] ?? name[1] ?? '')).toUpperCase();
}

export const number = new Intl.NumberFormat('es-MX');
