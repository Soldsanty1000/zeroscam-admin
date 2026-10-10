'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesColumn, FileStack, LogOut, Users } from 'lucide-react';
import { logout } from '@/lib/api';
import { initials } from '@/lib/format';
import { isStaff, useMe } from '@/lib/session';
import { cn } from '@/lib/utils';
import { RoleBadge } from './badges';
import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';
import { Skeleton } from './ui/misc';

const NAV = [
  { href: '/', label: 'Reportes', icon: FileStack, staffOnly: false },
  { href: '/usuarios', label: 'Usuarios', icon: Users, staffOnly: true },
  { href: '/estadisticas', label: 'Estadísticas', icon: ChartNoAxesColumn, staffOnly: false },
];

function useNav() {
  const pathname = usePathname();
  const me = useMe();
  return NAV.filter((item) => !item.staffOnly || !me || isStaff(me)).map((item) => ({
    ...item,
    // El detalle de un reporte sigue perteneciendo a "Reportes".
    active: item.href === '/' ? pathname === '/' || pathname.startsWith('/reportes') : pathname.startsWith(item.href),
  }));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  const me = useMe();

  return (
    <div className="relative z-10 min-h-dvh lg:pl-[17rem]">
      {/* Barra lateral: el lomo del expediente. */}
      <aside className="fixed inset-y-0 left-0 hidden w-[17rem] flex-col border-r border-line bg-sunk/70 backdrop-blur-sm lg:flex">
        <Link href="/" className="px-6 pt-7 pb-8">
          <Brand />
        </Link>

        <nav aria-label="Secciones" className="grid gap-1 px-3">
          <span className="eyebrow px-3 pb-2">Secciones</span>
          {nav.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                active ? 'bg-ink font-medium text-paper' : 'text-ink-soft hover:bg-ink/6 hover:text-ink',
              )}
            >
              <Icon className="size-4" />
              {label}
              {active && <span aria-hidden className="ml-auto size-1.5 rounded-full bg-signal" />}
            </Link>
          ))}
        </nav>

        <div className="mt-auto grid gap-3 p-3">
          <div className="hairline mx-3" />
          <div className="flex items-center gap-3 px-3 py-1">
            {me ? (
              <>
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong bg-surface font-mono text-xs font-medium">
                  {initials(me.name, me.lastName)}
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="truncate text-sm font-medium leading-none">
                    {me.name} {me.lastName}
                  </span>
                  <span className="truncate text-xs leading-none text-muted">{me.email}</span>
                </span>
              </>
            ) : (
              <>
                <Skeleton className="size-9 rounded-full" />
                <span className="grid gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between px-3 pb-2">
            {me ? <RoleBadge role={me.role} /> : <Skeleton className="h-6 w-20" />}
            <span className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={logout}>
                <LogOut />
              </Button>
            </span>
          </div>
        </div>
      </aside>

      {/* En pantallas angostas la barra lateral se vuelve una franja superior. */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <Link href="/">
            <Brand />
          </Link>
          <span className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={logout}>
              <LogOut />
            </Button>
          </span>
        </div>
        <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto px-3 py-2">
          {nav.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm',
                active ? 'bg-ink font-medium text-paper' : 'text-ink-soft',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[76rem] px-4 pt-8 pb-20 sm:px-8 lg:px-12 lg:pt-12">
        {children}
      </main>
    </div>
  );
}

/** Encabezado de página: sección en mono, título en serif y las acciones a la derecha. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex animate-rise flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="grid max-w-2xl gap-2">
        <span className="eyebrow flex items-center gap-2">
          <span aria-hidden className="h-px w-6 bg-signal" />
          {eyebrow}
        </span>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="text-[15px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
