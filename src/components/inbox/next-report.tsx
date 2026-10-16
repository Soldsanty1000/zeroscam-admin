import Link from 'next/link';
import { CircleCheck, Clock, TriangleAlert } from 'lucide-react';
import { RiskMeter, StatusBadge } from '@/components/badges';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { RISK_LABEL, folio, number, timeAgo } from '@/lib/format';
import { pathWithId } from '@/lib/ids';
import { HIGH_RISK, type Extra, type Report } from '@/lib/reports';

/** Por qué este reporte va primero, dicho en una frase. */
function reason(report: Report): { text: string; urgent: boolean } {
  if (report.riskLevel !== 'NO_EVALUADO') {
    return {
      text: `Tiene riesgo ${RISK_LABEL[report.riskLevel]?.toLowerCase() ?? report.riskLevel} y sigue abierto.`,
      urgent: HIGH_RISK.includes(report.riskLevel),
    };
  }
  return { text: `Nadie lo ha evaluado todavía y llegó ${timeAgo(report.createdAt)}.`, urgent: false };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-1">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

const panel = 'rounded-md bg-sunk p-6 sm:p-8';

/**
 * El bloque principal del inicio: qué reporte abrir ahora y por qué. Para
 * Policía, que no revisa, muestra el validado más reciente.
 */
export function NextReport({
  report,
  extra,
  moderator,
  loading,
  onShowQueue,
}: {
  report: Report | undefined;
  extra: Extra | undefined;
  moderator: boolean;
  loading: boolean;
  onShowQueue: () => void;
}) {
  const heading = moderator ? 'Siguiente reporte por revisar' : 'Último reporte validado';

  if (loading) {
    return (
      <section aria-busy aria-label={heading} className={panel}>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-6 h-4 w-32" />
        <Skeleton className="mt-3 h-8 w-3/4" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <Skeleton className="mt-8 h-12 w-56" />
      </section>
    );
  }

  if (!report) {
    return (
      <section aria-labelledby="next-title" className={panel}>
        <h2 id="next-title" className="text-[17px] font-bold text-ink-2">
          {heading}
        </h2>
        <p className="mt-5 flex items-center gap-3 text-[1.75rem] leading-tight font-bold">
          <CircleCheck aria-hidden className="size-8 shrink-0 text-ok" />
          {moderator ? 'No hay reportes por atender' : 'No hay reportes validados'}
        </p>
        <p className="mt-3 max-w-[55ch] text-[17px] text-ink-2">
          {moderator
            ? 'Todo lo que llegó ya tiene una decisión. Los reportes nuevos aparecerán aquí en cuanto alguien los envíe desde la app.'
            : 'Cuando el equipo de revisión valide un reporte, aparecerá aquí.'}
        </p>
      </section>
    );
  }

  const why = moderator
    ? reason(report)
    : { text: 'El equipo de revisión lo validó y falta canalizarlo a la autoridad.', urgent: false };
  const Icon = why.urgent ? TriangleAlert : Clock;

  return (
    <section aria-labelledby="next-title" className={panel}>
      <h2 id="next-title" className="text-[17px] font-bold text-ink-2">
        {heading}
      </h2>

      <p className="mt-5 font-mono text-[15px] text-ink-2">{folio(report.id, report.createdAt)}</p>
      <p className="mt-1 text-[1.75rem] leading-tight font-bold tracking-[-0.01em] sm:text-[2rem]">
        {extra?.title ?? report.fraudType}
      </p>
      <p className="mt-3 flex items-start gap-2 text-[17px]">
        <Icon aria-hidden className={why.urgent ? 'mt-0.5 size-5 shrink-0 text-accent-ink' : 'mt-0.5 size-5 shrink-0 text-ink-2'} />
        {why.text}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line-strong pt-6 sm:grid-cols-3">
        <Fact label="Estado">
          <StatusBadge status={report.status} />
        </Fact>
        <Fact label="Riesgo">
          <RiskMeter level={report.riskLevel} />
        </Fact>
        <Fact label="Recibido">{timeAgo(report.createdAt)}</Fact>
        <Fact label="Tipo de fraude">{report.fraudType}</Fact>
        <Fact label="Ciudad">{extra?.city || 'Sin dato'}</Fact>
        <Fact label="Lo confirman">
          {extra ? (extra.confirmations === 1 ? '1 persona' : `${number.format(extra.confirmations)} personas`) : 'Sin dato'}
        </Fact>
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link href={pathWithId('/reportes/', report.id)} className={buttonVariants({ variant: 'primary', size: 'lg' })}>
          {moderator ? 'Revisar este reporte' : 'Ver este reporte'}
        </Link>
        <button type="button" onClick={onShowQueue} className="link text-[17px]">
          {moderator ? 'Ver todos los que esperan' : 'Ver todos los validados'}
        </button>
      </div>
    </section>
  );
}
