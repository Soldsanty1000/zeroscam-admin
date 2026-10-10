'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Inbox,
  Link2,
  MessageSquare,
  Paperclip,
  Search,
  SearchX,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { RiskMeter, StatusBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Select } from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import {
  RISK_LABEL,
  RISK_LEVELS,
  STATUSES,
  STATUS_LABEL,
  folio,
  number,
  timeAgo,
} from '@/lib/format';
import { cn } from '@/lib/utils';

type Report = {
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
type Extra = {
  id: number;
  title: string;
  city: string;
  confirmations: number;
  comments: number;
};

const STATUS_VAR: Record<string, string> = {
  RECIBIDO: 'var(--st-recibido)',
  EN_REVISION: 'var(--st-revision)',
  VALIDADO: 'var(--st-validado)',
  RECHAZADO: 'var(--st-rechazado)',
  CANALIZADO: 'var(--st-canalizado)',
};

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [extras, setExtras] = useState<Map<number, Extra>>(new Map());
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [risk, setRisk] = useState('ALL');

  useEffect(() => {
    api
      .get<Report[]>('/reports')
      .then(({ data }) => setReports(data))
      .catch((e) => setError(errorMessage(e)));
    // Los títulos viven en la vista de la app. Si el rol no puede pedirla
    // (Policía), la bandeja sigue funcionando con el tipo de fraude.
    Promise.allSettled(
      STATUSES.map((s) =>
        api.get<Extra[]>('/community/reports', {
          params: { scope: 'queue', status: s },
        }),
      ),
    ).then((results) => {
      const found = new Map<number, Extra>();
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        for (const extra of result.value.data) found.set(extra.id, extra);
      }
      setExtras(found);
    });
  }, []);

  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of reports ?? []) by[r.status] = (by[r.status] ?? 0) + 1;
    return by;
  }, [reports]);

  const visible = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return (reports ?? []).filter((r) => {
      if (status && r.status !== status) return false;
      if (risk !== 'ALL' && r.riskLevel !== risk) return false;
      if (words.length === 0) return true;
      const extra = extras.get(r.id);
      const haystack = normalize(
        [
          folio(r.id, r.createdAt),
          `#${r.id}`,
          extra?.title,
          extra?.city,
          r.fraudType,
          r.description,
          ...(r.urls ?? []),
        ].join(' '),
      );
      return words.every((w) => haystack.includes(w));
    });
  }, [reports, extras, query, status, risk]);

  const filtered = Boolean(query || status || risk !== 'ALL');
  const pending = (counts.RECIBIDO ?? 0) + (counts.EN_REVISION ?? 0);

  return (
    <>
      <PageHeader
        eyebrow="Bandeja de entrada"
        title="Reportes"
        description={
          reports ? (
            pending > 0 ? (
              <>
                <strong className="font-medium text-ink">
                  {number.format(pending)}{' '}
                  {pending === 1 ? 'reporte espera' : 'reportes esperan'}
                </strong>{' '}
                revisión de {number.format(reports.length)} en total.
              </>
            ) : (
              <>Todo al día: {number.format(reports.length)} reportes, ninguno pendiente.</>
            )
          ) : (
            'Lo que la comunidad denuncia, del más reciente al más antiguo.'
          )
        }
      />

      {/* Estados como pestañas con cifra: el conteo y el filtro son la misma cosa. */}
      <div className="stagger mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STATUSES.map((s) => {
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(active ? null : s)}
              className={cn(
                'group relative overflow-hidden rounded-xl border p-4 text-left transition-[border-color,background,transform,box-shadow] duration-200 hover:-translate-y-0.5',
                active
                  ? 'border-ink bg-ink text-paper shadow-pop'
                  : 'border-line bg-surface shadow-card hover:border-line-strong',
              )}
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: STATUS_VAR[s] }}
              />
              <span className={cn('eyebrow', active && '!text-paper/70')}>
                {STATUS_LABEL[s]}
              </span>
              <span className="display tnum mt-2 block text-4xl">
                {reports ? number.format(counts[s] ?? 0) : '–'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex animate-rise flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por folio, título, tipo, ciudad o enlace…"
            aria-label="Buscar reportes"
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filtrar por nivel de riesgo"
          value={risk}
          onValueChange={setRisk}
          className="w-44"
          options={[
            { value: 'ALL', label: 'Todos los riesgos' },
            { value: 'NO_EVALUADO', label: RISK_LABEL.NO_EVALUADO },
            ...RISK_LEVELS.map((level) => ({ value: level, label: RISK_LABEL[level] })),
          ]}
        />
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery('');
              setStatus(null);
              setRisk('ALL');
            }}
          >
            <X />
            Limpiar
          </Button>
        )}
      </div>

      <Card className="animate-rise overflow-hidden">
        <div className="hidden grid-cols-[8.75rem_minmax(0,1fr)_7.25rem_6.75rem_5.5rem_1.25rem] items-center gap-4 border-b border-line bg-sunk/60 px-5 py-2.5 md:grid">
          {['Folio', 'Reporte', 'Estado', 'Riesgo', 'Recibido'].map((heading) => (
            <span key={heading} className="eyebrow">
              {heading}
            </span>
          ))}
        </div>

        {error && (
          <EmptyState
            tone="danger"
            icon={<TriangleAlert />}
            title="No se pudieron cargar los reportes"
            description={error}
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            }
          />
        )}

        {!error && !reports && (
          <ul aria-busy aria-label="Cargando reportes">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0">
                <Skeleton className="h-4 w-28" />
                <span className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </span>
                <Skeleton className="hidden h-6 w-24 rounded-full md:block" />
              </li>
            ))}
          </ul>
        )}

        {reports?.length === 0 && (
          <EmptyState
            icon={<Inbox />}
            title="Todavía no hay reportes"
            description="Cuando alguien denuncie un fraude desde la app aparecerá aquí."
          />
        )}

        {reports && reports.length > 0 && visible.length === 0 && (
          <EmptyState
            icon={<SearchX />}
            title="Nada coincide con esos filtros"
            description="Prueba con otra palabra o quita algún filtro."
          />
        )}

        <ul>
          {visible.map((report) => {
            const extra = extras.get(report.id);
            const isNew = report.status === 'RECIBIDO';
            return (
              <li key={report.id} className="border-b border-line last:border-0">
                <Link
                  href={`/reportes/${report.id}`}
                  className="group relative grid items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-ink/[0.035] focus-visible:bg-ink/[0.035] md:grid-cols-[8.75rem_minmax(0,1fr)_7.25rem_6.75rem_5.5rem_1.25rem]"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-signal transition-transform duration-200 group-hover:scale-y-100"
                  />
                  <span className="flex items-center gap-2 font-mono text-xs text-ink-soft">
                    <span
                      aria-hidden
                      className={cn('size-1.5 rounded-full', isNew ? 'bg-signal' : 'bg-transparent')}
                    />
                    {folio(report.id, report.createdAt)}
                    {isNew && <span className="sr-only">(sin revisar)</span>}
                  </span>

                  <span className="grid min-w-0 gap-1">
                    <span className={cn('truncate text-[15px]', isNew ? 'font-semibold' : 'font-medium')}>
                      {extra?.title ?? report.fraudType}
                    </span>
                    <span className="truncate text-[13px] text-muted">{report.description}</span>
                    <span className="flex items-center gap-3 text-xs text-muted">
                      {extra && (
                        <span className="truncate">
                          {report.fraudType}
                          {extra.city && ` · ${extra.city}`}
                        </span>
                      )}
                      {(report.urls?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Link2 className="size-3" />
                          {report.urls!.length}
                        </span>
                      )}
                      {(report.evidenceUrls?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="size-3" />
                          {report.evidenceUrls!.length}
                        </span>
                      )}
                      {extra && extra.confirmations > 0 && (
                        <span className="flex items-center gap-1" title="Personas que dijeron «Yo también»">
                          <Users className="size-3" />
                          {extra.confirmations}
                        </span>
                      )}
                      {extra && extra.comments > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {extra.comments}
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2 md:contents">
                    <StatusBadge status={report.status} className="justify-self-start" />
                    <RiskMeter level={report.riskLevel} />
                    <time dateTime={report.createdAt} className="tnum text-xs text-muted">
                      {timeAgo(report.createdAt)}
                    </time>
                  </span>
                  <ArrowUpRight className="hidden size-4 -translate-x-1 text-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:text-ink group-hover:opacity-100 md:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      {reports && visible.length > 0 && (
        <p className="eyebrow mt-4 text-right">
          {filtered
            ? `${number.format(visible.length)} de ${number.format(reports.length)}`
            : `${number.format(reports.length)} en total`}
        </p>
      )}
    </>
  );
}
