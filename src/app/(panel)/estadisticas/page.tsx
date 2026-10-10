'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarRange, Lock, TriangleAlert, X } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Select } from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { RISK_LABEL, RISK_LEVELS, number } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CountChart, type Count } from './count-chart';

type Stats = {
  total: number;
  byStatus: Count[];
  byFraudType: Count[];
  byRiskLevel: Count[];
  byCountry: Count[];
  byMonth: Count[];
  approvalRate: number | null;
};

type SiteStats = {
  users: {
    total: number;
    byRole: Count[];
    byAccountStatus: Count[];
    byCountry: Count[];
    byMonth: Count[];
  };
  urls: { total: number; analyzed: number; byRiskLevel: Count[] };
  lookups: { total: number; users: number; byMonth: Count[] };
  notifications: { total: number; unread: number; riskAlerts: number };
};

type Filters = {
  from?: string;
  to?: string;
  country?: string;
  riskLevel?: string;
};

type Tab = 'reportes' | 'plataforma';

const count = (counts: Count[], name: string) =>
  counts.find((c) => c.name === name)?.count ?? 0;

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [riskLevel, setRiskLevel] = useState('ALL');
  const [error, setError] = useState('');
  const [site, setSite] = useState<SiteStats | null>(null);
  const [siteError, setSiteError] = useState('');
  const [tab, setTab] = useState<Tab>('reportes');
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(() => {
    return api
      .get<Stats>('/stats', { params: filters })
      .then(({ data }) => {
        setStats(data);
        setError('');
      })
      .catch((e) => setError(errorMessage(e)));
  }, [filters]);

  const loadSite = useCallback(() => {
    // Las métricas de la plataforma solo aceptan el periodo, no el país ni
    // el riesgo. Su error va aparte: la Policía ve los reportes pero no
    // esta parte, y eso no debe tapar lo demás.
    return api
      .get<SiteStats>('/stats/site', {
        params: { from: filters.from, to: filters.to },
      })
      .then(({ data }) => {
        setSite(data);
        setSiteError('');
      })
      .catch((e) => {
        setSite(null);
        setSiteError(errorMessage(e));
      });
  }, [filters]);

  useEffect(() => {
    load();
    loadSite();
  }, [load, loadSite]);

  function handleFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get('from'));
    const to = String(form.get('to'));
    // Un filtro vacío no se manda: el servidor rechaza `from=` sin valor.
    setFilters({
      from: from || undefined,
      // El campo da solo el día; se manda su último segundo para que
      // "hasta el 30" incluya los reportes del 30.
      to: to ? to + 'T23:59:59' : undefined,
      country: String(form.get('country')).trim() || undefined,
      riskLevel: riskLevel === 'ALL' ? undefined : riskLevel,
    });
  }

  const filtered = Object.values(filters).some(Boolean);
  const approval = stats?.approvalRate ?? null;
  const pending = stats
    ? count(stats.byStatus, 'RECIBIDO') + count(stats.byStatus, 'EN_REVISION')
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="Panorama"
        title="Estadísticas"
        description="Qué se denuncia, qué tan grave es y cómo se usa la plataforma."
      />

      <form
        key={formKey}
        onSubmit={handleFilters}
        className="mb-8 grid animate-rise items-end gap-3 rounded-xl border border-line bg-surface/70 p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      >
        <Field label="Creados desde">
          <Input name="from" type="date" />
        </Field>
        <Field label="Creados hasta">
          <Input name="to" type="date" />
        </Field>
        <Field label="País del denunciante">
          <Input name="country" placeholder="México" />
        </Field>
        <div className="grid gap-1.5">
          <span className="eyebrow">Nivel de riesgo</span>
          <Select
            aria-label="Nivel de riesgo"
            value={riskLevel}
            onValueChange={setRiskLevel}
            options={[
              { value: 'ALL', label: 'Todos' },
              ...RISK_LEVELS.map((level) => ({ value: level, label: RISK_LABEL[level] })),
            ]}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">
            <CalendarRange />
            Aplicar
          </Button>
          {filtered && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar filtros"
              onClick={() => {
                setRiskLevel('ALL');
                setFilters({});
                setFormKey((k) => k + 1);
              }}
            >
              <X />
            </Button>
          )}
        </div>
      </form>

      {/* Las tres cifras que resumen la mesa: cuánto hay, cuánto falta y cuánto resultó cierto. */}
      <div className="stagger mb-8 grid gap-4 md:grid-cols-[1.25fr_1fr_1fr]">
        <Card className="overflow-hidden bg-ink p-6 text-paper dark:bg-sunk dark:text-ink">
          <svg
            aria-hidden
            viewBox="0 0 200 200"
            className="pointer-events-none absolute -right-10 -bottom-16 size-56 opacity-10"
          >
            <ellipse cx="100" cy="100" rx="56" ry="80" fill="none" stroke="currentColor" strokeWidth="14" />
            <path d="M36 172 164 28" stroke="var(--signal)" strokeWidth="16" strokeLinecap="round" />
          </svg>
          <span className="eyebrow !text-paper/60 dark:!text-muted">Reportes{filtered && ' · filtrados'}</span>
          <span className="display tnum mt-3 block text-7xl">
            {stats ? number.format(stats.total) : '–'}
          </span>
          <span className="mt-2 block text-sm text-paper/70 dark:text-ink-soft">
            recibidos de la comunidad
          </span>
        </Card>

        <Card className="p-6">
          <span className="eyebrow">Por revisar</span>
          <span className="display tnum mt-3 block text-6xl">
            {stats ? number.format(pending) : '–'}
          </span>
          <span className="mt-2 block text-sm text-muted">
            {stats && stats.total > 0
              ? `${Math.round((pending / stats.total) * 100)} % del total sigue abierto`
              : 'recibidos o en revisión'}
          </span>
        </Card>

        <Card className="p-6">
          <span className="eyebrow">Tasa de aprobación</span>
          <span className="display tnum mt-3 block text-6xl">
            {approval === null ? '–' : Math.round(approval * 100)}
            {approval !== null && <span className="text-3xl text-muted"> %</span>}
          </span>
          {/* La barra repite la cifra; no es el único lugar donde se lee. */}
          <span aria-hidden className="mt-4 block h-1.5 overflow-hidden rounded-full bg-ink/10">
            <span
              className="block h-full rounded-full bg-signal transition-[width] duration-700"
              style={{ width: `${Math.round((approval ?? 0) * 100)}%` }}
            />
          </span>
          <span className="mt-2 block text-sm text-muted">
            {approval === null
              ? 'Aún no hay reportes resueltos'
              : 'de los resueltos fueron validados'}
          </span>
        </Card>
      </div>

      <div role="tablist" aria-label="Vista" className="mb-6 inline-flex animate-rise rounded-lg border border-line-strong bg-sunk p-1">
        {(
          [
            ['reportes', 'Reportes'],
            ['plataforma', 'Plataforma'],
          ] as [Tab, string][]
        ).map(([value, text]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'h-9 rounded-md px-4 text-sm transition-colors',
              tab === value
                ? 'bg-surface font-medium text-ink shadow-card'
                : 'text-muted hover:text-ink',
            )}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === 'reportes' && (
        <div role="tabpanel">
          {error && (
            <Card>
              <EmptyState
                tone="danger"
                icon={<TriangleAlert />}
                title="No se pudieron cargar las estadísticas"
                description={error}
                action={
                  <Button variant="outline" onClick={() => load()}>
                    Reintentar
                  </Button>
                }
              />
            </Card>
          )}
          {!error && !stats && <ChartsSkeleton />}
          {!error && stats && (
            <div className="stagger grid items-start gap-4 lg:grid-cols-2">
              <CountChart title="Por estado" counts={stats.byStatus} />
              <CountChart title="Por nivel de riesgo" counts={stats.byRiskLevel} kind="risk" />
              <CountChart title="Por tipo de fraude" counts={stats.byFraudType} />
              <CountChart title="Por país" counts={stats.byCountry} />
              <div className="lg:col-span-2">
                <CountChart title="Reportes por mes" counts={stats.byMonth} kind="months" />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'plataforma' && (
        <div role="tabpanel" className="grid gap-4">
          {siteError && (
            <Card>
              <EmptyState
                icon={<Lock />}
                title="Esta parte no está disponible para tu rol"
                description={siteError}
              />
            </Card>
          )}
          {!siteError && !site && <ChartsSkeleton />}
          {site && (
            <>
              <dl className="stagger grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-card lg:grid-cols-4">
                {(
                  [
                    ['Cuentas registradas', site.users.total],
                    ['URLs en el directorio', site.urls.total],
                    ['URLs ya analizadas', site.urls.analyzed],
                    ['Consultas de riesgo', site.lookups.total],
                    ['Usuarios que consultaron', site.lookups.users],
                    ['Notificaciones enviadas', site.notifications.total],
                    ['Notificaciones sin leer', site.notifications.unread],
                    ['Alertas de riesgo de una URL', site.notifications.riskAlerts],
                  ] as [string, number][]
                ).map(([text, value]) => (
                  <div key={text} className="grid gap-2 bg-surface p-5">
                    <dt className="eyebrow">{text}</dt>
                    <dd className="display tnum text-4xl">{number.format(value)}</dd>
                  </div>
                ))}
              </dl>
              <div className="stagger grid items-start gap-4 lg:grid-cols-2">
                <CountChart title="Cuentas por rol" counts={site.users.byRole} />
                <CountChart title="Cuentas por estado" counts={site.users.byAccountStatus} />
                <CountChart title="Cuentas por país" counts={site.users.byCountry} />
                <CountChart title="URLs por nivel de riesgo" counts={site.urls.byRiskLevel} kind="risk" />
                <CountChart title="Registros por mes" counts={site.users.byMonth} kind="months" />
                <CountChart title="Consultas por mes" counts={site.lookups.byMonth} kind="months" />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function ChartsSkeleton() {
  return (
    <div aria-busy aria-label="Cargando estadísticas" className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-56 rounded-xl" />
      ))}
    </div>
  );
}
