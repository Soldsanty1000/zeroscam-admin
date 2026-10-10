import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ZeroScam — Mesa de control', template: '%s · ZeroScam' },
  description: 'Revisión de reportes de fraude, cuentas y estadísticas de ZeroScam.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // next-themes pone la clase del tema antes de que React hidrate.
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
