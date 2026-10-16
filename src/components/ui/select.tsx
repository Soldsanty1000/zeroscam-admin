'use client';

import { Select as Base } from '@base-ui/react/select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Option = { value: string; label: string };

/** Selector. "Todos" es la opción `ALL`: un valor vacío no se puede elegir. */
export function Select({
  value,
  onValueChange,
  options,
  disabled,
  className,
  size = 'md',
  'aria-label': ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}) {
  return (
    <Base.Root
      items={options}
      value={value}
      onValueChange={(next) => next !== null && onValueChange(next as string)}
      disabled={disabled}
    >
      <Base.Trigger
        aria-label={ariaLabel}
        className={cn(
          'group inline-flex w-full select-none items-center justify-between gap-2 rounded-sm border-2 border-field bg-surface pr-2.5 pl-3 text-ink transition-[border-color,box-shadow] duration-150 focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-accent data-[disabled]:opacity-50 data-[popup-open]:border-ink',
          size === 'sm' ? 'h-9 text-[15px]' : 'h-11 text-base',
          className,
        )}
      >
        <Base.Value className="truncate" />
        <Base.Icon className="text-muted transition-colors group-hover:text-ink">
          <ChevronsUpDown className="size-4" />
        </Base.Icon>
      </Base.Trigger>
      <Base.Portal>
        <Base.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50 outline-none">
          <Base.Popup className="pop max-h-80 min-w-[var(--anchor-width)] overflow-y-auto overscroll-contain rounded-md border border-line-strong bg-surface p-1 shadow-pop outline-none">
            {options.map((option) => (
              <Base.Item
                key={option.value}
                value={option.value}
                className="grid h-10 cursor-default select-none grid-cols-[1rem_1fr] items-center gap-2 rounded-sm pr-3 pl-2 text-base text-ink outline-none data-[highlighted]:bg-sunk"
              >
                <Base.ItemIndicator className="col-start-1">
                  <Check className="size-3.5" />
                </Base.ItemIndicator>
                <Base.ItemText className="col-start-2">{option.label}</Base.ItemText>
              </Base.Item>
            ))}
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}
