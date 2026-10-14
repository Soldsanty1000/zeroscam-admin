'use client';

import { useId, useState, type ComponentProps } from 'react';
import NumberFlow from '@number-flow/react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  CircleX,
  Inbox,
  ScanSearch,
  Send,
  Table,
  ChartLine,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STATUS_VAR } from '@/components/badges';
import { Tooltip } from '@/components/ui/tooltip';
import { label as readable, number, RISK_LABEL, RISK_ORDER, STATUS_LABEL } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fillMonths, month, type Count } from './charts';

const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0);
const percent = (part: number, whole: number) => Math.round(share(part, whole) * 100);
/** "junio de 2026" → "Junio de 2026": solo la primera letra. */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/* ---------- Piezas pequeñas ---------- */

/** Barra de avance de 0 a 1 que crece una vez al aparecer. */
export function Meter({ value, color = 'var(--chart-1)', track = 'bg-ink/6', className }: {
  value: number;
  color?: string;
  track?: string;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn('block h-1.5 overflow-hidden rounded-full', track, className)}>
      <span
        className="bar block h-full origin-left rounded-full"
        style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, background: color }}
      />
    </span>
  );
}

/** Anillo de avance con la cifra al centro. */
export function Ring({ value, size = 48 }: { value: number; size?: number }) {
  const r = 15.9155;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg aria-hidden viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="color-mix(in oklab, var(--ink) 8%, transparent)" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${Math.round(value * 100)} 100`}
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <span className="tnum text-[11px] font-semibold">{Math.round(value * 100)}%</span>
    </span>
  );
}

/** Cambio contra el periodo anterior. Neutro a propósito: más reportes no es bueno ni malo por sí solo. */
export function Delta({ value }: { value: number }) {
  const Icon = value >= 0 ? ArrowUp : ArrowDown;
  return (
    <span className="tnum inline-flex h-[22px] items-center gap-0.5 rounded-md bg-ink/6 px-1.5 text-xs font-medium text-ink-2">
      <Icon aria-hidden className="size-3" />
      {value >= 0 ? '+' : '−'}
      {Math.abs(Math.round(value * 100))} %
    </span>
  );
}

/** Etiqueta pequeña de conteo o aviso en la cabecera de una sección. */
export function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'danger' }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        tone === 'neutral' && 'bg-ink/6 text-ink-2',
        tone === 'accent' && 'bg-accent-wash text-accent-ink',
        tone === 'danger' && 'bg-danger-wash text-danger',
      )}
    >
      {children}
    </span>
  );
}

/** Ícono en un recuadro teñido del color que se le pase. */
function IconChip({ icon: Icon, color, className }: { icon: LucideIcon; color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4', className)}
      style={{ color, background: `color-mix(in oklab, ${color} 13%, transparent)` }}
    >
      <Icon />
    </span>
  );
}

/* ---------- Tarjeta de cifra ---------- */

/** Una cifra principal con su ícono, una insignia opcional y lo que la explica debajo. */
export function StatCard({
  label,
  icon,
  color,
  value,
  format,
  badge,
  aside,
  children,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  /** `undefined` = cargando; `null` = no aplica todavía. */
  value: number | null | undefined;
  format?: ComponentProps<typeof NumberFlow>['format'];
  badge?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <dt className="pt-1 text-xs font-medium tracking-[0.04em] text-muted uppercase">{label}</dt>
        <IconChip icon={icon} color={color} />
      </div>
      <dd className="flex items-center justify-between gap-3">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-[28px] leading-none font-semibold tracking-[-0.03em]">
            {value === undefined ? (
              <span className="skeleton inline-block h-7 w-14 rounded-md align-middle" />
            ) : value === null ? (
              <span className="text-muted">—</span>
            ) : (
              <NumberFlow value={value} locales="es-MX" format={format} />
            )}
          </span>
          {value !== undefined && badge}
        </span>
        {value !== undefined && aside}
      </dd>
      {value !== undefined && children && <dd className="mt-auto grid gap-2 text-xs text-muted">{children}</dd>}
    </div>
  );
}

/* ---------- Sección ---------- */

export function Section({
  title,
  description,
  dot = 'var(--chart-1)',
  badge,
  actions,
  footer,
  children,
  className,
}: {
  title: string;
  description?: string;
  dot?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col rounded-xl bg-surface shadow-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5">
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: dot }} />
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
            {badge}
          </div>
          {description && <p className="text-[13px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {/* Las columnas internas dependen del ancho de la sección, no de la ventana. */}
      <div className="@container flex-1 px-5 pt-4 pb-5">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-5 py-3 text-xs text-muted">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** Los códigos (`EN_REVISION`) se vuelven texto; los nombres del catálogo se dejan como vienen. */
const display = (name: string) => (/^[A-Z0-9_]+$/.test(name) ? readable(name) : name);

const empty = <p className="py-10 text-center text-[13px] text-muted">Sin datos en este periodo.</p>;

/* ---------- Evolución por mes ---------- */

export type Insight = { title: string; body: React.ReactNode };

/**
 * La serie por mes con el mes más alto destacado (franja, punto y nota) y el
 * promedio como referencia. A un lado, la lectura de las cifras en texto.
 */
export function TrendSpotlight({
  title,
  description,
  counts,
  noun = ['reporte', 'reportes'],
  insights,
  insightsFooter,
}: {
  title: string;
  description?: string;
  counts: Count[];
  noun?: [string, string];
  insights?: Insight[];
  insightsFooter?: React.ReactNode;
}) {
  const gradient = useId();
  const [asTable, setAsTable] = useState(false);
  const series = fillMonths(counts).map((c) => ({ ...c, label: month(c.name), full: month(c.name, true) }));
  const total = series.reduce((sum, d) => sum + d.count, 0);
  const average = series.length ? total / series.length : 0;
  const peak = series.reduce((best, d, i) => (d.count > series[best].count ? i : best), 0);
  const peakPoint = series[peak];
  const yMax = Math.max(4, Math.ceil((peakPoint?.count ?? 0) * 1.3));
  const data = series.map((d, i) => ({ ...d, band: i === peak ? yMax : 0 }));
  const say = (n: number) => `${number.format(n)} ${n === 1 ? noun[0] : noun[1]}`;
  const overAverage = average > 0 && peakPoint ? peakPoint.count / average - 1 : 0;

  return (
    <Section
      title={title}
      description={description}
      dot="var(--accent)"
      badge={total > 0 && peakPoint && <Chip tone="accent">Pico en {peakPoint.full}</Chip>}
      actions={
        <>
          {total > 0 && (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden className="w-3 border-t border-dashed border-muted" />
                Promedio: {number.format(Math.round(average * 10) / 10)} al mes
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface px-2.5 text-[13px] font-medium text-ink-2 shadow-card transition-colors hover:bg-sunk hover:text-ink [&_svg]:size-3.5"
          >
            {asTable ? <ChartLine aria-hidden /> : <Table aria-hidden />}
            {asTable ? 'Ver gráfica' : 'Ver como tabla'}
          </button>
        </>
      }
    >
      <div className={cn('grid items-stretch gap-5', insights && 'lg:grid-cols-[minmax(0,1fr)_280px]')}>
        <div className="min-w-0">
          {total === 0 ? (
            empty
          ) : asTable ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="pb-2 text-left font-medium">Mes</th>
                  <th className="pb-2 text-right font-medium">{noun[1].charAt(0).toUpperCase() + noun[1].slice(1)}</th>
                  <th className="pb-2 text-right font-medium">Del total</th>
                </tr>
              </thead>
              <tbody>
                {series.map((d, i) => (
                  <tr key={d.name} className="border-t border-line">
                    <th scope="row" className={cn('py-1.5 text-left font-normal', i === peak ? 'font-medium text-ink' : 'text-ink-2')}>
                      {capitalize(d.full)}
                    </th>
                    <td className="tnum py-1.5 text-right">{number.format(d.count)}</td>
                    <td className="tnum py-1.5 text-right text-muted">{percent(d.count, total)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              role="img"
              aria-label={`${title}: ${series.map((d) => `${d.full}, ${d.count}`).join('; ')}. Mes más alto: ${peakPoint.full}.`}
              className="rounded-lg bg-panel/60 p-2 pt-3"
            >
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={data} margin={{ top: 40, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--line-strong)' }}
                    interval="preserveStartEnd"
                    minTickGap={16}
                    tick={({ x, y, payload }) => {
                      const isPeak = payload.value === peakPoint.label;
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={16}
                          textAnchor="middle"
                          fontSize={12}
                          fontWeight={isPeak ? 600 : 400}
                          fill={isPeak ? 'var(--accent-ink)' : 'var(--muted)'}
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, yMax]}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tickCount={4}
                  />
                  {/* La franja del mes más alto: el ojo llega ahí primero. */}
                  <Bar dataKey="band" barSize={40} radius={8} fill="var(--accent-wash)" isAnimationActive={false} />
                  <ReferenceLine y={average} stroke="var(--muted)" strokeDasharray="4 4" strokeOpacity={0.7} />
                  <ChartTooltip
                    cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
                    isAnimationActive={false}
                    content={({ active, payload }) => {
                      const point = payload?.find((p) => p.dataKey === 'count');
                      return active && point ? (
                        <div className="rounded-lg bg-ink px-2.5 py-1.5 text-xs text-bg shadow-pop">
                          <p className="opacity-70">{capitalize(point.payload.full)}</p>
                          <p className="tnum text-sm font-medium">{say(Number(point.value))}</p>
                        </div>
                      ) : null;
                    }}
                  />
                  <Area
                    type="monotoneX"
                    dataKey="count"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill={`url(#${gradient})`}
                    dot={({ cx, cy, index }) =>
                      index === peak ? (
                        <g key={index}>
                          <circle cx={cx} cy={cy} r={11} fill="var(--accent)" opacity={0.22} />
                          <circle cx={cx} cy={cy} r={5.5} fill="var(--accent)" stroke="var(--chart-1)" strokeWidth={2.5} />
                        </g>
                      ) : (
                        <circle key={index} cx={cx} cy={cy} r={3.5} fill="var(--surface)" stroke="var(--chart-1)" strokeWidth={2} />
                      )
                    }
                    activeDot={{ r: 5, fill: 'var(--chart-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                  <ReferenceDot
                    x={peakPoint.label}
                    y={peakPoint.count}
                    r={0}
                    label={({ viewBox }) => {
                      const { x = 0, y = 0 } = (viewBox ?? {}) as { x?: number; y?: number };
                      const text = `${peakPoint.label}: ${say(peakPoint.count)}`;
                      const width = text.length * 6.6 + 20;
                      // En la orilla la nota se recarga hacia adentro para no salirse.
                      const left = peak === series.length - 1 ? x - width + 18 : peak === 0 ? x - 18 : x - width / 2;
                      return (
                        <g transform={`translate(${left}, ${y - 44})`} pointerEvents="none">
                          <rect width={width} height={26} rx={6} fill="var(--accent-wash)" stroke="var(--accent)" strokeOpacity={0.5} />
                          <text x={10} y={17} fontSize={12} fontWeight={600} fill="var(--accent-ink)">
                            {text}
                          </text>
                        </g>
                      );
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          {total > 0 && !asTable && overAverage > 0.05 && (
            <p className="mt-3 text-[13px] text-muted">
              <span className="font-medium text-ink">{capitalize(peakPoint.full)}</span> quedó{' '}
              {percent(peakPoint.count - average, average)} % por encima del promedio mensual.
            </p>
          )}
        </div>

        {insights && total > 0 && <InsightPanel items={insights} footer={insightsFooter} />}
      </div>
    </Section>
  );
}

/** Panel destacado con la lectura de las cifras, numerada. */
export function InsightPanel({ items, footer }: { items: Insight[]; footer?: React.ReactNode }) {
  return (
    <aside className="flex flex-col rounded-lg border-l-[3px] border-accent bg-feature p-5 text-on-feature">
      <p className="border-b border-feature-line pb-3 text-[11px] font-semibold tracking-[0.08em] text-feature-accent uppercase">
        Lectura del periodo
      </p>
      <ol className="mt-4 grid gap-4">
        {items.map((item, i) => (
          <li key={item.title} className="flex gap-3">
            <span
              aria-hidden
              className={cn(
                'tnum grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold',
                i === 0 ? 'bg-accent text-on-accent' : 'bg-feature-track text-on-feature',
              )}
            >
              {i + 1}
            </span>
            <div className="grid gap-0.5">
              <p className="text-[13px] font-semibold">{item.title}</p>
              <p className="text-xs leading-relaxed text-on-feature-2">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {footer && <div className="mt-auto border-t border-feature-line pt-3 text-xs text-on-feature-2">{footer}</div>}
    </aside>
  );
}

/* ---------- Estados ---------- */

const PIPELINE: { status: string; icon: LucideIcon; tag: string; text: string }[] = [
  { status: 'RECIBIDO', icon: Inbox, tag: 'Bandeja', text: 'Enviados por la comunidad y todavía sin abrir.' },
  { status: 'EN_REVISION', icon: ScanSearch, tag: 'En curso', text: 'Un administrador revisa la evidencia y las URLs.' },
  { status: 'VALIDADO', icon: BadgeCheck, tag: 'Confirmado', text: 'Fraude confirmado; ya se muestra en la app.' },
  { status: 'CANALIZADO', icon: Send, tag: 'Final', text: 'Enviado a la Policía Cibernética.' },
  { status: 'RECHAZADO', icon: CircleX, tag: 'Final', text: 'Descartado, con las observaciones del motivo.' },
];

/** El recorrido de los reportes por estado, de la bandeja a su cierre. */
export function StatusPipeline({ counts, approvalRate }: { counts: Count[]; approvalRate: number | null }) {
  const of = (status: string) => counts.find((c) => c.name === status)?.count ?? 0;
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const closed = of('CANALIZADO') + of('RECHAZADO');
  return (
    <Section
      title="Avance de los reportes"
      description="De la bandeja a su cierre: canalizado a la Policía o rechazado."
      dot="var(--st-recibido)"
      badge={<Chip>{number.format(total)} en total</Chip>}
      footer={
        total > 0 && (
          <>
            <span>
              Concluidos: <strong className="tnum font-medium text-ink">{number.format(closed)}</strong> de{' '}
              {number.format(total)}
            </span>
            {approvalRate !== null && (
              <span>
                Tasa de aprobación: <strong className="tnum font-medium text-ink">{Math.round(approvalRate * 100)} %</strong>
              </span>
            )}
          </>
        )
      }
    >
      {total === 0 ? (
        empty
      ) : (
        <div className="grid gap-4">
          <ol aria-label="Reportes por estado" className="grid grid-cols-2 gap-1.5 rounded-xl bg-ink/5 p-1.5 @md:grid-cols-5">
            {PIPELINE.map(({ status }, i) => {
              const color = STATUS_VAR[status];
              return (
                <li
                  key={status}
                  className={cn('grid min-w-0 gap-0.5 rounded-lg px-2 py-2.5 text-center', i === 4 && 'col-span-2 @md:col-span-1')}
                  style={{ background: `color-mix(in oklab, ${color} 12%, var(--surface))` }}
                >
                  <span className="truncate text-[11px] font-medium" style={{ color }}>
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="tnum text-xl leading-tight font-semibold">
                    <NumberFlow value={of(status)} locales="es-MX" />
                  </span>
                  <span className="tnum font-mono text-[11px] text-muted">{percent(of(status), total)}%</span>
                </li>
              );
            })}
          </ol>
          <ul className="grid gap-2 @md:grid-cols-2">
            {PIPELINE.map(({ status, icon, tag, text }, i) => (
              <li
                key={status}
                className={cn('flex min-w-0 items-start gap-3 rounded-lg bg-panel p-3', i === 4 && '@md:col-span-2')}
              >
                <IconChip icon={icon} color={STATUS_VAR[status]} />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium">
                      {STATUS_LABEL[status]} <span className="tnum text-muted">({number.format(of(status))})</span>
                    </span>
                    <span className="shrink-0 rounded bg-ink/6 px-1.5 py-px text-[11px] text-ink-2">{tag}</span>
                  </span>
                  <span className="text-xs text-muted">{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/* ---------- Riesgo ---------- */

const RISK_TEXT: Record<string, string> = {
  NO_EVALUADO: 'La administración aún no les asigna un nivel.',
  BAJO: 'Pocas señales de engaño; se mantienen en observación.',
  MEDIO: 'Señales claras de engaño en el sitio o la oferta.',
  ALTO: 'Fraude probable con daño posible a quien lo visite.',
  MUY_ALTO: 'Fraude grave o en curso; prioridad máxima.',
};

/** Reportes por nivel de riesgo: una escala segmentada y su desglose. */
export function RiskBreakdown({ counts }: { counts: Count[] }) {
  const of = (level: string) => counts.find((c) => c.name === level)?.count ?? 0;
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const high = of('ALTO') + of('MUY_ALTO');
  const pending = of('NO_EVALUADO');
  const levels = RISK_ORDER.map((level, step) => ({ level, step, count: of(level) }));
  return (
    <Section
      title="Severidad del riesgo"
      description="Nivel asignado por la administración a cada reporte."
      dot="var(--risk-3)"
      badge={
        high > 0 && (
          <Chip tone="danger">
            <span aria-hidden className="size-1.5 rounded-full bg-danger" />
            {number.format(high)} de riesgo alto
          </Chip>
        )
      }
      footer={
        total > 0 && (
          <>
            <span>{pending > 0 ? 'Pendientes de clasificar:' : 'Todos los reportes tienen nivel asignado.'}</span>
            {pending > 0 && (
              <span className="font-medium text-ink">
                {number.format(pending)} {pending === 1 ? 'reporte sin evaluar' : 'reportes sin evaluar'}
              </span>
            )}
          </>
        )
      }
    >
      {total === 0 ? (
        empty
      ) : (
        <div className="grid gap-4">
          <div className="rounded-lg bg-panel p-4">
            <div className="mb-2.5 flex justify-between text-xs font-medium text-ink-2">
              <span>Sin evaluar</span>
              <span>Muy alto</span>
            </div>
            <div className="bar flex h-3 origin-left gap-0.5 overflow-hidden rounded-full">
              {levels
                .filter((l) => l.count > 0)
                .map((l) => (
                  <Tooltip key={l.level} label={`${RISK_LABEL[l.level]}: ${number.format(l.count)} (${percent(l.count, total)} %)`}>
                    <span
                      tabIndex={0}
                      aria-label={`${RISK_LABEL[l.level]}: ${l.count}`}
                      className="h-full outline-none first:rounded-l-full last:rounded-r-full focus-visible:brightness-110"
                      style={{ flexGrow: l.count, background: `var(--risk-${l.step})` }}
                    />
                  </Tooltip>
                ))}
            </div>
          </div>
          <ul className="grid gap-1.5">
            {levels.map(({ level, step, count }) => {
              const severe = step >= 3 && count > 0;
              return (
                <li
                  key={level}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                  style={{
                    background: severe ? `color-mix(in oklab, var(--risk-${step}) 9%, var(--surface))` : 'var(--panel)',
                  }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--risk-${step})` }} />
                    <span className="grid min-w-0">
                      <span className="text-[13px] font-medium">{RISK_LABEL[level]}</span>
                      <span className="truncate text-xs text-muted">{RISK_TEXT[level]}</span>
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-right">
                    <span className="font-mono text-sm font-semibold">{number.format(count)}</span>
                    <span className="ml-1.5 inline-block w-10 text-xs text-muted">{percent(count, total)} %</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Section>
  );
}

/* ---------- Categorías con una dominante ---------- */

/**
 * Categorías de mayor a menor: la primera en un panel destacado y las
 * siguientes en tarjetas con su parte del total.
 */
export function CategorySpotlight({
  title,
  description,
  counts,
  dot,
  noun,
  icon,
  describe,
  leadTag = 'Principal',
  limit = 6,
  footer,
  className,
}: {
  title: string;
  description?: string;
  counts: Count[];
  dot?: string;
  noun: [string, string];
  icon: (name: string) => LucideIcon;
  describe?: (name: string) => string | undefined;
  leadTag?: string;
  limit?: number;
  footer?: React.ReactNode;
  className?: string;
}) {
  const sorted = [...counts].filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  const total = sorted.reduce((sum, c) => sum + c.count, 0);
  const [lead, ...rest] = sorted;
  const shown = rest.slice(0, limit);
  // Con empate en el primer lugar, "el más reportado" no existe: se dice.
  const tied = rest.filter((c) => c.count === lead?.count).length;
  const hidden = rest.slice(limit);
  const say = (n: number) => `${number.format(n)} ${n === 1 ? 'reporte' : 'reportes'}`;
  return (
    <Section
      title={title}
      description={description}
      dot={dot}
      badge={<Chip>{number.format(sorted.length)} {sorted.length === 1 ? noun[0] : noun[1]}</Chip>}
      footer={footer}
      className={className}
    >
      {!lead ? (
        empty
      ) : (
        <div className="grid gap-3">
          <div className="rounded-lg border-l-[3px] border-accent bg-feature p-4 text-on-feature">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <IconChip icon={icon(lead.name)} color="var(--accent)" className="bg-accent! text-on-accent!" />
                <div className="grid min-w-0 gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold">{display(lead.name)}</span>
                    <span className="rounded bg-accent-wash px-1.5 py-px text-[10px] font-medium text-accent-ink">
                      {tied > 0 ? `Empate con ${tied} más` : leadTag}
                    </span>
                  </span>
                  {describe?.(lead.name) && <span className="text-xs text-on-feature-2">{describe(lead.name)}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="tnum font-mono text-sm font-semibold text-feature-accent">{say(lead.count)}</p>
                <p className="tnum text-[11px] text-on-feature-2">{percent(lead.count, total)} % del total</p>
              </div>
            </div>
            <Meter value={share(lead.count, total)} color="var(--accent)" track="bg-feature-track" className="mt-3 h-2" />
          </div>

          {shown.length > 0 && (
            <ul className="grid gap-2 @lg:grid-cols-2 @3xl:grid-cols-3">
              {shown.map((item) => {
                const Icon = icon(item.name);
                const text = describe?.(item.name);
                return (
                  <li key={item.name} className="grid min-w-0 gap-2 rounded-lg bg-panel p-3">
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                        <Icon aria-hidden className="size-4 shrink-0 text-muted" />
                        <span className="truncate">{display(item.name)}</span>
                      </span>
                      <span className="tnum shrink-0 font-mono text-[13px] font-semibold">
                        {number.format(item.count)}
                        <span className="ml-1 font-sans text-[11px] font-normal text-muted">{percent(item.count, total)}%</span>
                      </span>
                    </span>
                    <Meter value={share(item.count, total)} color="var(--ink-2)" />
                    {text && <span className="line-clamp-1 text-[11px] text-muted">{text}</span>}
                  </li>
                );
              })}
            </ul>
          )}
          {hidden.length > 0 && (
            <p className="text-xs text-muted">
              Y {number.format(hidden.length)} {hidden.length === 1 ? noun[0] : noun[1]} más con{' '}
              {say(hidden.reduce((sum, c) => sum + c.count, 0))} en conjunto.
            </p>
          )}
        </div>
      )}
    </Section>
  );
}
