import { cn } from '@/lib/utils';

/** El cero tachado: un sello de "cero fraude". */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn('size-9', className)}>
      <rect width="40" height="40" rx="10" fill="var(--ink)" />
      <ellipse cx="20" cy="20" rx="8" ry="11" fill="none" stroke="var(--paper)" strokeWidth="2.6" />
      <path d="M11 31 29 9" stroke="var(--signal)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <BrandMark />
      <span className="grid leading-none">
        <span className="display text-[1.35rem] tracking-tight">
          Zero<span className="italic text-signal-ink">Scam</span>
        </span>
        <span className="eyebrow mt-1 text-[0.625rem]">Mesa de control</span>
      </span>
    </span>
  );
}
