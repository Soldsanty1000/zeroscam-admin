'use client';

import { ThemeProvider } from 'next-themes';
import { Tooltip } from 'radix-ui';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <Tooltip.Provider delayDuration={250}>{children}</Tooltip.Provider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              'flex w-[22rem] items-start gap-3 rounded-lg border border-line-strong bg-surface p-4 text-sm text-ink shadow-pop',
            title: 'font-medium leading-snug',
            description: 'text-muted',
            icon: 'mt-0.5',
            error: '[&_[data-icon]]:text-danger',
            success: '[&_[data-icon]]:text-ok',
          },
        }}
      />
    </ThemeProvider>
  );
}
