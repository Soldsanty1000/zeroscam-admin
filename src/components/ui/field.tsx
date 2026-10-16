import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Campos con borde de 2 px: su límite se ve sin buscarlo. Con foco, borde
// oscuro y halo ámbar, igual que el resto de lo que se puede usar.
const control =
  'w-full rounded-sm border-2 border-field bg-surface px-3 text-base text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-11', className)} {...props} />;
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
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      {hint && <span className="-mt-1 text-sm text-ink-2">{hint}</span>}
      {children}
    </label>
  );
}
