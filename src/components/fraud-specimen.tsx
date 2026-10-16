import { cn } from '@/lib/utils';

/**
 * Tres dominios falsos como los que llegan a la bandeja, ya "desactivados"
 * (`[.]`) igual que en el panel. Lo marcado es el detalle que delata el engaño.
 * La tipografía del panel distingue "rn" de "m" y "1" de "l": aquí se ve por qué.
 */
const SAMPLES: { parts: [string, boolean][]; note: string }[] = [
  {
    parts: [
      ['rn', true],
      ['ercadolibre[.]com[.]mx', false],
    ],
    note: 'Una "r" y una "n" juntas se hacen pasar por una "m".',
  },
  {
    parts: [
      ['paypa', false],
      ['1', true],
      ['[.]com', false],
    ],
    note: 'Un uno en el lugar de la ele.',
  },
  {
    parts: [
      ['bbva', false],
      ['-mx-seguridad', true],
      ['[.]com', false],
    ],
    note: 'Agregar "seguridad" al nombre no lo vuelve un sitio del banco.',
  },
];

export function FraudSpecimen({ className }: { className?: string }) {
  return (
    <section aria-labelledby="specimen-title" className={cn('rounded-md bg-masthead p-6 text-masthead-ink sm:p-8', className)}>
      <h2 id="specimen-title" className="text-[19px] font-bold">
        Detalles que delatan un fraude
      </h2>
      <p className="mt-1.5 max-w-[52ch] text-[15px] text-masthead-ink/75">
        Así llegan muchos enlaces a la bandeja. Lo marcado en ámbar es lo que hay que notar.
      </p>

      <ul className="mt-6">
        {SAMPLES.map((sample) => (
          <li key={sample.note} className="border-t border-white/15 py-4 last:pb-0">
            <p className="font-mono text-[19px] break-all sm:text-[22px]">
              {sample.parts.map(([text, marked], index) =>
                marked ? (
                  <mark key={index} className="rounded-[2px] bg-accent px-0.5 text-on-accent">
                    {text}
                  </mark>
                ) : (
                  <span key={index}>{text}</span>
                ),
              )}
            </p>
            <p className="mt-1 text-[15px] text-masthead-ink/80">{sample.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
