'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { api, getAccessToken } from '@/lib/api';
import { SessionContext, type Me } from '@/lib/session';

/**
 * Todo lo que va detrás del login: comprueba que haya sesión y carga la cuenta
 * una sola vez para la barra lateral y para decidir qué secciones se muestran.
 */
export default function PanelLayout({ children }: LayoutProps<'/'>) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el token vive en localStorage: solo se conoce en el navegador
    setReady(true);
    api
      .get<Me>('/users/me')
      .then(({ data }) => setMe(data))
      // Sin perfil el panel sigue sirviendo; un 401 ya lo atiende `api`.
      .catch(() => undefined);
  }, [router]);

  if (!ready) return null;

  return (
    <SessionContext.Provider value={me}>
      <AppShell>{children}</AppShell>
    </SessionContext.Provider>
  );
}
