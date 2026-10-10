import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Tinta sobre papel: la acción principal de cada pantalla.
        primary:
          'bg-ink text-paper shadow-[0_1px_0_#ffffff26_inset,0_1px_2px_#0a133040] hover:bg-ink/90',
        // Ámbar: solo para lo que avanza un expediente.
        signal:
          'bg-signal text-[#0a1330] shadow-[0_1px_0_#ffffff66_inset,0_1px_2px_#8a530040] hover:brightness-105',
        outline:
          'border border-line-strong bg-surface text-ink hover:border-ink/50 hover:bg-sunk',
        ghost: 'text-ink-soft hover:bg-ink/6 hover:text-ink',
        danger:
          'border border-danger/40 bg-danger/8 text-danger hover:bg-danger hover:text-paper',
        link: 'h-auto p-0 text-ink underline decoration-line-strong underline-offset-4 hover:decoration-signal',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
