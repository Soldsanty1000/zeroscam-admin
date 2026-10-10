import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink shadow-[0_1px_0_#ffffff80_inset] transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-ink/40 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/35 disabled:opacity-50 dark:shadow-none';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(control, 'min-h-24 resize-y py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
}

/** Etiqueta de campo con la microtipografía de expediente. */
export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('eyebrow block', className)} {...props} />;
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('grid gap-1.5', className)}>
      <span className="eyebrow">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
