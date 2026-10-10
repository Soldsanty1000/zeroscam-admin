'use client';

import { Select as SelectPrimitive } from 'radix-ui';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Option = { value: string; label: string };

/**
 * Selector con el aspecto del panel. `value` vacío no existe en Radix: para
 * "Todos" se usa la opción `ALL`.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  name,
  className,
  size = 'md',
  'aria-label': ariaLabel,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'group inline-flex w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink shadow-[0_1px_0_#ffffff80_inset] transition-[border-color,box-shadow] hover:border-ink/40 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/35 disabled:opacity-50 data-[placeholder]:text-muted dark:shadow-none',
          size === 'sm' ? 'h-8 text-[13px]' : 'h-10',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronsUpDown className="size-3.5 text-muted transition-colors group-hover:text-ink" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line-strong bg-surface p-1 shadow-pop data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex h-9 cursor-default select-none items-center rounded-md pl-8 pr-3 text-sm text-ink outline-none data-[highlighted]:bg-ink data-[highlighted]:text-paper"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2.5">
                  <Check className="size-3.5" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
