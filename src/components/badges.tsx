import { RISK_LABEL, RISK_ORDER, STATUS_LABEL } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_VAR: Record<string, string> = {
  RECIBIDO: 'var(--st-recibido)',
  EN_REVISION: 'var(--st-revision)',
  VALIDADO: 'var(--st-validado)',
  RECHAZADO: 'var(--st-rechazado)',
  CANALIZADO: 'var(--st-canalizado)',
  ACTIVO: 'var(--st-validado)',
  SUSPENDIDO: 'var(--st-rechazado)',
  ELIMINADA: 'var(--muted)',
};

/** Sello de estado: punto de color y texto, con el color como tinta y como lavado. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const color = STATUS_VAR[status] ?? 'var(--muted)';
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap',
        className,
      )}
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        background: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', status === 'EN_REVISION' && 'animate-pulse')}
        style={{ background: color }}
      />
      {STATUS_LABEL[status] ?? status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/**
 * Riesgo como medidor de cuatro segmentos: se lee de un vistazo en una tabla
 * y no depende solo del color (los segmentos llenos también cuentan).
 */
export function RiskMeter({
  level,
  showLabel = true,
  className,
}: {
  level: string;
  showLabel?: boolean;
  className?: string;
}) {
  const step = Math.max(0, RISK_ORDER.indexOf(level));
  const color = `var(--risk-${step})`;
  const text = RISK_LABEL[level] ?? level;
  return (
    <span
      className={cn('inline-flex items-center gap-2 whitespace-nowrap', className)}
      title={showLabel ? undefined : `Riesgo: ${text}`}
    >
      <span aria-hidden className="flex items-end gap-[3px]">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className="w-1 rounded-[1px]"
            style={{
              height: 4 + n * 3,
              background: n <= step ? color : 'color-mix(in oklab, var(--ink) 14%, transparent)',
            }}
          />
        ))}
      </span>
      <span className={cn('text-xs font-medium', !showLabel && 'sr-only')} style={{ color: step === 0 ? 'var(--muted)' : color }}>
        {text}
      </span>
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const strong = role === 'Owner' || role === 'Administrador';
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-[5px] border px-2 font-mono text-[11px] tracking-wide uppercase',
        strong
          ? 'border-ink bg-ink text-paper'
          : 'border-line-strong bg-sunk text-ink-soft',
      )}
    >
      {role === 'Policia' ? 'Policía' : role}
    </span>
  );
}
