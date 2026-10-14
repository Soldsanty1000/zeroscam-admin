'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  CircleCheck,
  Clock,
  Download,
  FileText,
  Gift,
  Globe,
  IdCard,
  Link2,
  LockKeyhole,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCw,
  ScanSearch,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { STATUS_VAR } from '@/components/badges';
import { fillMonths, month, RankChart, ShareChart, TrendChart, type Count } from '@/components/charts/charts';
import {
  capitalize,
  CategorySpotlight,
  Delta,
  Meter,
  RiskBreakdown,
  Ring,
  StatCard,
  StatusPipeline,
  TrendSpotlight,
  type Insight,
} from '@/components/charts/insights';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Select } from '@/components/ui/select';
import { FilterTabs } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { api, errorMessage } from '@/lib/api';
import { label as readable, number, RISK_LABEL, RISK_LEVELS } from '@/lib/format';

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

type Catalogs = { fraudTypes: { id: number; name: string; description?: string }[] };

type Filters = { from?: string; to?: string; country?: string; riskLevel?: string };

const ACCOUNT_COLORS = {
  ACTIVO: STATUS_VAR.ACTIVO,
  SUSPENDIDO: STATUS_VAR.SUSPENDIDO,
  ELIMINADA: 'var(--risk-0)',
};

/** Ícono por tipo de fraude, según palabras de su nombre; el catálogo puede crecer. */
const FRAUD_ICONS: [RegExp, LucideIcon][] = [
  [/phishing/i, Mail],
  [/comercio/i, ShoppingCart],
  [/identidad/i, IdCard],
  [/inversi|cripto/i, TrendingUp],
  [/ransomware|extorsi/i, LockKeyhole],
  [/tel[eé]fon|vishing|llamada/i, Phone],
  [/oferta/i, Tag],
  [/sorteo/i, Gift],
  [/tienda/i, Store],
  [/marketplace/i, ShoppingBag],
];
const fraudIcon = (name: string) => FRAUD_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? ShieldAlert;

const of = (counts: Count[], name: string) => counts.find((c) => c.name === name)?.count ?? 0;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const reports = (n: number) => `${number.format(n)} ${n === 1 ? 'reporte' : 'reportes'}`;

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [site, setSite] = useState<SiteStats | null>(null);
  const [fraudText, setFraudText] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [siteError, setSiteError] = useState('');
  // Los filtros de la última carga terminada: si no son los actuales, está cargando.
  const [loaded, setLoaded] = useState<{ filters: Filters; at: Date } | null>(null);
  const [tab, setTab] = useState('reportes');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [country, setCountry] = useState('');
  const [riskLevel, setRiskLevel] = useState('ALL');
  const [filters, setFilters] = useState<Filters>({});

  // Los filtros aplican solos; el texto espera a que se deje de escribir.
  // Un filtro vacío no se manda: el servidor rechaza `from=` sin valor.
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setFilters({
          from: from || undefined,
          // El campo da solo el día; se manda su último segundo para que
          // "hasta el 30" incluya los reportes del 30.
          to: to ? to + 'T23:59:59' : undefined,
          country: country.trim() || undefined,
          riskLevel: riskLevel === 'ALL' ? undefined : riskLevel,
        }),
      country ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [from, to, country, riskLevel]);

  useEffect(() => {
    // Si los filtros cambian antes de que responda el servidor, esta
    // respuesta ya no aplica: no debe pisar la de los filtros nuevos.
    let current = true;
    const reportsRequest = api
      .get<Stats>('/stats', { params: filters })
      .then(({ data }) => {
        if (!current) return;
        setStats(data);
        setError('');
      })
      .catch((e) => current && setError(errorMessage(e)));
    // Las métricas de la plataforma solo aceptan el periodo, no el país ni
    // el riesgo. Su error va aparte: la Policía ve los reportes pero no
    // esta parte, y eso no debe tapar lo demás.
    const siteRequest = api
      .get<SiteStats>('/stats/site', { params: { from: filters.from, to: filters.to } })
      .then(({ data }) => {
        if (!current) return;
        setSite(data);
        setSiteError('');
      })
      .catch((e) => {
        if (!current) return;
        setSite(null);
        setSiteError(errorMessage(e));
      });
    Promise.all([reportsRequest, siteRequest]).finally(() => current && setLoaded({ filters, at: new Date() }));
    return () => {
      current = false;
    };
  }, [filters]);

  // La descripción de cada tipo de fraude sale del catálogo; sin él, solo el nombre.
  useEffect(() => {
    api
      .get<Catalogs>('/catalogs')
      .then(({ data }) =>
        setFraudText(Object.fromEntries(data.fraudTypes.filter((t) => t.description).map((t) => [t.name, t.description!]))),
      )
      .catch(() => {});
  }, []);

  const loading = loaded?.filters !== filters;
  const filtered = Boolean(from || to || country || riskLevel !== 'ALL');
  const total = stats?.total ?? 0;
  const pending = stats ? of(stats.byStatus, 'RECIBIDO') + of(stats.byStatus, 'EN_REVISION') : 0;
  const confirmed = stats ? of(stats.byStatus, 'VALIDADO') + of(stats.byStatus, 'CANALIZADO') : 0;
  const rejected = stats ? of(stats.byStatus, 'RECHAZADO') : 0;

  // Meses completos (con ceros) para comparar el último contra el anterior.
  const months = stats ? fillMonths(stats.byMonth) : [];
  const last = months.at(-1);
  const previous = months.at(-2);
  const change = last && previous && previous.count > 0 ? last.count / previous.count - 1 : null;

  return (
    <>
      <PageHeader
        title="Estadísticas"
        description="Qué se denuncia, qué tan grave es y cómo avanza su revisión."
        actions={
          <>
            {loaded && (
              <span className="text-xs text-muted">
                Actualizado a las{' '}
                {loaded.at.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Tooltip label="Volver a cargar">
              <Button size="icon" aria-label="Volver a cargar" loading={loading} onClick={() => setFilters({ ...filters })}>
                <RotateCw />
              </Button>
            </Tooltip>
            <Button disabled={!stats} onClick={() => stats && exportCsv(stats, site, filters)}>
              <Download />
              Exportar CSV
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Desde" className="w-40">
          <Input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="Hasta" className="w-40">
          <Input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Field label="País del denunciante" className="w-44">
          <Input value={country} placeholder="Cualquiera" onChange={(event) => setCountry(event.target.value)} />
        </Field>
        <div className="grid w-40 gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Riesgo</span>
          <Select
            aria-label="Nivel de riesgo"
            value={riskLevel}
            onValueChange={setRiskLevel}
            options={[
              { value: 'ALL', label: 'Cualquiera' },
              ...RISK_LEVELS.map((level) => ({ value: level, label: RISK_LABEL[level] })),
            ]}
          />
        </div>
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              setFrom('');
              setTo('');
              setCountry('');
              setRiskLevel('ALL');
            }}
          >
            Quitar filtros
          </Button>
        )}
      </div>

      <dl className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={filtered ? 'Reportes con filtros' : 'Reportes'}
          icon={FileText}
          color="var(--ink)"
          value={stats?.total}
          badge={change !== null && <Delta value={change} />}
        >
          {last && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              <span>
                {reports(last.count)} en {month(last.name, true)}
                {change !== null && previous && <> frente a {month(previous.name, true).split(' ')[0]}</>}
              </span>
            </span>
          )}
        </StatCard>
        <StatCard
          label="Por revisar"
          icon={Clock}
          color="var(--st-revision)"
          value={stats ? pending : undefined}
          badge={
            pending > 0 && (
              <span className="inline-flex h-[22px] items-center rounded-md bg-accent-wash px-1.5 text-xs font-medium text-accent-ink">
                Pendientes
              </span>
            )
          }
        >
          <Meter value={total ? pending / total : 0} color="var(--accent)" />
          <span>{pct(pending, total)} % del total requiere atención</span>
        </StatCard>
        <StatCard
          label="Validados o canalizados"
          icon={CircleCheck}
          color="var(--st-validado)"
          value={stats ? confirmed : undefined}
          badge={<span className="text-xs font-medium text-muted">de {number.format(total)}</span>}
        >
          <Meter value={total ? confirmed / total : 0} color="var(--st-validado)" />
          <span>
            {number.format(stats ? of(stats.byStatus, 'CANALIZADO') : 0)} ya se canalizaron a la Policía Cibernética
          </span>
        </StatCard>
        <StatCard
          label="Tasa de aprobación"
          icon={TrendingUp}
          color="var(--accent-ink)"
          value={stats ? stats.approvalRate : undefined}
          format={{ style: 'percent', maximumFractionDigits: 0 }}
          aside={stats?.approvalRate != null && <Ring value={stats.approvalRate} />}
        >
          <span>
            {stats?.approvalRate == null
              ? 'Aún no hay reportes resueltos'
              : `${number.format(confirmed)} aceptados frente a ${number.format(rejected)} rechazados`}
          </span>
        </StatCard>
      </dl>

      <FilterTabs
        aria-label="Vista"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'reportes', label: 'Reportes', count: stats?.total },
          { value: 'plataforma', label: 'Plataforma' },
        ]}
      />

      {tab === 'reportes' && (
        <div className="pt-5">
          {error && (
            <EmptyState
              tone="danger"
              icon={<TriangleAlert />}
              title="No se pudieron cargar las estadísticas"
              description={error}
              action={<Button onClick={() => setFilters({ ...filters })}>Reintentar</Button>}
            />
          )}
          {!error && !stats && <ChartsSkeleton />}
          {!error && stats && (
            <div className="arrive grid items-start gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <TrendSpotlight
                  title="Reportes por mes"
                  description="Cuántos reportes llegaron cada mes, con el más alto destacado."
                  counts={stats.byMonth}
                  insights={readings(stats, months)}
                  insightsFooter={<TopFraudType counts={stats.byFraudType} />}
                />
              </div>
              <StatusPipeline counts={stats.byStatus} approvalRate={stats.approvalRate} />
              <RiskBreakdown counts={stats.byRiskLevel} />
              <CategorySpotlight
                className="lg:col-span-2"
                title="Tipos de fraude"
                description="Cómo engañan a las personas, del más al menos reportado."
                dot="var(--accent)"
                counts={stats.byFraudType}
                noun={['tipo', 'tipos']}
                icon={fraudIcon}
                describe={(name) => fraudText[name]}
                leadTag="Más reportado"
              />
              <CategorySpotlight
                className="lg:col-span-2"
                title="Países"
                description="Según el país que registró quien denuncia."
                dot="var(--st-validado)"
                counts={stats.byCountry}
                noun={['país', 'países']}
                icon={(name) => (name === stats.byCountry[0]?.name ? Globe : MapPin)}
                leadTag="Principal"
              />
            </div>
          )}
        </div>
      )}

      {tab === 'plataforma' && (
        <div className="pt-5">
          {siteError && <EmptyState icon={<Lock />} title="Esta parte no está disponible para tu rol" description={siteError} />}
          {!siteError && !site && <ChartsSkeleton />}
          {site && (
            <div className="arrive grid gap-5">
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Cuentas registradas" icon={Users} color="var(--ink)" value={site.users.total}>
                  <span>{number.format(of(site.users.byAccountStatus, 'ACTIVO'))} activas</span>
                </StatCard>
                <StatCard
                  label="URLs en el directorio"
                  icon={Link2}
                  color="var(--st-recibido)"
                  value={site.urls.total}
                  badge={<span className="text-xs font-medium text-muted">{number.format(site.urls.analyzed)} analizadas</span>}
                >
                  <Meter value={site.urls.total ? site.urls.analyzed / site.urls.total : 0} color="var(--st-recibido)" />
                  <span>{pct(site.urls.analyzed, site.urls.total)} % ya pasó por el análisis de riesgo</span>
                </StatCard>
                <StatCard label="Consultas de riesgo" icon={ScanSearch} color="var(--accent-ink)" value={site.lookups.total}>
                  <span>
                    Hechas por {number.format(site.lookups.users)} {site.lookups.users === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </StatCard>
                <StatCard
                  label="Notificaciones"
                  icon={Bell}
                  color="var(--st-canalizado)"
                  value={site.notifications.total}
                  badge={
                    site.notifications.unread > 0 && (
                      <span className="text-xs font-medium text-muted">{number.format(site.notifications.unread)} sin leer</span>
                    )
                  }
                >
                  <span>
                    {number.format(site.notifications.riskAlerts)}{' '}
                    {site.notifications.riskAlerts === 1 ? 'alerta' : 'alertas'} de riesgo de una URL
                  </span>
                </StatCard>
              </dl>
              <div className="grid items-start gap-5 lg:grid-cols-2">
                <TrendChart title="Registros por mes" counts={site.users.byMonth} />
                <TrendChart title="Consultas de riesgo por mes" counts={site.lookups.byMonth} />
                <ShareChart title="Cuentas por estado" counts={site.users.byAccountStatus} colors={ACCOUNT_COLORS} />
                <RankChart title="Cuentas por rol" counts={site.users.byRole} />
                <RankChart title="URLs por nivel de riesgo" counts={site.urls.byRiskLevel} kind="risk" />
                <RankChart title="Cuentas por país" counts={site.users.byCountry} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** El tipo de fraude con más reportes, o cuántos empatan en el primer lugar. */
function TopFraudType({ counts }: { counts: Count[] }) {
  const max = Math.max(0, ...counts.map((c) => c.count));
  const top = counts.filter((c) => c.count === max && max > 0);
  if (top.length === 0) return null;
  return (
    <span className="flex items-center justify-between gap-3">
      <span className="shrink-0">Tipo más reportado</span>
      <span className="truncate font-medium text-feature-accent">
        {top.length === 1 ? top[0].name : `${top.length} empatados con ${reports(max)}`}
      </span>
    </span>
  );
}

/** La lectura del periodo: tres hallazgos que salen de las mismas cifras. */
function readings(stats: Stats, months: Count[]): Insight[] {
  const items: Insight[] = [];
  if (months.length > 0) {
    const peak = months.reduce((best, m) => (m.count > best.count ? m : best));
    const average = months.reduce((sum, m) => sum + m.count, 0) / months.length;
    items.push({
      title: 'Mes con más reportes',
      body: (
        <>
          <strong className="font-semibold text-feature-accent">{capitalize(month(peak.name, true))}</strong>, con{' '}
          {reports(peak.count)}
          {average > 0 && peak.count > average && <>: {pct(peak.count - average, average)} % arriba del promedio mensual</>}.
        </>
      ),
    });
  }
  const [previous, last] = months.slice(-2);
  if (previous && last) {
    const diff = last.count - previous.count;
    items.push({
      title: 'Último mes',
      body: (
        <>
          {reports(last.count)} en {month(last.name, true)},{' '}
          {diff === 0 ? (
            <>igual que en {month(previous.name, true)}</>
          ) : (
            <>
              <strong className="font-semibold text-on-feature">
                {diff > 0 ? `${number.format(diff)} más` : `${number.format(-diff)} menos`}
              </strong>{' '}
              que en {month(previous.name, true)}
            </>
          )}
          .
        </>
      ),
    });
  }
  const reviewed = stats.total - of(stats.byStatus, 'RECIBIDO');
  items.push({
    title: 'Avance de revisión',
    body: (
      <>
        <strong className="font-semibold text-on-feature">{pct(reviewed, stats.total)} %</strong> ya salió de la bandeja:{' '}
        {number.format(reviewed)} de {reports(stats.total)} tienen al menos una revisión.
      </>
    ),
  });
  return items;
}

/** Descarga las cifras del periodo como CSV (con BOM para que Excel respete los acentos). */
function exportCsv(stats: Stats, site: SiteStats | null, filters: Filters) {
  const rows: (string | number)[][] = [['Sección', 'Concepto', 'Cantidad']];
  const add = (section: string, counts: Count[], name: (n: string) => string = readable) =>
    counts.forEach((c) => rows.push([section, name(c.name), c.count]));
  rows.push(['Resumen', 'Reportes', stats.total]);
  if (stats.approvalRate !== null) rows.push(['Resumen', 'Tasa de aprobación (%)', Math.round(stats.approvalRate * 100)]);
  add('Por mes', stats.byMonth, (n) => month(n, true));
  add('Por estado', stats.byStatus);
  add('Por nivel de riesgo', stats.byRiskLevel);
  add('Por tipo de fraude', stats.byFraudType, (n) => n);
  add('Por país', stats.byCountry, (n) => n);
  if (site) {
    rows.push(['Plataforma', 'Cuentas registradas', site.users.total]);
    rows.push(['Plataforma', 'URLs en el directorio', site.urls.total]);
    rows.push(['Plataforma', 'URLs analizadas', site.urls.analyzed]);
    rows.push(['Plataforma', 'Consultas de riesgo', site.lookups.total]);
    rows.push(['Plataforma', 'Notificaciones enviadas', site.notifications.total]);
  }
  const applied = Object.entries(filters).filter(([, v]) => v);
  if (applied.length) rows.push(['Filtros', applied.map(([k, v]) => `${k}=${v}`).join('; '), '']);
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `estadisticas-zeroscam-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  link.click();
  URL.revokeObjectURL(url);
}

function ChartsSkeleton() {
  return (
    <div aria-busy aria-label="Cargando estadísticas" className="grid gap-5 lg:grid-cols-2">
      <Skeleton className="h-80 rounded-xl lg:col-span-2" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
