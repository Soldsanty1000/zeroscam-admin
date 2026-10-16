'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { CommandPalette } from '@/components/command-palette';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/misc';
import { canAccessPanel } from '@/lib/access';
import { api, endSession, getAccessToken, logout } from '@/lib/api';
import { SessionContext, type Me } from '@/lib/session';
import { useSessionGuards } from '@/lib/session-guards';

type Count = { name: string; count: number };

/**
 * Todo lo que va detrás del login. No pinta NADA del panel hasta que
 * `GET /users/me` dice quién es la cuenta y que su rol entra: sin saberlo, los
 * enlaces y botones de staff no existen (falla cerrada). Mientras haya sesión
 * vigila otras pestañas y la inactividad, y mantiene la cuenta de reportes
 * pendientes de la barra lateral.
 */
export default function PanelLayout({ children }: LayoutProps<'/'>) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  useSessionGuards(me !== null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    api
      .get<Me>('/users/me')
      .then(({ data }) => {
        if (cancelled) return;
        // Un token válido de otro rol (la app móvil) no abre el panel.
        if (!canAccessPanel(data.role)) {
          void logout('sin-acceso');
          return;
        }
        setMe(data);
        api
          .get<{ byStatus: Count[] }>('/stats')
          .then(({ data: stats }) => {
            const of = (name: string) => stats.byStatus.find((c) => c.name === name)?.count ?? 0;
            if (!cancelled) setPending(of('RECIBIDO') + of('EN_REVISION'));
          })
          .catch(() => undefined);
      })
      .catch((e) => {
        if (cancelled) return;
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        // 401: `api` ya intentó renovar; si aun así llega, la sesión no sirve.
        if (status === 401) endSession('sesion');
        else if (status === 403) void logout('sin-acceso');
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openCommand = useCallback(() => setCommandOpen(true), []);
  const session = useMemo(() => ({ me, pending, setPending, openCommand }), [me, pending, openCommand]);

  if (!me) {
    if (!failed) return <p role="status" className="sr-only">Cargando el panel…</p>;
    return (
      <main className="grid min-h-dvh place-items-center">
        <EmptyState
          tone="danger"
          icon={<TriangleAlert />}
          title="No se pudo abrir el panel"
          description="No se pudo comprobar tu cuenta. Revisa la conexión e inténtalo de nuevo."
          action={
            <span className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setFailed(false);
                  setAttempt((n) => n + 1);
                }}
              >
                Reintentar
              </Button>
              <Button variant="ghost" onClick={() => void logout()}>
                Cerrar sesión
              </Button>
            </span>
          }
        />
      </main>
    );
  }

  return (
    <SessionContext.Provider value={session}>
      <AppShell>{children}</AppShell>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </SessionContext.Provider>
  );
}
