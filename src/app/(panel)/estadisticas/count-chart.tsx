'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { label, number } from '@/lib/format';

export type Count = { name: string; count: number };

type Kind = 'categories' | 'months' | 'risk';

// Del menos al más grave. Cada nivel tiene su paso del mismo ámbar (claro →
// oscuro), definido en globals.css; NO_EVALUADO va en gris.
const RISK_ORDER = ['NO_EVALUADO', 'BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO'];

const RISK_COLORS: Record<string, string> = {
  NO_EVALUADO: 'var(--chart-neutral)',
  BAJO: 'var(--chart-risk-1)',
  MEDIO: 'var(--chart-risk-2)',
  ALTO: 'var(--chart-risk-3)',
  MUY_ALTO: 'var(--chart-risk-4)',
};

const TICK = {
  fill: 'var(--chart-muted)',
  fontSize: 12,
  fontFamily: 'var(--font-sans)',
};

const TOOLTIP = {
  contentStyle: {
    background: 'var(--chart-surface)',
    border: '1px solid var(--chart-grid)',
    borderRadius: 8,
    boxShadow: 'var(--shadow-pop)',
    color: 'var(--chart-ink)',
    fontSize: 13,
    padding: '8px 12px',
  },
  labelStyle: { color: 'var(--chart-ink)' },
  itemStyle: { color: 'var(--chart-ink)' },
  cursor: { fill: 'var(--chart-hover)' },
};

/** `MUY_ALTO` → "Muy alto"; un mes `2026-10` → "oct 26". */
function readable(name: string, kind: Kind): string {
  if (kind === 'months' && /^\d{4}-\d{2}$/.test(name)) {
    const [year, month] = name.split('-').map(Number);
    return new Date(year, month - 1, 1)
      .toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
      .replace('.', '');
  }
  return label(name);
}

/**
 * Una gráfica de barras de conteos, con sus datos en una tabla plegable.
 *
 * - `categories`: barras horizontales, de mayor a menor (como llegan).
 * - `risk`: barras horizontales en el orden de gravedad, un tono por nivel.
 * - `months`: columnas en orden cronológico.
 */
export function CountChart({
  title,
  counts,
  kind = 'categories',
}: {
  title: string;
  counts: Count[];
  kind?: Kind;
}) {
  const data = (
    kind === 'risk'
      ? [...counts].sort(
          (a, b) => RISK_ORDER.indexOf(a.name) - RISK_ORDER.indexOf(b.name),
        )
      : counts
  ).map((item) => ({ ...item, label: readable(item.name, kind) }));
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="flex flex-col">
      <header className="flex items-baseline justify-between gap-4 px-5 pt-5 pb-1">
        <h3 className="display text-lg">{title}</h3>
        {data.length > 0 && (
          <span className="eyebrow tnum">{number.format(total)} en total</span>
        )}
      </header>
      {data.length === 0 && (
        <p className="px-5 pt-2 pb-6 text-sm text-muted">Sin datos en este periodo.</p>
      )}
      {data.length > 0 && (
        <>
          <div
            className="px-3 pt-2"
            role="img"
            aria-label={`Gráfica de barras: ${title}`}
          >
            {kind === 'months' ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--chart-grid)"
                    strokeDasharray="2 4"
                  />
                  <XAxis
                    dataKey="label"
                    tick={TICK}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--chart-axis)' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={TICK}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip {...TOOLTIP} />
                  <Bar
                    dataKey="count"
                    name="Total"
                    fill="var(--chart-series)"
                    maxBarSize={24}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={data.length * 36 + 16}>
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={TICK}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--chart-axis)' }}
                    width={150}
                  />
                  <Tooltip {...TOOLTIP} />
                  <Bar
                    dataKey="count"
                    name="Total"
                    fill="var(--chart-series)"
                    maxBarSize={16}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  >
                    {kind === 'risk' &&
                      data.map((item) => (
                        <Cell
                          key={item.name}
                          fill={RISK_COLORS[item.name] ?? 'var(--chart-neutral)'}
                        />
                      ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      fill="var(--chart-ink)"
                      fontSize={12}
                      fontFamily="var(--font-mono)"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <details className="group mt-auto border-t border-line px-5 py-3">
            <summary className="eyebrow cursor-pointer list-none select-none hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Ver datos</span>
              <span className="hidden group-open:inline">Ocultar datos</span>
            </summary>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {data.map((item) => (
                  <tr key={item.name} className="border-t border-line first:border-0">
                    <th scope="row" className="py-1.5 text-left font-normal text-ink-soft">
                      {item.label}
                    </th>
                    <td className="tnum py-1.5 text-right font-mono text-[13px]">
                      {number.format(item.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Card>
  );
}
