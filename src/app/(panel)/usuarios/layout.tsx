'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { canManageUsers } from '@/lib/access';
import { useMe } from '@/lib/session';

/**
 * Guarda de `/usuarios`: solo Administrador y Owner. Ocultar el enlace no basta
 * (se puede escribir la URL), así que el segmento no pinta nada para otro rol y
 * lo regresa a la bandeja. El servidor además responde 403 a `GET /users`.
 */
export default function UsersLayout({ children }: LayoutProps<'/usuarios'>) {
  const router = useRouter();
  const me = useMe();
  const allowed = canManageUsers(me?.role);

  useEffect(() => {
    if (me && !allowed) router.replace('/');
  }, [me, allowed, router]);

  return allowed ? children : null;
}
