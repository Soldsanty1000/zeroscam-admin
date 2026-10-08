'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, errorMessage, getAccessToken, logout } from '@/lib/api';

type Count = { name: string; count: number };

type Stats = {
  total: number;
  byStatus: Count[];
  byFraudType: Count[];
  byRiskLevel: Count[];
  byCountry: Count[];
  byMonth: Count[];
  approvalRate: number | null;
};

type SiteStats = {
  users: {
    total: number;
    byRole: Count[];
    byAccountStatus: Count[];
    byCountry: Count[];
    byMonth: Count[];
  };
  urls: { total: number; analyzed: number; byRiskLevel: Count[] };
  lookups: { total: number; users: number; byMonth: Count[] };
  notifications: { total: number; unread: number; riskAlerts: number };
};

type Filters = {
  from?: string;
  to?: string;
  country?: string;
  riskLevel?: string;
};

const RISK_LEVELS = ['BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO'];

function CountList({ title, counts }: { title: string; counts: Count[] }) {
  return (
    <section>
      <h2>{title}</h2>
      {counts.length === 0 && <p>Sin datos.</p>}
      <ul>
        {counts.map((item) => (
          <li key={item.name}>
            <span>{item.name}</span>
            <strong>{item.count}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [error, setError] = useState('');
  const [site, setSite] = useState<SiteStats | null>(null);
  const [siteError, setSiteError] = useState('');

  const load = useCallback(() => {
    return api
      .get<Stats>('/stats', { params: filters })
      .then(({ data }) => setStats(data))
      .catch((e) => setError(errorMessage(e)));
  }, [filters]);

  const loadSite = useCallback(() => {
    // Las métricas de la plataforma solo aceptan el periodo, no el país ni
    // el riesgo. Su error va aparte: la Policía ve los reportes pero no
    // esta parte, y eso no debe tapar lo demás.
    return api
      .get<SiteStats>('/stats/site', {
        params: { from: filters.from, to: filters.to },
      })
      .then(({ data }) => {
        setSite(data);
        setSiteError('');
      })
      .catch((e) => {
        setSite(null);
        setSiteError(errorMessage(e));
      });
  }, [filters]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    load();
    loadSite();
  }, [router, load, loadSite]);

  function handleFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get('from'));
    const to = String(form.get('to'));
    setError('');
    // Un filtro vacío no se manda: el servidor rechaza `from=` sin valor.
    setFilters({
      from: from || undefined,
      // El campo da solo el día; se manda su último segundo para que
      // "hasta el 30" incluya los reportes del 30.
      to: to ? to + 'T23:59:59' : undefined,
      country: String(form.get('country')).trim() || undefined,
      riskLevel: String(form.get('riskLevel')) || undefined,
    });
  }

  return (
    <main>
      <header>
        <h1>Estadísticas</h1>
        <button type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </header>
      <p>
        <Link href="/">← Volver a los reportes</Link>
      </p>

      <form onSubmit={handleFilters}>
        <label>
          Creados desde
          <input name="from" type="date" />
        </label>
        <label>
          Creados hasta
          <input name="to" type="date" />
        </label>
        <label>
          País del denunciante
          <input name="country" />
        </label>
        <label>
          Nivel de riesgo
          <select name="riskLevel">
            <option value="">Todos</option>
            {RISK_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <button type="submit">Filtrar</button>
      </form>

      {error && <p role="alert">{error}</p>}
      {!error && !stats && <p>Cargando…</p>}
      {stats && (
        <>
          <section>
            <h2>Resumen de reportes</h2>
            <ul>
              <li>
                <span>Reportes</span>
                <strong>{stats.total}</strong>
              </li>
              <li>
                <span>Tasa de aprobación</span>
                <strong>
                  {stats.approvalRate === null
                    ? 'Sin reportes resueltos'
                    : Math.round(stats.approvalRate * 100) + ' %'}
                </strong>
              </li>
            </ul>
          </section>
          <CountList title="Por estado" counts={stats.byStatus} />
          <CountList title="Por tipo de fraude" counts={stats.byFraudType} />
          <CountList title="Por nivel de riesgo" counts={stats.byRiskLevel} />
          <CountList title="Por país" counts={stats.byCountry} />
          <CountList title="Por mes" counts={stats.byMonth} />
        </>
      )}

      <section>
        <h2>Plataforma</h2>
        <p>Cuentas, URLs, consultas de riesgo y notificaciones.</p>
        {siteError && <p role="alert">{siteError}</p>}
        {!siteError && !site && <p>Cargando…</p>}
      </section>
      {site && (
        <>
          <section>
            <h2>Resumen de la plataforma</h2>
            <ul>
              <li>
                <span>Cuentas registradas</span>
                <strong>{site.users.total}</strong>
              </li>
              <li>
                <span>URLs en el directorio</span>
                <strong>{site.urls.total}</strong>
              </li>
              <li>
                <span>URLs ya analizadas</span>
                <strong>{site.urls.analyzed}</strong>
              </li>
              <li>
                <span>Consultas de riesgo</span>
                <strong>{site.lookups.total}</strong>
              </li>
              <li>
                <span>Usuarios que consultaron</span>
                <strong>{site.lookups.users}</strong>
              </li>
              <li>
                <span>Notificaciones enviadas</span>
                <strong>{site.notifications.total}</strong>
              </li>
              <li>
                <span>Notificaciones sin leer</span>
                <strong>{site.notifications.unread}</strong>
              </li>
              <li>
                <span>Alertas de riesgo de una URL</span>
                <strong>{site.notifications.riskAlerts}</strong>
              </li>
            </ul>
          </section>
          <CountList title="Cuentas por rol" counts={site.users.byRole} />
          <CountList
            title="Cuentas por estado"
            counts={site.users.byAccountStatus}
          />
          <CountList title="Cuentas por país" counts={site.users.byCountry} />
          <CountList title="Registros por mes" counts={site.users.byMonth} />
          <CountList
            title="URLs por nivel de riesgo"
            counts={site.urls.byRiskLevel}
          />
          <CountList title="Consultas por mes" counts={site.lookups.byMonth} />
        </>
      )}
    </main>
  );
}
