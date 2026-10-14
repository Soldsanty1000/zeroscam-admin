import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  // Se hunde al presionar (0.97, 160 ms): confirma que la interfaz escuchó.
  'relative inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-[transform,background-color,box-shadow,color] duration-150 ease-out enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Ámbar: la acción principal de la pantalla, una sola.
        primary:
          'bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(10_19_48/0.2)] hover:brightness-[1.04]',
        solid: 'bg-ink text-bg hover:bg-ink/90',
        outline: 'bg-surface text-ink shadow-card hover:bg-sunk',
        ghost: 'text-ink-2 hover:bg-ink/6 hover:text-ink',
        danger: 'bg-danger-wash text-danger hover:bg-danger hover:text-white dark:hover:text-bg',
      },
      size: {
        sm: 'h-8 px-2.5 text-[13px]',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-8',
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
