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

  const load = useCallback(() => {
    return api
      .get<Stats>('/stats', { params: filters })
      .then(({ data }) => setStats(data))
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
            <h2>Resumen</h2>
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
    </main>
  );
}
