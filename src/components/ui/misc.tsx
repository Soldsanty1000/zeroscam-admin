import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-ink/8', className)}
      {...props}
    />
  );
}

/** Estado vacío o de error de una lista: un ícono, una frase y, si aplica, una salida. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className="flex flex-col items-center gap-3 px-6 py-14 text-center"
    >
      <div
        className={cn(
          'grid size-12 place-items-center rounded-full border [&_svg]:size-5',
          tone === 'danger'
            ? 'border-danger/30 bg-danger/8 text-danger'
            : 'border-line-strong bg-sunk text-ink-soft',
        )}
      >
        {icon}
      </div>
      <p className="display text-xl">{title}</p>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action}
    </div>
  );
}

/** Aviso en línea dentro de un formulario. */
export function InlineAlert({
  children,
  tone = 'danger',
}: {
  children: React.ReactNode;
  tone?: 'danger' | 'ok';
}) {
  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'danger'
          ? 'border-danger/30 bg-danger/8 text-danger'
          : 'border-ok/30 bg-ok/8 text-ok',
      )}
    >
      {children}
    </p>
  );
}
