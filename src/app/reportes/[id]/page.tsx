'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { API_URL, api, errorMessage, getAccessToken, logout } from '@/lib/api';

type Report = {
  id: number;
  fraudType: string;
  status: string;
  riskLevel: string;
  description: string;
  incidentDate: string;
  createdAt: string;
  urls: string[];
  evidenceUrls: string[];
  history?: {
    fromStatus: string | null;
    toStatus: string;
    observations?: string;
    changedAt: string;
  }[];
  reporter?: { name: string; lastName: string; email: string; country: string };
  message?: string;
};

const STATUSES = ['EN_REVISION', 'VALIDADO', 'RECHAZADO', 'CANALIZADO'];
const RISK_LEVELS = ['BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO'];

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-MX');
}

export default function ReportPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    return api
      .get<Report>(`/reports/${id}`)
      .then(({ data }) => setReport(data))
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    load();
  }, [router, load]);

  async function send(path: string, body: object) {
    setError('');
    setNotice('');
    setSending(true);
    try {
      const { data } = await api.patch<Report>(`/reports/${id}/${path}`, body);
      setNotice(data.message ?? 'Cambio guardado');
      // El PATCH no regresa `history` ni `reporter`: se vuelve a pedir el detalle.
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
    setSending(false);
  }

  function handleStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const observations = String(form.get('observations')).trim();
    send('status', {
      status: String(form.get('status')),
      // El servidor rechaza un texto vacío: si no hay, no se manda.
      ...(observations && { observations }),
    });
  }

  function handleRisk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    send('risk', { riskLevel: String(form.get('riskLevel')) });
  }

  return (
    <main>
      <header>
        <h1>Reporte #{id}</h1>
        <button type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </header>
      <p>
        <Link href="/">← Volver a los reportes</Link>
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!error && !report && <p>Cargando…</p>}
      {report && (
        <>
          <section>
            <h2>{report.fraudType}</h2>
            <p>
              {report.status} · riesgo {report.riskLevel}
            </p>
            <p>{report.description}</p>
            <p>Ocurrió: {formatDate(report.incidentDate)}</p>
            <p>Se reportó: {formatDate(report.createdAt)}</p>
          </section>

          {report.reporter && (
            <section>
              <h2>Denunciante</h2>
              <p>
                {report.reporter.name} {report.reporter.lastName} ·{' '}
                {report.reporter.country}
              </p>
              <p>{report.reporter.email}</p>
            </section>
          )}

          <section>
            <h2>URLs reportadas</h2>
            <ul>
              {report.urls.map((url) => (
                <li key={url}>{url}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Evidencias</h2>
            {report.evidenceUrls.length === 0 && <p>Sin evidencias.</p>}
            <ul>
              {report.evidenceUrls.map((path) => (
                <li key={path}>
                  <a href={API_URL + path} target="_blank">
                    {path.replace('/uploads/', '')}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Cambiar estado</h2>
            <form onSubmit={handleStatus}>
              <label>
                Estado nuevo
                <select name="status" required>
                  {STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label>
                Observaciones (obligatorias para rechazar)
                <textarea name="observations" rows={3} />
              </label>
              <button type="submit" disabled={sending}>
                Guardar estado
              </button>
            </form>
          </section>

          <section>
            <h2>Clasificar riesgo</h2>
            <form onSubmit={handleRisk}>
              <label>
                Nivel de riesgo
                <select name="riskLevel" defaultValue={report.riskLevel} required>
                  {RISK_LEVELS.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={sending}>
                Guardar riesgo
              </button>
            </form>
          </section>

          <section>
            <h2>Historial</h2>
            {report.history?.length === 0 && <p>Sin cambios todavía.</p>}
            <ul>
              {report.history?.map((entry, index) => (
                <li key={index}>
                  <strong>
                    {entry.fromStatus ?? '—'} → {entry.toStatus}
                  </strong>
                  {entry.observations && <span>{entry.observations}</span>}
                  <span>{formatDate(entry.changedAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
