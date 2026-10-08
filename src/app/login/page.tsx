'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  errorMessage,
  login,
  verifyCode,
  type TwoFactorChallenge,
} from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // Con verificación en dos pasos el login regresa un desafío en vez de tokens.
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setSending(true);
    try {
      const pending = await login(
        String(form.get('email')),
        String(form.get('password')),
      );
      if (pending) {
        setChallenge(pending);
        setSending(false);
        return;
      }
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
      setSending(false);
    }
  }

  async function handleCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    const form = new FormData(event.currentTarget);
    setError('');
    setSending(true);
    try {
      await verifyCode(challenge.challengeId, String(form.get('code')));
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
      setSending(false);
    }
  }

  if (challenge) {
    return (
      <main>
        <h1>ZeroScam — Administración</h1>
        <form onSubmit={handleCode}>
          <p>Escribe el código de 6 dígitos enviado a {challenge.destination}.</p>
          <label>
            Código
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={sending}>
            {sending ? 'Verificando…' : 'Verificar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setChallenge(null);
              setError('');
            }}
          >
            Volver
          </button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <h1>ZeroScam — Administración</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Correo
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={sending}>
          {sending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
