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

/** Caracteres de control y de formato (bidi, ancho cero…) que sirven para disfrazar un enlace. */
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;
const NON_ASCII = /[^\p{ASCII}]/u;

/** Antepuesto a lo que parece un dominio con caracteres no ASCII o punycode (`xn--`). */
export const IDN_MARK = '⚠ IDN ';

/**
 * "Desactiva" los enlaces de un texto para que nadie los abra por accidente:
 * `https://sitio.com` → `hxxps://sitio[.]com`.
 *
 * Quita los caracteres de control y de formato (también los bidi, que
 * reordenan lo que se ve), cambia TODOS los `http(s)://` y todos los puntos, y
 * antepone {@link IDN_MARK} a cualquier dominio con letras no ASCII o punycode,
 * porque `аpple.com` (con una "а" cirílica) se ve igual que `apple.com`.
 *
 * @param text - Un enlace, o un texto libre que pueda traer enlaces.
 * @param options.prose - En texto libre, el punto que cierra una oración
 * (seguido de espacio o del final) se deja como está para que siga leyéndose.
 */
export function defang(text: string, { prose = false }: { prose?: boolean } = {}): string {
  return text
    .replace(INVISIBLE, (char) => (char === '\n' || char === '\t' ? char : ''))
    .replace(/http(s?):\/\//gi, 'hxxp$1://')
    .replace(/\./g, (dot, offset: number, whole: string) => {
      if (!prose) return '[.]';
      const before = whole[offset - 1];
      const after = whole[offset + 1];
      return before && after && /\S/.test(before) && /\S/.test(after) ? '[.]' : dot;
    })
    .replace(/\S+/g, (token) => {
      const looksLikeHost = token.includes('[.]') || token.includes('://');
      return looksLikeHost && (NON_ASCII.test(token) || /xn--/i.test(token)) ? IDN_MARK + token : token;
    });
}

export function initials(name: string, lastName = ''): string {
  return ((name[0] ?? '') + (lastName[0] ?? name[1] ?? '')).toUpperCase();
}

export const number = new Intl.NumberFormat('es-MX');
