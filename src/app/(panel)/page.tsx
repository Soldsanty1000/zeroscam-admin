'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Inbox, RotateCw, Search, SearchX, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { NextReport } from '@/components/inbox/next-report';
import { QueueSummary } from '@/components/inbox/queue-summary';
import { ReportTable } from '@/components/inbox/report-table';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Select } from '@/components/ui/select';
import { FilterTabs } from '@/components/ui/tabs';
import { canModerate } from '@/lib/access';
import { api, errorMessage } from '@/lib/api';
import { RISK_LABEL, RISK_LEVELS, STATUSES, number } from '@/lib/format';
import {
  MODERATOR_QUEUES,
  OPEN_STATUSES,
  POLICE_QUEUES,
  SORTS,
  SORT_LABEL,
  countByStatus,
  latestValidated,
  matchesQuery,
  nextToReview,
  plural,
  sortReports,
  type Extra,
  type Report,
  type Sort,
} from '@/lib/reports';
import { useSession } from '@/lib/session';

const ALL = 'all';

const today = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const clock = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Lo que vacía cada bandeja, dicho para quien la abre. */
const EMPTY_QUEUE: Record<string, string> = {
  open: 'No hay reportes por atender. Todo lo que llegó ya tiene una decisión.',
  validated: 'No hay reportes validados esperando canalización.',
  closed: 'Todavía no hay reportes cerrados.',
  channeled: 'Todavía no hay reportes canalizados.',
};

/**
 * Títulos, ciudad y confirmaciones, que viven en la vista de la app. Nunca
 * falla: si el rol no puede pedirla (Policía), la bandeja sigue funcionando
 * con el tipo de fraude.
 */
async function fetchTitles(): Promise<Map<number, Extra>> {
  const results = await Promise.allSettled(
    STATUSES.map((s) => api.get<Extra[]>('/community/reports', { params: { scope: 'queue', status: s } })),
  );
  const found = new Map<number, Extra>();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const extra of result.value.data) found.set(extra.id, extra);
  }
  return found;
}

export default function ReportsPage() {
  const { me, setPending } = useSession();
  const moderator = canModerate(me?.role);
  const queues = moderator ? MODERATOR_QUEUES : POLICE_QUEUES;

  const [reports, setReports] = useState<Report[] | null>(null);
  const [extras, setExtras] = useState<Map<number, Extra>>(new Map());
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [queue, setQueue] = useState(queues[0].id);
  const [query, setQuery] = useState('');
  const [risk, setRisk] = useState('ALL');
  const [sort, setSort] = useState<Sort>('priority');
  const search = useRef<HTMLInputElement>(null);
  const inbox = useRef<HTMLElement>(null);

  const apply = useCallback(
    (data: Report[]) => {
      setReports(data);
      setError('');
      setUpdatedAt(new Date());
      setPending(data.filter((r) => OPEN_STATUSES.includes(r.status)).length);
    },
    [setPending],
  );

  useEffect(() => {
    let cancelled = false;
    api
      .get<Report[]>('/reports')
      .then(({ data }) => !cancelled && apply(data))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    // Los títulos llegan aparte: la lista no los espera.
    void fetchTitles().then((found) => !cancelled && setExtras(found));
    return () => {
      cancelled = true;
    };
  }, [apply]);

  async function refresh() {
    setRefreshing(true);
    try {
      const [{ data }, found] = await Promise.all([api.get<Report[]>('/reports'), fetchTitles()]);
      apply(data);
      setExtras(found);
    } catch (e) {
      // Con una lista ya en pantalla no se borra: se avisa y se conserva.
      if (reports) toast.error('No se pudo actualizar la lista', { description: errorMessage(e) });
      else setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }

  // "/" lleva al buscador, salvo que ya se esté escribiendo en algún campo.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key !== '/' || event.metaKey || event.ctrlKey) return;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      search.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const counts = useMemo(() => (reports ? countByStatus(reports) : undefined), [reports]);
  const featured = useMemo(
    () => (reports ? (moderator ? nextToReview(reports) : latestValidated(reports)) : undefined),
    [reports, moderator],
  );

  const statuses = queues.find((q) => q.id === queue)?.statuses;
  const visible = useMemo(() => {
    const matching = (reports ?? []).filter(
      (r) =>
        (!statuses || statuses.includes(r.status)) &&
        (risk === 'ALL' || r.riskLevel === risk) &&
        matchesQuery(r, extras.get(r.id), query),
    );
    return sortReports(matching, sort, extras);
  }, [reports, extras, statuses, query, risk, sort]);

  const filtered = Boolean(query.trim() || risk !== 'ALL');
  const queueLabel = queues.find((q) => q.id === queue)?.label ?? 'Todos';
  const loading = !reports && !error;

  function showQueue(id: string) {
    setQueue(id);
    inbox.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearFilters() {
    setQuery('');
    setRisk('ALL');
  }

  return (
    <>
      <PageHeader
        title="Reportes de fraude"
        description={
          updatedAt
            ? `Datos actualizados el ${today.format(updatedAt)} a las ${clock.format(updatedAt)}.`
            : 'Denuncias que la comunidad envía desde la app de ZeroScam.'
        }
        actions={
          reports && (
            <Button onClick={() => void refresh()} loading={refreshing}>
              <RotateCw aria-hidden />
              Actualizar
            </Button>
          )
        }
      />

      {error && !reports ? (
        <div className="rounded-md border-2 border-danger">
          <EmptyState
            tone="danger"
            icon={<TriangleAlert />}
            title="No se pudieron cargar los reportes"
            description={error}
            action={
              <Button variant="primary" onClick={() => void refresh()} loading={refreshing}>
                Intentar de nuevo
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
          <NextReport
            report={featured}
            extra={featured ? extras.get(featured.id) : undefined}
            moderator={moderator}
            loading={loading}
            onShowQueue={() => showQueue(queues[0].id)}
          />
          <QueueSummary queues={queues} counts={counts} total={reports?.length} active={queue} onSelect={showQueue} />
        </div>
      )}

      <section ref={inbox} aria-labelledby="inbox-title" className="mt-14 scroll-mt-6">
        <h2 id="inbox-title" className="text-[1.75rem] leading-tight font-bold tracking-[-0.01em]">
          Bandeja de reportes
        </h2>

        <div className="mt-4">
          <FilterTabs
            aria-label="Bandeja"
            value={queue}
            onValueChange={setQueue}
            items={[
              ...queues.map((q) => ({
                value: q.id,
                label: q.label,
                count: counts ? q.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0) : undefined,
              })),
              { value: ALL, label: 'Todos', count: reports?.length },
            ]}
          />
        </div>

        <div className="mt-6 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_13rem_16rem]">
          <Field label="Buscar" className="sm:col-span-2 lg:col-span-1">
            <span className="relative block">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
              <Input
                ref={search}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
                placeholder="Folio, título, tipo de fraude, ciudad o enlace"
                className="pl-10 [&::-webkit-search-cancel-button]:hidden"
              />
            </span>
          </Field>
          <Field label="Riesgo">
            <Select
              aria-label="Riesgo"
              value={risk}
              onValueChange={setRisk}
              options={[
                { value: 'ALL', label: 'Cualquier nivel' },
                { value: 'NO_EVALUADO', label: RISK_LABEL.NO_EVALUADO },
                ...RISK_LEVELS.map((level) => ({ value: level, label: RISK_LABEL[level] })),
              ]}
            />
          </Field>
          <Field label="Ordenar por">
            <Select
              aria-label="Ordenar por"
              value={sort}
              onValueChange={(next) => setSort(next as Sort)}
              options={SORTS.filter((s) => s !== 'support' || extras.size > 0).map((s) => ({ value: s, label: SORT_LABEL[s] }))}
            />
          </Field>
        </div>

        {reports && reports.length > 0 && (
          <p className="tnum mt-8 mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[17px]" aria-live="polite">
            <span>
              <strong>{plural(visible.length, 'reporte', 'reportes')}</strong>
              {queue !== ALL && ` en «${queueLabel}»`}
              {filtered && ' con estos filtros'}
            </span>
            {filtered && (
              <button type="button" onClick={clearFilters} className="link text-[15px]">
                Quitar filtros
              </button>
            )}
          </p>
        )}

        {loading && (
          <div aria-busy aria-label="Cargando reportes" className="mt-8 border-t-2 border-ink">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="grid gap-2 border-b border-line py-5">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            ))}
          </div>
        )}

        {reports?.length === 0 && (
          <div className="mt-8 rounded-md border border-line-strong">
            <EmptyState
              icon={<Inbox />}
              title="Todavía no hay reportes"
              description={
                moderator
                  ? 'Cuando alguien denuncie un fraude desde la app aparecerá aquí, listo para revisarse.'
                  : 'Cuando el equipo valide un reporte aparecerá aquí.'
              }
            />
          </div>
        )}

        {reports && reports.length > 0 && visible.length === 0 && (
          <div className="rounded-md border border-line-strong">
            {filtered ? (
              <EmptyState
                icon={<SearchX />}
                title="Ningún reporte coincide con la búsqueda o los filtros"
                action={<Button onClick={clearFilters}>Quitar filtros</Button>}
              />
            ) : (
              <EmptyState icon={<Inbox />} title={EMPTY_QUEUE[queue] ?? 'No hay reportes aquí.'} />
            )}
          </div>
        )}

        {visible.length > 0 && (
          <ReportTable
            reports={visible}
            extras={extras}
            caption={`Reportes ${queue === ALL ? 'de todas las bandejas' : `en «${queueLabel}»`}, ordenados por ${SORT_LABEL[sort].toLowerCase()}`}
          />
        )}

        {reports && visible.length > 0 && (
          <p className="tnum mt-4 text-[15px] text-ink-2">
            Mostrando {number.format(visible.length)} de {plural(reports.length, 'reporte', 'reportes')} en total.
          </p>
        )}
      </section>
    </>
  );
}
