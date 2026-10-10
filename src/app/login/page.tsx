'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { InlineAlert } from '@/components/ui/misc';
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

  return (
    <div className="relative z-10 grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Portada del expediente: siempre en tinta, sea cual sea el tema. */}
      <aside className="relative hidden overflow-hidden bg-[#0a1330] text-[#f4efe3] lg:flex lg:flex-col lg:justify-between lg:p-14">
        <svg
          aria-hidden
          viewBox="0 0 600 600"
          className="pointer-events-none absolute -right-40 -bottom-48 size-[46rem] opacity-[0.07]"
        >
          <ellipse cx="300" cy="300" rx="170" ry="240" fill="none" stroke="currentColor" strokeWidth="44" />
          <path d="M110 520 490 80" stroke="#f5a623" strokeWidth="48" strokeLinecap="round" />
        </svg>
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(#ffffff0a 1px, transparent 1px), linear-gradient(90deg, #ffffff0a 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at 20% 10%, black, transparent 70%)',
          }}
        />

        <div className="relative flex items-center gap-3 animate-fade">
          <svg viewBox="0 0 40 40" aria-hidden className="size-9">
            <rect width="40" height="40" rx="10" fill="#f4efe3" />
            <ellipse cx="20" cy="20" rx="8" ry="11" fill="none" stroke="#0a1330" strokeWidth="2.6" />
            <path d="M11 31 29 9" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="display text-[1.35rem]">
            Zero<span className="italic text-[#f5a623]">Scam</span>
          </span>
        </div>

        <div className="stagger relative grid max-w-xl gap-6">
          <span className="eyebrow flex items-center gap-2 !text-[#f5a623]">
            <span aria-hidden className="h-px w-8 bg-[#f5a623]" />
            Mesa de control
          </span>
          <h1 className="display text-6xl xl:text-7xl">
            Cada reporte
            <br />
            es una <em className="text-[#f5a623]">pista</em>.
          </h1>
          <p className="max-w-md text-[17px] leading-relaxed text-[#c5c6d3]">
            Revisa lo que la comunidad denuncia, clasifica su riesgo y canaliza
            lo que debe llegar a la Policía Cibernética.
          </p>
        </div>

        <dl className="relative grid grid-cols-3 gap-6 border-t border-[#ffffff1f] pt-6 animate-fade">
          {[
            ['01', 'Recibir', 'Entra el reporte con su evidencia.'],
            ['02', 'Validar', 'Se revisa y se asigna el riesgo.'],
            ['03', 'Canalizar', 'El expediente va a la autoridad.'],
          ].map(([n, title, text]) => (
            <div key={n} className="grid gap-1">
              <dt className="font-mono text-xs text-[#f5a623]">{n}</dt>
              <dd className="display text-xl">{title}</dd>
              <dd className="text-[13px] leading-snug text-[#8c93ad]">{text}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <main className="relative flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Brand className="lg:invisible" />
          <ThemeToggle />
        </div>

        <div className="m-auto w-full max-w-sm py-12">
          {challenge ? (
            <form key="code" onSubmit={handleCode} className="stagger grid gap-5">
              <span className="grid size-11 place-items-center rounded-full border border-line-strong bg-surface">
                <KeyRound className="size-5" />
              </span>
              <div className="grid gap-2">
                <h2 className="display text-4xl">Segundo paso</h2>
                <p className="text-[15px] leading-relaxed text-ink-soft">
                  Escribe el código de 6 dígitos enviado a{' '}
                  <span className="font-mono text-ink">{challenge.destination}</span>.
                </p>
              </div>
              <Field label="Código de verificación">
                <Input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  className="h-14 text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em]"
                />
              </Field>
              {error && <InlineAlert>{error}</InlineAlert>}
              <Button type="submit" size="lg" disabled={sending}>
                {sending ? 'Verificando…' : 'Verificar y entrar'}
                <ShieldCheck />
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setChallenge(null);
                  setError('');
                }}
              >
                <ArrowLeft />
                Volver
              </Button>
            </form>
          ) : (
            <form key="login" onSubmit={handleSubmit} className="stagger grid gap-5">
              <div className="grid gap-2">
                <span className="eyebrow">Acceso del equipo</span>
                <h2 className="display text-4xl">Inicia sesión</h2>
                <p className="text-[15px] leading-relaxed text-ink-soft">
                  Para Administración, Owner y Policía Cibernética.
                </p>
              </div>
              <Field label="Correo">
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@zeroscam.mx"
                  required
                  autoFocus
                />
              </Field>
              <Field label="Contraseña">
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  required
                />
              </Field>
              {error && <InlineAlert>{error}</InlineAlert>}
              <Button type="submit" size="lg" disabled={sending}>
                {sending ? 'Entrando…' : 'Entrar'}
                <ArrowRight />
              </Button>
            </form>
          )}
        </div>

        <p className="eyebrow text-center">ZeroScam · Seguridad informática · 2026</p>
      </main>
    </div>
  );
}
