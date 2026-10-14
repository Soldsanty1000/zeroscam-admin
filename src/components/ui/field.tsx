import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Los campos sí llevan borde: su límite tiene que verse por contraste propio.
const control =
  'w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-muted hover:border-muted/60 focus-visible:border-accent-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/30 disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-9', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-20 resize-y py-2 leading-relaxed', className)} {...props} />;
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
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
