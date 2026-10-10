'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Search, SearchX, TriangleAlert, UserCheck, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app-shell';
import { RoleBadge, StatusBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Select } from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { formatDate, initials, number } from '@/lib/format';
import { useMe } from '@/lib/session';
import { cn } from '@/lib/utils';

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

/** Un cambio que espera confirmación: qué se manda y cómo se le explica a quien lo hace. */
type Pending = {
  user: User;
  changes: Partial<User>;
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  done: string;
};

const ROLES = ['Usuario', 'Administrador', 'Policia', 'Owner'];
const ROLE_OPTIONS = ROLES.map((role) => ({
  value: role,
  label: role === 'Policia' ? 'Policía' : role,
}));
const ACCOUNT_STATUSES = [
  { value: 'ACTIVO', label: 'Activas' },
  { value: 'SUSPENDIDO', label: 'Suspendidas' },
];

const COLUMNS =
  'md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)_10.5rem_7rem_9.5rem]';

export default function UsersPage() {
  const me = useMe();
  const isOwner = me?.role === 'Owner';
  const [users, setUsers] = useState<User[] | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [role, setRole] = useState('ALL');
  const [accountStatus, setAccountStatus] = useState('ALL');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const load = useCallback(() => {
    return api
      .get<User[]>('/users', { params: filters })
      .then(({ data }) => {
        setUsers(data);
        setError('');
      })
      .catch((e) => setError(errorMessage(e)));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters(next: { q?: string; role?: string; accountStatus?: string }) {
    // Un filtro vacío no se manda: el servidor rechaza `role=` sin valor.
    setFilters({
      q: next.q?.trim() || undefined,
      role: next.role && next.role !== 'ALL' ? next.role : undefined,
      accountStatus:
        next.accountStatus && next.accountStatus !== 'ALL' ? next.accountStatus : undefined,
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q'));
    applyFilters({ q, role, accountStatus });
  }

  async function update({ user, changes, done }: Pending) {
    setSending(true);
    try {
      await api.patch<User>(`/users/${user.id}`, changes);
      toast.success(done);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
    setSending(false);
  }

  const filtered = Boolean(filters.q || filters.role || filters.accountStatus);

  return (
    <>
      <PageHeader
        eyebrow="Directorio"
        title="Usuarios"
        description="Las cuentas de la plataforma: quién puede moderar, quién consulta y quién quedó suspendido."
      />

      <form onSubmit={handleSearch} className="mb-4 flex animate-rise flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            key={filters.q ?? ''}
            name="q"
            type="search"
            defaultValue={filters.q ?? ''}
            placeholder="Buscar por nombre, apellido o correo y presiona Enter…"
            aria-label="Buscar usuarios"
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filtrar por rol"
          value={role}
          onValueChange={(value) => {
            setRole(value);
            applyFilters({ q: filters.q, role: value, accountStatus });
          }}
          className="w-44"
          options={[{ value: 'ALL', label: 'Todos los roles' }, ...ROLE_OPTIONS]}
        />
        <Select
          aria-label="Filtrar por estado de la cuenta"
          value={accountStatus}
          onValueChange={(value) => {
            setAccountStatus(value);
            applyFilters({ q: filters.q, role, accountStatus: value });
          }}
          className="w-44"
          options={[{ value: 'ALL', label: 'Todas las cuentas' }, ...ACCOUNT_STATUSES]}
        />
        {filtered && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setRole('ALL');
              setAccountStatus('ALL');
              setFilters({});
            }}
          >
            <X />
            Limpiar
          </Button>
        )}
      </form>

      <Card className="animate-rise overflow-hidden">
        <div className={cn('hidden items-center gap-4 border-b border-line bg-sunk/60 px-5 py-2.5 md:grid', COLUMNS)}>
          {['Cuenta', 'País · alta', 'Rol', 'Estado', ''].map((heading, i) => (
            <span key={i} className="eyebrow">
              {heading}
            </span>
          ))}
        </div>

        {error && (
          <EmptyState
            tone="danger"
            icon={<TriangleAlert />}
            title="No se pudieron cargar las cuentas"
            description={error}
            action={
              <Button variant="outline" onClick={() => load()}>
                Reintentar
              </Button>
            }
          />
        )}

        {!error && !users && (
          <ul aria-busy aria-label="Cargando cuentas">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-line px-5 py-4 last:border-0">
                <Skeleton className="size-10 rounded-full" />
                <span className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </span>
              </li>
            ))}
          </ul>
        )}

        {!error && users?.length === 0 && (
          <EmptyState
            icon={<SearchX />}
            title="Ninguna cuenta coincide"
            description="Prueba con otro nombre o quita algún filtro."
          />
        )}

        <ul>
          {!error &&
            users?.map((user) => {
              const self = user.id === me?.id;
              const active = user.accountStatus === 'ACTIVO';
              const deleted = user.accountStatus === 'ELIMINADA';
              const fullName = `${user.name} ${user.lastName}`;
              return (
                <li
                  key={user.id}
                  className={cn(
                    'grid items-center gap-x-4 gap-y-3 border-b border-line px-5 py-3.5 transition-colors last:border-0 hover:bg-ink/[0.03]',
                    COLUMNS,
                    !active && 'bg-sunk/40',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-full border font-mono text-xs font-medium',
                        active ? 'border-line-strong bg-surface' : 'border-line bg-sunk text-muted',
                      )}
                    >
                      {initials(user.name, user.lastName)}
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className={cn('flex items-center gap-2 truncate text-sm font-medium', !active && 'text-ink-soft')}>
                        <span className="truncate">{fullName}</span>
                        {self && <span className="eyebrow shrink-0 text-signal-ink">Tú</span>}
                      </span>
                      <span className="truncate text-xs text-muted">{user.email}</span>
                    </span>
                  </span>

                  <span className="grid gap-0.5 text-xs text-muted">
                    <span className="text-sm text-ink-soft">{user.country || '—'}</span>
                    <time dateTime={user.createdAt} className="tnum">
                      {formatDate(user.createdAt)}
                    </time>
                  </span>

                  {isOwner && !self && !deleted ? (
                    <Select
                      aria-label={`Rol de ${fullName}`}
                      size="sm"
                      value={user.role}
                      disabled={sending}
                      options={ROLE_OPTIONS}
                      onValueChange={(value) =>
                        setPending({
                          user,
                          changes: { role: value },
                          title: `¿Hacer ${value === 'Policia' ? 'Policía' : value} a ${user.name}?`,
                          description:
                            value === 'Usuario'
                              ? `${fullName} dejará de tener acceso a este panel.`
                              : `${fullName} tendrá los permisos de ${value === 'Policia' ? 'Policía' : value} la próxima vez que inicie sesión.`,
                          confirmLabel: 'Cambiar rol',
                          tone: 'primary',
                          done: `${user.email} ahora es ${value}`,
                        })
                      }
                    />
                  ) : (
                    <span>
                      <RoleBadge role={user.role} />
                    </span>
                  )}

                  <span>
                    <StatusBadge status={user.accountStatus} />
                  </span>

                  <span className="md:justify-self-end">
                    {self || deleted ? null : active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={sending}
                        className="text-danger hover:bg-danger/10 hover:text-danger"
                        onClick={() =>
                          setPending({
                            user,
                            changes: { accountStatus: 'SUSPENDIDO' },
                            title: `¿Suspender a ${user.name}?`,
                            description: `${fullName} no podrá iniciar sesión hasta que reactives su cuenta. Sus reportes se conservan.`,
                            confirmLabel: 'Suspender cuenta',
                            tone: 'danger',
                            done: `Cuenta de ${user.email} suspendida`,
                          })
                        }
                      >
                        <UserX />
                        Suspender
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sending}
                        onClick={() =>
                          setPending({
                            user,
                            changes: { accountStatus: 'ACTIVO' },
                            title: `¿Reactivar a ${user.name}?`,
                            description: `${fullName} podrá volver a iniciar sesión.`,
                            confirmLabel: 'Reactivar cuenta',
                            tone: 'primary',
                            done: `Cuenta de ${user.email} reactivada`,
                          })
                        }
                      >
                        <UserCheck />
                        Reactivar
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
        </ul>
      </Card>

      {users && users.length > 0 && !error && (
        <p className="eyebrow mt-4 flex items-center justify-between gap-4">
          <span>{!isOwner && me ? 'Solo el Owner puede cambiar roles' : ''}</span>
          <span>
            {number.format(users.length)} {users.length === 1 ? 'cuenta' : 'cuentas'}
            {filtered && ' con estos filtros'}
          </span>
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.title ?? ''}
        description={pending?.description ?? ''}
        confirmLabel={pending?.confirmLabel ?? ''}
        tone={pending?.tone}
        onConfirm={() => pending && update(pending)}
      />
    </>
  );
}
