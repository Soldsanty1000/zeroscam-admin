'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, errorMessage, getAccessToken, logout } from '@/lib/api';

type User = {
  id: string;
  name: string;
  lastName: string;
  country: string;
  email: string;
  role: string;
  accountStatus: string;
  createdAt: string;
};

type Filters = { q?: string; role?: string; accountStatus?: string };

const ROLES = ['Usuario', 'Administrador', 'Policia', 'Owner'];
const ACCOUNT_STATUSES = ['ACTIVO', 'SUSPENDIDO'];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[] | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    return api
      .get<User[]>('/users', { params: filters })
      .then(({ data }) => setUsers(data))
      .catch((e) => setError(errorMessage(e)));
  }, [filters]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    load();
  }, [router, load]);

  function handleFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setNotice('');
    // Un filtro vacío no se manda: el servidor rechaza `role=` sin valor.
    setFilters({
      q: String(form.get('q')).trim() || undefined,
      role: String(form.get('role')) || undefined,
      accountStatus: String(form.get('accountStatus')) || undefined,
    });
  }

  async function update(user: User, changes: Partial<User>, done: string) {
    setError('');
    setNotice('');
    setSending(true);
    try {
      await api.patch<User>(`/users/${user.id}`, changes);
      setNotice(done);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
    setSending(false);
  }

  return (
    <main>
      <header>
        <h1>Usuarios</h1>
        <button type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </header>
      <p>
        <Link href="/">← Volver a los reportes</Link>
      </p>

      <form onSubmit={handleFilters}>
        <label>
          Buscar por nombre, apellido o correo
          <input name="q" type="search" />
        </label>
        <label>
          Rol
          <select name="role">
            <option value="">Todos</option>
            {ROLES.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
        <label>
          Estado de la cuenta
          <select name="accountStatus">
            <option value="">Todos</option>
            {ACCOUNT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <button type="submit">Filtrar</button>
      </form>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!error && !users && <p>Cargando…</p>}
      {users?.length === 0 && <p>Ningún usuario coincide.</p>}
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            <strong>
              {user.name} {user.lastName}
            </strong>
            <span>{user.email}</span>
            <span>
              {user.country} · {user.accountStatus} · desde{' '}
              {new Date(user.createdAt).toLocaleDateString('es-MX')}
            </span>
            <label>
              Rol
              <select
                value={user.role}
                disabled={sending}
                onChange={(event) =>
                  update(
                    user,
                    { role: event.target.value },
                    `${user.email} ahora es ${event.target.value}`,
                  )
                }
              >
                {ROLES.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
            {user.accountStatus === 'ACTIVO' ? (
              <button
                type="button"
                disabled={sending}
                onClick={() =>
                  update(
                    user,
                    { accountStatus: 'SUSPENDIDO' },
                    `Cuenta de ${user.email} suspendida`,
                  )
                }
              >
                Suspender cuenta
              </button>
            ) : (
              <button
                type="button"
                disabled={sending}
                onClick={() =>
                  update(
                    user,
                    { accountStatus: 'ACTIVO' },
                    `Cuenta de ${user.email} reactivada`,
                  )
                }
              >
                Reactivar cuenta
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
