'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from '@base-ui/react/menu';
import { Check, ChevronDown, LogOut, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { canManageUsers } from '@/lib/access';
import { logout } from '@/lib/api';
import { initials } from '@/lib/format';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand';
import { Kbd } from './ui/misc';

const NAV = [
  { href: '/', label: 'Reportes', adminOnly: false },
  { href: '/usuarios', label: 'Usuarios', adminOnly: true },
  { href: '/estadisticas', label: 'Estadísticas', adminOnly: false },
];

const THEMES = [
  { value: 'system', label: 'Igual que el sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

/** Ancho y márgenes del contenido: los comparten la cabecera, la página y el pie. */
export const CONTAINER = 'mx-auto w-full max-w-[72rem] px-4 sm:px-6 lg:px-8';

function useNav() {
  const pathname = usePathname();
  const { me } = useSession();
  // Falla cerrada: sin saber el rol no hay enlaces de administración.
  return NAV.filter((entry) => !entry.adminOnly || canManageUsers(me?.role)).map((entry) => ({
    ...entry,
    // El detalle de un reporte sigue perteneciendo a "Reportes".
    active: entry.href === '/' ? pathname === '/' || pathname.startsWith('/reportes') : pathname.startsWith(entry.href),
  }));
}

const roleLabel = (role: string) => (role === 'Policia' ? 'Policía' : role);

const menuItem =
  'flex h-10 cursor-default select-none items-center gap-2.5 rounded-sm px-2.5 text-[15px] text-ink outline-none data-[highlighted]:bg-sunk [&_svg]:size-4 [&_svg]:text-muted';

function AccountMenu() {
  const { me } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Cuenta y preferencias"
        className="flex h-10 select-none items-center gap-2.5 rounded-sm px-1.5 text-left text-masthead-ink outline-none transition-colors duration-150 hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-accent data-[popup-open]:bg-white/10"
      >
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-white/15 text-[13px] font-bold">
          {me ? initials(me.name, me.lastName) : ''}
        </span>
        {me && (
          <span className="hidden min-w-0 leading-tight lg:grid">
            <span className="truncate text-[15px] font-semibold">
              {me.name} {me.lastName}
            </span>
            <span className="truncate text-[13px] text-masthead-ink/70">{roleLabel(me.role)}</span>
          </span>
        )}
        <ChevronDown aria-hidden className="size-4 text-masthead-ink/70" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50 outline-none">
          <Menu.Popup className="pop w-64 rounded-md border border-line-strong bg-surface p-1.5 shadow-pop outline-none">
            {me && (
              <div className="px-2.5 pt-2 pb-2.5">
                <p className="truncate font-semibold">
                  {me.name} {me.lastName}
                </p>
                <p className="truncate text-sm text-ink-2">{me.email}</p>
                <p className="mt-1 text-sm text-muted">Rol: {roleLabel(me.role)}</p>
              </div>
            )}
            <Menu.Separator className="-mx-1.5 my-1 h-px bg-line" />
            <Menu.Group>
              <Menu.GroupLabel className="px-2.5 pt-2 pb-1 text-sm font-semibold text-ink-2">Apariencia</Menu.GroupLabel>
              <Menu.RadioGroup value={theme} onValueChange={(value) => setTheme(String(value))}>
                {THEMES.map(({ value, label, icon: Icon }) => (
                  <Menu.RadioItem key={value} value={value} closeOnClick={false} className={menuItem}>
                    <Icon />
                    <span className="flex-1">{label}</span>
                    <Menu.RadioItemIndicator>
                      <Check className="!text-ink" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Group>
            <Menu.Separator className="-mx-1.5 my-1 h-px bg-line" />
            <Menu.Item className={menuItem} onClick={() => void logout()}>
              <LogOut />
              Cerrar sesión
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function NavLinks({ className }: { className?: string }) {
  const nav = useNav();
  const { pending } = useSession();

  return (
    <nav aria-label="Secciones del panel" className={className}>
      <ul className="flex h-full items-stretch">
        {nav.map(({ href, label, active }) => (
          <li key={href} className="flex">
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 border-y-4 border-t-transparent px-3 text-[15px] font-semibold whitespace-nowrap text-masthead-ink outline-none transition-colors duration-150 focus-visible:bg-accent focus-visible:text-on-accent',
                active ? 'border-b-accent' : 'border-b-transparent text-masthead-ink/80 hover:border-b-white/40 hover:text-masthead-ink',
              )}
            >
              {label}
              {href === '/' && pending !== null && pending > 0 && (
                <span className="tnum rounded-sm bg-accent px-1.5 text-[13px] leading-5 font-bold text-on-accent">
                  {pending}
                  <span className="sr-only"> por atender</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** "Saltar al contenido": lo primero que alcanza el teclado en cada pantalla. */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only z-50 bg-accent px-4 py-3 font-semibold text-on-accent focus:not-sr-only focus:absolute focus:top-0 focus:left-0"
    >
      Saltar al contenido
    </a>
  );
}

/** Marca de la cabecera: logo, nombre y el nombre del sistema. */
export function MastheadBrand({ href }: { href?: string }) {
  const content = (
    <>
      <BrandMark className="size-7" />
      <span className="text-[19px] font-bold tracking-[-0.01em]">ZeroScam</span>
      <span className="hidden border-l border-white/25 pl-3 text-[15px] text-masthead-ink/75 sm:block">Panel de revisión</span>
    </>
  );
  const className = 'flex shrink-0 items-center gap-3 outline-none focus-visible:bg-accent focus-visible:text-on-accent';
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}

/** Pie común: recuerda que el acceso es restringido y que todo queda registrado. */
export function SiteFooter() {
  return (
    <footer className="border-t-4 border-masthead bg-sunk">
      <div className={cn(CONTAINER, 'flex flex-wrap items-start justify-between gap-x-10 gap-y-3 py-8 text-sm text-ink-2')}>
        <p className="max-w-[60ch]">
          Uso exclusivo del personal autorizado. Los cambios de estado, de riesgo y de cuentas quedan registrados en la bitácora de
          auditoría.
        </p>
        <p className="flex items-center gap-2 font-semibold text-ink">
          <BrandMark className="size-5" />
          ZeroScam
        </p>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { openCommand } = useSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />

      <header className="bg-masthead text-masthead-ink">
        <div className={cn(CONTAINER, 'flex h-16 items-stretch gap-4')}>
          <MastheadBrand href="/" />

          <NavLinks className="ml-auto hidden md:block" />

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <button
              type="button"
              onClick={openCommand}
              className="flex h-10 items-center gap-2 rounded-sm px-2.5 text-[15px] text-masthead-ink/85 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-masthead-ink focus-visible:outline-3 focus-visible:outline-accent"
            >
              <Search aria-hidden className="size-[18px]" />
              <span className="hidden lg:inline">Buscar</span>
              <Kbd className="hidden bg-white/12 text-masthead-ink/80 lg:inline-flex">⌘K</Kbd>
            </button>
            <AccountMenu />
          </div>
        </div>
        <NavLinks className="h-12 overflow-x-auto border-t border-white/12 px-1 [scrollbar-width:none] md:hidden" />
      </header>

      <main id="contenido" tabIndex={-1} className={cn(CONTAINER, 'flex-1 pt-8 pb-20 outline-none sm:pt-10')}>
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

/** Encabezado de página: el título dice dónde estás; al lado, lo que puedes hacer. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="grid gap-2">
        <h1 className="text-[2rem] leading-[1.15] font-bold tracking-[-0.015em] sm:text-[2.5rem]">{title}</h1>
        {description && <p className="max-w-[60ch] text-[17px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
