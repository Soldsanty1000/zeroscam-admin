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

export type Count = { name: string; count: number };

type Kind = 'categories' | 'months' | 'risk';

// Del menos al más grave. Cada nivel tiene su paso del mismo azul (claro →
// oscuro), definido en globals.css; NO_EVALUADO va en gris.
const RISK_ORDER = ['NO_EVALUADO', 'BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO'];

const RISK_COLORS: Record<string, string> = {
  NO_EVALUADO: 'var(--chart-neutral)',
  BAJO: 'var(--chart-risk-1)',
  MEDIO: 'var(--chart-risk-2)',
  ALTO: 'var(--chart-risk-3)',
  MUY_ALTO: 'var(--chart-risk-4)',
};

const TICK = { fill: 'var(--chart-muted)', fontSize: 12 };

const TOOLTIP = {
  contentStyle: {
    background: 'var(--chart-surface)',
    border: '1px solid var(--chart-grid)',
    borderRadius: 6,
    color: 'var(--chart-ink)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--chart-ink)' },
  itemStyle: { color: 'var(--chart-ink)' },
  cursor: { fill: 'var(--chart-hover)' },
};

/** `MUY_ALTO` → "MUY ALTO": los guiones bajos no se parten al final del renglón. */
function readable(name: string): string {
  return name.replaceAll('_', ' ');
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
  ).map((item) => ({ ...item, label: readable(item.name) }));

  return (
    <section>
      <h2>{title}</h2>
      {data.length === 0 && <p>Sin datos.</p>}
      {data.length > 0 && (
        <>
          <div
            className="chart"
            role="img"
            aria-label={`Gráfica de barras: ${title}`}
          >
            {kind === 'months' ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
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
                    maxBarSize={20}
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
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <details>
            <summary>Ver datos</summary>
            <ul>
              {data.map((item) => (
                <li key={item.name}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
