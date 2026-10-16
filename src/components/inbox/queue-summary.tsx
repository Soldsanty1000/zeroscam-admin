import { number } from '@/lib/format';
import type { Queue } from '@/lib/reports';
import { cn } from '@/lib/utils';

const STATUS_PLURAL: Record<string, [string, string]> = {
  RECIBIDO: ['recibido', 'recibidos'],
  EN_REVISION: ['en revisión', 'en revisión'],
  VALIDADO: ['validado', 'validados'],
  CANALIZADO: ['canalizado', 'canalizados'],
  RECHAZADO: ['rechazado', 'rechazados'],
};

/** Qué significa cada bandeja, para quien no conoce los estados. */
const QUEUE_HINT: Record<string, string> = {
  open: 'Llegaron y falta decidir si proceden',
  validated: 'Verídicos; falta enviarlos a la autoridad',
  closed: 'Ya tienen una decisión final',
  channeled: 'Enviados a la autoridad',
};

/** "3 recibidos y 2 en revisión". */
function breakdown(queue: Queue, counts: Record<string, number>): string {
  const parts = queue.statuses.map((s) => {
    const n = counts[s] ?? 0;
    const [one, many] = STATUS_PLURAL[s] ?? [s, s];
    return `${number.format(n)} ${n === 1 ? one : many}`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : QUEUE_HINT[queue.id] ?? '';
}

/**
 * Cuántos reportes hay en cada bandeja. Cada fila abre esa bandeja en la
 * lista de abajo.
 */
export function QueueSummary({
  queues,
  counts,
  total,
  active,
  onSelect,
}: {
  queues: readonly Queue[];
  counts: Record<string, number> | undefined;
  total: number | undefined;
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section aria-labelledby="summary-title" className="rounded-md border border-line-strong p-6">
      <h2 id="summary-title" className="text-[17px] font-bold">
        Resumen de la bandeja
      </h2>

      <ul className="mt-3">
        {queues.map((queue) => {
          const count = counts ? queue.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0) : undefined;
          return (
            <li key={queue.id} className="border-b border-line last:border-0">
              <button
                type="button"
                aria-pressed={active === queue.id}
                onClick={() => onSelect(queue.id)}
                className={cn(
                  'group -mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 rounded-sm px-3 py-3.5 text-left outline-none transition-colors duration-100 hover:bg-sunk focus-visible:bg-accent focus-visible:text-on-accent',
                  active === queue.id && 'bg-sunk',
                )}
              >
                <span className="font-semibold underline decoration-1 underline-offset-[0.2em] group-hover:decoration-[3px]">
                  {queue.label}
                </span>
                {count === undefined ? (
                  <span aria-hidden className="skeleton block h-7 w-8 rounded-md" />
                ) : (
                  <span className="tnum text-[1.75rem] leading-none font-bold">{number.format(count)}</span>
                )}
                <span className="col-span-2 text-sm text-ink-2 group-focus-visible:text-on-accent">
                  {counts ? breakdown(queue, counts) : QUEUE_HINT[queue.id]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-1 flex items-baseline justify-between border-t-2 border-ink pt-3 font-bold">
        <span>Total</span>
        {total === undefined ? (
          <span aria-hidden className="skeleton block h-5 w-8 rounded-md" />
        ) : (
          <span className="tnum text-xl">{number.format(total)}</span>
        )}
      </p>
    </section>
  );
}
