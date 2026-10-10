'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  Lock,
  MapPin,
  MessageSquare,
  Paperclip,
  ShieldAlert,
  TriangleAlert,
  Users,
  VenetianMask,
} from 'lucide-react';
import { toast } from 'sonner';
import { RiskMeter, StatusBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Textarea } from '@/components/ui/field';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { API_URL, api, errorMessage } from '@/lib/api';
import {
  RISK_LABEL,
  RISK_LEVELS,
  RISK_ORDER,
  STATUS_LABEL,
  defang,
  folio,
  formatDateTime,
  initials,
  timeAgo,
} from '@/lib/format';
import { isStaff, useMe } from '@/lib/session';
import { cn } from '@/lib/utils';

type Report = {
  id: number;
  fraudType: string;
  status: string;
  riskLevel: string;
  description: string;
  incidentDate: string;
  createdAt: string;
  urls: string[];
  evidenceUrls: string[];
  history?: {
    fromStatus: string | null;
    toStatus: string;
    observations?: string;
    changedAt: string;
  }[];
  reporter?: { name: string; lastName: string; email: string; country: string };
  message?: string;
};

/** Lo que solo guarda la vista de la app (`GET /community/reports/:id`). */
type Extra = {
  title: string;
  city: string;
  anonymous: boolean;
  otherType?: string;
  suspiciousText?: string;
  affectedPerson?: { name: string; contact: string };
  confirmations: number;
  comments: number;
  author: { name: string };
};

/** A qué estados se puede mover un reporte desde cada uno; los finales, a ninguno. */
const NEXT: Record<string, string[]> = {
  RECIBIDO: ['EN_REVISION', 'RECHAZADO'],
  EN_REVISION: ['VALIDADO', 'RECHAZADO'],
  VALIDADO: ['CANALIZADO'],
  RECHAZADO: [],
  CANALIZADO: [],
};

const STATUS_VAR: Record<string, string> = {
  RECIBIDO: 'var(--st-recibido)',
  EN_REVISION: 'var(--st-revision)',
  VALIDADO: 'var(--st-validado)',
  RECHAZADO: 'var(--st-rechazado)',
  CANALIZADO: 'var(--st-canalizado)',
};

const isImage = (path: string) => /\.(jpe?g|png|gif|webp)$/i.test(path);

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const canModerate = isStaff(me);
  const [report, setReport] = useState<Report | null>(null);
  const [extra, setExtra] = useState<Extra | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [risk, setRisk] = useState('');

  const load = useCallback(() => {
    // La vista de la app es un extra: si el rol no puede pedirla, no pasa nada.
    api
      .get<Extra>(`/community/reports/${id}`)
      .then(({ data }) => setExtra(data))
      .catch(() => setExtra(null));
    return api
      .get<Report>(`/reports/${id}`)
      .then(({ data }) => {
        setReport(data);
        setRisk(data.riskLevel);
        setNextStatus(NEXT[data.status]?.[0] ?? '');
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(path: string, body: object) {
    setSending(true);
    try {
      const { data } = await api.patch<Report>(`/reports/${id}/${path}`, body);
      toast.success(data.message ?? 'Cambio guardado');
      // El PATCH no regresa `history` ni `reporter`: se vuelve a pedir el detalle.
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
    setSending(false);
  }

  async function handleExport() {
    setSending(true);
    try {
      const { data } = await api.get<{ folio: string }>(`/reports/${id}/export`);
      // Un enlace normal no puede mandar el Bearer: el expediente se pide
      // con `api` y el archivo se arma aquí con lo que regresó.
      const file = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = `${data.folio}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`Expediente ${data.folio} descargado`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
    setSending(false);
  }

  function handleStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const observations = String(new FormData(form).get('observations')).trim();
    send('status', {
      status: nextStatus,
      // El servidor rechaza un texto vacío: si no hay, no se manda.
      ...(observations && { observations }),
    }).then(() => form.reset());
  }

  if (error) {
    return (
      <Card>
        <EmptyState
          tone="danger"
          icon={<TriangleAlert />}
          title="No se pudo abrir el reporte"
          description={error}
          action={
            <Button asChild variant="outline">
              <Link href="/">Volver a la bandeja</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  if (!report) return <Loading />;

  const options = NEXT[report.status] ?? [];
  const exportable = report.status === 'VALIDADO' || report.status === 'CANALIZADO';
  const type = extra?.otherType ?? report.fraudType;

  return (
    <>
      <Link
        href="/"
        className="group mb-6 inline-flex animate-fade items-center gap-2 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Bandeja de reportes
      </Link>

      <header className="mb-8 grid animate-rise gap-4">
        <span className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
          <span aria-hidden className="h-px w-6 bg-signal" />
          <span className="text-ink">{folio(report.id, report.createdAt)}</span>
          <span aria-hidden>·</span>
          {type}
        </span>
        <h1 className="display max-w-3xl text-4xl sm:text-5xl">{extra?.title ?? report.fraudType}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
          <StatusBadge status={report.status} />
          <RiskMeter level={report.riskLevel} />
          {extra?.city && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted" />
              {extra.city}
            </span>
          )}
          {extra && extra.confirmations > 0 && (
            <span className="flex items-center gap-1.5" title="Personas que dijeron «Yo también»">
              <Users className="size-3.5 text-muted" />
              {extra.confirmations}
            </span>
          )}
          {extra && extra.comments > 0 && (
            <span className="flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-muted" />
              {extra.comments}
            </span>
          )}
          <span className="text-muted">Recibido {timeAgo(report.createdAt)}</span>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="stagger grid gap-6">
          <Card>
            <CardHeader eyebrow="Relato" title="Qué pasó" />
            <CardBody className="grid gap-5">
              <p className="max-w-prose text-[15px] leading-[1.7] whitespace-pre-line text-ink">
                {report.description}
              </p>
              <dl className="grid gap-x-8 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
                <Datum label="Ocurrió" value={formatDateTime(report.incidentDate)} />
                <Datum label="Se reportó" value={formatDateTime(report.createdAt)} />
              </dl>
            </CardBody>
          </Card>

          {(report.urls.length > 0 || extra?.suspiciousText) && (
            <Card>
              <CardHeader
                eyebrow="No abrir"
                title={report.urls.length > 0 ? 'Enlaces reportados' : 'Dato reportado'}
              />
              <CardBody className="grid gap-2">
                {report.urls.map((url) => (
                  <DefangedUrl key={url} url={url} />
                ))}
                {extra?.suspiciousText && (
                  <p className="rounded-md border border-line bg-sunk px-3 py-2.5 font-mono text-[13px] leading-relaxed break-words">
                    {extra.suspiciousText}
                  </p>
                )}
                {report.urls.length > 0 && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <ShieldAlert className="size-3.5" />
                    Se muestran desactivados para que nadie los abra por accidente.
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader
              eyebrow="Pruebas"
              title="Evidencia"
              action={
                <span className="eyebrow">
                  {report.evidenceUrls.length}{' '}
                  {report.evidenceUrls.length === 1 ? 'archivo' : 'archivos'}
                </span>
              }
            />
            <CardBody>
              {report.evidenceUrls.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Paperclip className="size-4" />
                  El denunciante no adjuntó archivos.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {report.evidenceUrls.map((path) => (
                    <li key={path}>
                      <a
                        href={API_URL + path}
                        target="_blank"
                        rel="noreferrer"
                        className="group block overflow-hidden rounded-lg border border-line bg-sunk transition-[border-color,box-shadow] hover:border-ink/40 hover:shadow-card"
                      >
                        <span className="grid aspect-[4/3] place-items-center overflow-hidden">
                          {isImage(path) ? (
                            // eslint-disable-next-line @next/next/no-img-element -- el archivo vive en la API, fuera del optimizador de Next
                            <img
                              src={API_URL + path}
                              alt="Evidencia adjunta al reporte"
                              loading="lazy"
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <FileText className="size-8 text-muted" />
                          )}
                        </span>
                        <span className="block truncate border-t border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink-soft">
                          {path.replace('/uploads/', '')}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader eyebrow="Bitácora" title="Historial" />
            <CardBody>
              {!report.history || report.history.length === 0 ? (
                <p className="text-sm text-muted">Sin cambios todavía.</p>
              ) : (
                <ol className="relative grid gap-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line-strong">
                  {report.history.map((entry, index) => (
                    <li key={index} className="relative grid gap-1 pl-7">
                      <span
                        aria-hidden
                        className="absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-surface"
                        style={{ background: STATUS_VAR[entry.toStatus] ?? 'var(--muted)' }}
                      />
                      <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        {entry.fromStatus && entry.fromStatus !== entry.toStatus && (
                          <span className="text-muted">
                            {STATUS_LABEL[entry.fromStatus] ?? entry.fromStatus} →
                          </span>
                        )}
                        <strong className="font-medium">
                          {STATUS_LABEL[entry.toStatus] ?? entry.toStatus}
                        </strong>
                        <time dateTime={entry.changedAt} className="tnum text-xs text-muted">
                          {formatDateTime(entry.changedAt)}
                        </time>
                      </span>
                      {entry.observations && (
                        <span className="text-sm leading-relaxed text-ink-soft">
                          {entry.observations}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Columna de decisiones: se queda a la vista mientras se lee el expediente. */}
        <aside className="stagger grid gap-6 lg:sticky lg:top-8">
          {canModerate && (
            <Card className="overflow-hidden">
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: STATUS_VAR[report.status] }} />
              <CardHeader eyebrow="Resolución" title="Cambiar estado" />
              <CardBody>
                {options.length === 0 ? (
                  <p className="text-sm leading-relaxed text-ink-soft">
                    <strong className="font-medium text-ink">{STATUS_LABEL[report.status]}</strong> es un
                    estado final: este reporte ya no cambia.
                  </p>
                ) : (
                  <form onSubmit={handleStatus} className="grid gap-4">
                    <div role="radiogroup" aria-label="Estado nuevo" className="grid gap-2">
                      {options.map((option) => {
                        const active = nextStatus === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setNextStatus(option)}
                            className={cn(
                              'flex h-11 items-center gap-3 rounded-md border px-3 text-sm transition-colors',
                              active
                                ? 'border-ink bg-ink text-paper'
                                : 'border-line-strong bg-surface hover:border-ink/50',
                            )}
                          >
                            <span
                              aria-hidden
                              className="size-2 rounded-full"
                              style={{ background: STATUS_VAR[option] }}
                            />
                            {STATUS_LABEL[option]}
                            {active && <Check className="ml-auto size-4" />}
                          </button>
                        );
                      })}
                    </div>
                    <Field
                      label={nextStatus === 'RECHAZADO' ? 'Motivo del rechazo' : 'Observaciones'}
                      hint={
                        nextStatus === 'RECHAZADO'
                          ? 'Obligatorio. El denunciante lo verá en su notificación.'
                          : 'Opcional. El denunciante las verá en su notificación.'
                      }
                    >
                      <Textarea
                        name="observations"
                        rows={3}
                        required={nextStatus === 'RECHAZADO'}
                        maxLength={500}
                        placeholder="Qué revisaste y por qué…"
                      />
                    </Field>
                    <Button
                      type="submit"
                      variant={nextStatus === 'RECHAZADO' ? 'danger' : 'signal'}
                      disabled={sending || !nextStatus}
                    >
                      Pasar a {STATUS_LABEL[nextStatus]?.toLowerCase()}
                    </Button>
                  </form>
                )}
              </CardBody>
            </Card>
          )}

          {canModerate && (
            <Card>
              <CardHeader eyebrow="Clasificación" title="Nivel de riesgo" />
              <CardBody className="grid gap-4">
                <div role="radiogroup" aria-label="Nivel de riesgo" className="grid grid-cols-4 gap-1.5">
                  {RISK_LEVELS.map((level) => {
                    const active = risk === level;
                    const color = `var(--risk-${RISK_ORDER.indexOf(level)})`;
                    return (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setRisk(level)}
                        className={cn(
                          'grid gap-2 rounded-md border px-1 pt-2.5 pb-2 text-center text-[11px] font-medium transition-[border-color,background]',
                          active ? 'border-ink bg-ink/5' : 'border-line hover:border-line-strong',
                        )}
                      >
                        <span
                          aria-hidden
                          className="mx-auto h-1.5 w-8 rounded-full transition-opacity"
                          style={{ background: color, opacity: active ? 1 : 0.45 }}
                        />
                        {RISK_LABEL[level]}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  disabled={sending || risk === report.riskLevel || !RISK_LEVELS.includes(risk as never)}
                  onClick={() => send('risk', { riskLevel: risk })}
                >
                  {risk === report.riskLevel ? 'Sin cambios' : `Guardar: ${RISK_LABEL[risk]?.toLowerCase()}`}
                </Button>
              </CardBody>
            </Card>
          )}

          {(report.reporter || extra) && (
            <Card>
              <CardHeader eyebrow="Origen" title="Denunciante" />
              <CardBody className="grid gap-4">
                {report.reporter ? (
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong bg-sunk font-mono text-xs font-medium">
                      {initials(report.reporter.name, report.reporter.lastName)}
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {report.reporter.name} {report.reporter.lastName}
                      </span>
                      <span className="truncate text-xs text-muted">{report.reporter.email}</span>
                      <span className="text-xs text-muted">{report.reporter.country}</span>
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">{extra?.author.name}</p>
                )}
                {extra?.anonymous && (
                  <p className="flex items-start gap-2 rounded-md border border-line bg-sunk px-3 py-2 text-xs leading-relaxed text-ink-soft">
                    <VenetianMask className="mt-px size-4 shrink-0" />
                    Pidió publicar el reporte de forma anónima: la comunidad no ve su nombre.
                  </p>
                )}
                {extra?.affectedPerson && (
                  <div className="grid gap-1 border-t border-line pt-4">
                    <span className="eyebrow flex items-center gap-1.5">
                      <Lock className="size-3" />
                      Persona afectada · privado
                    </span>
                    <span className="text-sm font-medium">{extra.affectedPerson.name}</span>
                    <span className="font-mono text-xs text-ink-soft">{extra.affectedPerson.contact}</span>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader eyebrow="Canalización" title="Expediente" />
            <CardBody className="grid gap-4">
              <p className="text-sm leading-relaxed text-ink-soft">
                Archivo con el formato para la Policía Cibernética: datos, enlaces con su riesgo,
                evidencias con su huella e historial.
              </p>
              <Button variant="primary" disabled={sending || !exportable} onClick={handleExport}>
                <Download />
                Descargar expediente
              </Button>
              {!exportable && (
                <p className="text-xs text-muted">Disponible cuando el reporte esté validado o canalizado.</p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="tnum text-sm">{value}</dd>
    </div>
  );
}

function DefangedUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const safe = defang(url);
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-sunk py-1.5 pr-1.5 pl-3">
      <code className="min-w-0 flex-1 font-mono text-[13px] break-all">{safe}</code>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Copiar enlace desactivado"
        onClick={() => {
          navigator.clipboard.writeText(safe).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? <Check className="text-ok" /> : <Copy />}
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  );
}

function Loading() {
  return (
    <div aria-busy aria-label="Cargando reporte" className="grid gap-6">
      <Skeleton className="h-4 w-40" />
      <div className="grid gap-3">
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-12 w-3/5" />
        <Skeleton className="h-6 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
