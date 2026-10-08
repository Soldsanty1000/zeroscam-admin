'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, errorMessage, getAccessToken, logout } from '@/lib/api';

type Report = {
  id: number;
  fraudType: string;
  status: string;
  riskLevel: string;
  description: string;
  createdAt: string;
};

export default function HomePage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    api
      .get<Report[]>('/reports')
      .then(({ data }) => setReports(data))
      .catch((e) => setError(errorMessage(e)));
  }, [router]);

  return (
    <main>
      <header>
        <h1>Reportes</h1>
        <button type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </header>
      <p>
        <Link href="/usuarios">Usuarios</Link> ·{' '}
        <Link href="/estadisticas">Estadísticas</Link>
      </p>
      {error && <p role="alert">{error}</p>}
      {!error && !reports && <p>Cargando…</p>}
      {reports?.length === 0 && <p>Todavía no hay reportes.</p>}
      <ul>
        {reports?.map((report) => (
          <li key={report.id}>
            <Link href={`/reportes/${report.id}`}>
              <strong>
                #{report.id} · {report.fraudType}
              </strong>
            </Link>
            <span>
              {report.status} · riesgo {report.riskLevel}
            </span>
            <span>{report.description}</span>
            <span>{new Date(report.createdAt).toLocaleString('es-MX')}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
