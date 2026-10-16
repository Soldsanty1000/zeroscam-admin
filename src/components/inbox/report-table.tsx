'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import { RiskMeter, StatusBadge } from '@/components/badges';
import { defang, folio, formatDateTime, number, timeAgo } from '@/lib/format';
import { pathWithId } from '@/lib/ids';
import { plural, type Extra, type Report } from '@/lib/reports';

/** "2 archivos y 1 enlace", o vacío si no trae evidencia. */
function evidenceOf(report: Report): string {
  const files = report.evidenceUrls?.length ?? 0;
  const links = report.urls?.length ?? 0;
  return [files > 0 && plural(files, 'archivo', 'archivos'), links > 0 && plural(links, 'enlace', 'enlaces')]
    .filter(Boolean)
    .join(' y ');
}

/** Lo que va debajo del título: tipo y ciudad, o la descripción si no hay título. */
function Detail({ report, extra }: { report: Report; extra: Extra | undefined }) {
  const evidence = evidenceOf(report);
  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-3 text-[15px] text-ink-2">
      <span className="min-w-0 truncate">
        {extra ? `${report.fraudType}${extra.city ? ` en ${extra.city}` : ''}` : defang(report.description, { prose: true })}
      </span>
      {evidence && (
        <span title={`Evidencia: ${evidence}`} className="flex shrink-0 items-center gap-1 text-muted">
          <Paperclip aria-hidden className="size-4" />
          <span className="sr-only">Evidencia: {evidence}</span>
        </span>
      )}
    </span>
  );
}

function Received({ createdAt }: { createdAt: string }) {
  return (
    <time dateTime={createdAt} title={formatDateTime(createdAt)} className="tnum whitespace-nowrap">
      {timeAgo(createdAt)}
    </time>
  );
}

const th = 'py-3 pr-4 text-left align-bottom text-[15px] font-bold last:pr-0';
const td = 'py-4 pr-4 align-middle last:pr-0';

/**
 * La lista de reportes. En pantallas anchas es una tabla con encabezados; en
 * angostas, una lista donde cada reporte ocupa un bloque. En las dos el
 * título es el enlace al detalle, y en la tabla también lo es toda la fila.
 */
export function ReportTable({
  reports,
  extras,
  caption,
}: {
  reports: readonly Report[];
  extras: ReadonlyMap<number, Extra>;
  caption: string;
}) {
  const router = useRouter();
  const hasExtras = extras.size > 0;

  return (
    <>
      <table className="arrive hidden w-full table-fixed border-collapse md:table">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[9.5rem]" />
          <col />
          <col className="w-[8rem]" />
          <col className="w-[8rem]" />
          {hasExtras && <col className="w-[7.5rem]" />}
          <col className="w-[10rem]" />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className={th}>
              Folio
            </th>
            <th scope="col" className={th}>
              Reporte
            </th>
            <th scope="col" className={th}>
              Estado
            </th>
            <th scope="col" className={th}>
              Riesgo
            </th>
            {hasExtras && (
              <th scope="col" className={`${th} text-right`}>
                Lo confirman
              </th>
            )}
            <th scope="col" className={`${th} pl-8`}>
              Recibido
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => {
            const extra = extras.get(report.id);
            const href = pathWithId('/reportes/', report.id);
            return (
              <tr
                key={report.id}
                // El clic en cualquier parte de la fila abre el reporte; el
                // teclado y los lectores de pantalla usan el enlace del título.
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a')) return;
                  router.push(href);
                }}
                className="cursor-pointer border-b border-line transition-colors duration-100 hover:bg-sunk"
              >
                <td className={`${td} font-mono text-[15px] text-ink-2`}>{folio(report.id, report.createdAt)}</td>
                <td className={td}>
                  <Link href={href} className="link block truncate text-[17px] font-semibold">
                    {extra?.title ?? report.fraudType}
                  </Link>
                  <Detail report={report} extra={extra} />
                </td>
                <td className={td}>
                  <StatusBadge status={report.status} />
                </td>
                <td className={td}>
                  <RiskMeter level={report.riskLevel} />
                </td>
                {hasExtras && (
                  <td className={`${td} tnum text-right text-[17px] font-semibold`}>
                    {extra ? number.format(extra.confirmations) : '—'}
                  </td>
                )}
                <td className={`${td} pl-8 text-[15px]`}>
                  <Received createdAt={report.createdAt} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul aria-label={caption} className="arrive border-t-2 border-ink md:hidden">
        {reports.map((report) => {
          const extra = extras.get(report.id);
          return (
            <li key={report.id} className="grid gap-2 border-b border-line py-4">
              <span className="font-mono text-sm text-ink-2">{folio(report.id, report.createdAt)}</span>
              <span className="grid min-w-0">
                <Link href={pathWithId('/reportes/', report.id)} className="link text-[17px] font-semibold">
                  {extra?.title ?? report.fraudType}
                </Link>
                <Detail report={report} extra={extra} />
              </span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
                <StatusBadge status={report.status} />
                <RiskMeter level={report.riskLevel} />
                <Received createdAt={report.createdAt} />
              </span>
              {extra && extra.confirmations > 0 && (
                <span className="text-[15px] text-ink-2">
                  {extra.confirmations === 1 ? '1 persona lo confirma' : `${number.format(extra.confirmations)} personas lo confirman`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
