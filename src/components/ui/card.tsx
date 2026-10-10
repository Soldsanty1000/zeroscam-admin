import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Hoja del expediente: superficie clara con borde y sombra corta. */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'relative rounded-xl border border-line bg-surface shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  eyebrow,
  action,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn('flex items-end justify-between gap-4 px-5 pt-5 pb-3', className)}
    >
      <div className="grid gap-1">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="display text-xl">{title}</h2>
      </div>
      {action}
    </header>
  );
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}
