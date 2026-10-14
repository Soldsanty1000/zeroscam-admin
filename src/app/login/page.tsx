'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { OTPInput, type SlotProps } from 'input-otp';
import { ArrowLeft } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { InlineAlert } from '@/components/ui/misc';
import { errorMessage, login, verifyCode, type TwoFactorChallenge } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  // Con verificación en dos pasos el login regresa un desafío en vez de tokens.
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [code, setCode] = useState('');
  const codeForm = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setSending(true);
    try {
      const pending = await login(String(form.get('email')), String(form.get('password')));
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
    if (!challenge || code.length < 6) return;
    setError('');
    setSending(true);
    try {
      await verifyCode(challenge.challengeId, code);
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
      setSending(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Portada: siempre en el azul de la app, sea cual sea el tema. */}
      <aside className="relative hidden overflow-hidden bg-[#0a1330] text-[#f1f3f9] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none">
            <ellipse cx="12" cy="12" rx="6" ry="8.5" stroke="currentColor" strokeWidth="2" />
            <path d="M5.5 19.5 18.5 4.5" stroke="#f5a623" strokeWidth="2.25" strokeLinecap="round" />
          </svg>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">ZeroScam</span>
        </span>

        {/* El cero tachado se traza una vez al llegar: es lo primero que se ve y solo pasa aquí. */}
        <svg aria-hidden viewBox="0 0 400 520" fill="none" className="login-mark pointer-events-none absolute top-[9%] right-[-2.5rem] h-[56%]">
          <ellipse cx="200" cy="260" rx="150" ry="220" stroke="#18244f" strokeWidth="30" pathLength="1" />
          <path d="M40 470 360 50" stroke="#f5a623" strokeWidth="30" strokeLinecap="round" pathLength="1" />
        </svg>

        <div className="relative grid max-w-md gap-4">
          <h1 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.035em]">
            Cada reporte es una pista.
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-[#bcc3d8]">
            Revisa lo que la comunidad denuncia, clasifica su riesgo y canaliza lo que debe llegar a la Policía
            Cibernética.
          </p>
        </div>
      </aside>

      <main className="flex flex-col px-6 py-6 sm:px-10">
        <Brand className="lg:invisible" />

        <div className="m-auto w-full max-w-[21rem] py-10">
          {challenge ? (
            <form ref={codeForm} onSubmit={handleCode} className="arrive grid gap-5">
              <div className="grid gap-1.5">
                <h2 className="text-2xl font-semibold tracking-[-0.025em]">Código de verificación</h2>
                <p className="text-sm leading-relaxed text-muted">
                  Lo enviamos a <span className="font-medium text-ink-2">{challenge.destination}</span>. Dura 5 minutos.
                </p>
              </div>
              <OTPInput
                name="code"
                maxLength={6}
                value={code}
                onChange={setCode}
                // Al completar los 6 dígitos se envía solo: no hace falta buscar el botón.
                onComplete={() => codeForm.current?.requestSubmit()}
                autoFocus
                inputMode="numeric"
                pattern="^[0-9]*$"
                aria-label="Código de 6 dígitos"
                containerClassName="flex items-center justify-between gap-2"
                render={({ slots }) => (
                  <>
                    {slots.slice(0, 3).map((slot, index) => (
                      <Slot key={index} {...slot} />
                    ))}
                    <span aria-hidden className="h-px w-3 shrink-0 bg-line-strong" />
                    {slots.slice(3).map((slot, index) => (
                      <Slot key={index + 3} {...slot} />
                    ))}
                  </>
                )}
              />
              {error && <InlineAlert>{error}</InlineAlert>}
              <Button type="submit" variant="primary" size="lg" loading={sending} disabled={code.length < 6}>
                Verificar y entrar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setChallenge(null);
                  setCode('');
                  setError('');
                }}
              >
                <ArrowLeft />
                Usar otra cuenta
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-1.5">
                <h2 className="text-2xl font-semibold tracking-[-0.025em]">Inicia sesión</h2>
                <p className="text-sm text-muted">Acceso para Administración, Owner y Policía Cibernética.</p>
              </div>
              <Field label="Correo">
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="nombre@zeroscam.mx"
                  required
                  autoFocus
                  className="h-10"
                />
              </Field>
              <Field label="Contraseña">
                <Input name="password" type="password" autoComplete="current-password" required className="h-10" />
              </Field>
              {error && <InlineAlert>{error}</InlineAlert>}
              <Button type="submit" variant="primary" size="lg" loading={sending}>
                Entrar
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function Slot({ char, hasFakeCaret, isActive }: SlotProps) {
  return (
    <span
      className={cn(
        'relative grid h-12 w-full place-items-center rounded-lg border bg-surface font-mono text-lg font-medium transition-[border-color,box-shadow] duration-150',
        isActive ? 'border-accent-ink ring-3 ring-accent/30' : 'border-line-strong',
      )}
    >
      {char}
      {hasFakeCaret && <span aria-hidden className="caret-blink absolute h-5 w-px bg-accent-ink" />}
    </span>
  );
}
