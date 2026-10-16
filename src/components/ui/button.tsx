import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  // Botón institucional: esquinas rectas y un borde inferior que se hunde al presionar.
  'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold transition-[transform,background-color,box-shadow,color] duration-100 ease-out enabled:active:translate-y-0.5 enabled:active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Ámbar: la acción principal de la pantalla, una sola.
        primary: 'bg-accent text-on-accent shadow-[0_3px_0_var(--accent-ink)] hover:brightness-[0.97]',
        solid: 'bg-ink text-bg shadow-[0_3px_0_rgb(0_0_0/0.45)] hover:bg-ink/90',
        outline: 'border border-line-strong bg-surface text-ink shadow-[0_2px_0_var(--line-strong)] hover:bg-sunk',
        ghost: 'text-ink-2 hover:bg-ink/6 hover:text-ink',
        danger: 'bg-danger text-white shadow-[0_3px_0_rgb(0_0_0/0.35)] hover:brightness-[0.95] dark:text-bg',
      },
      size: {
        sm: 'h-9 px-3 text-[15px]',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-[17px]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* La etiqueta conserva su lugar mientras carga: el botón no cambia de ancho. */}
      <span className={cn('inline-flex items-center gap-1.5 transition-opacity duration-150', loading && 'opacity-0')}>
        {children}
      </span>
      {loading && <LoaderCircle aria-hidden className="spinner absolute" />}
    </button>
  );
}
