'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { ACCESS_KEY, endSession, getAccessToken, logout } from './api';
import { idleState } from './idle';

const ACTIVITY_KEY = 'zeroscam:lastActivity';
const CHECK_EVERY_MS = 5_000;
const WRITE_EVERY_MS = 5_000;
const WARNING_ID = 'idle-warning';
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;

function readStoredActivity(): number {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Guardas de la sesión abierta, mientras `enabled`:
 *
 * 1. **Otras pestañas.** Si alguien cierra la sesión en otra pestaña, los tokens
 *    desaparecen de localStorage y el evento `storage` cierra esta también.
 * 2. **Inactividad.** Sin actividad en NINGUNA pestaña durante `IDLE_TIMEOUT_MS`
 *    se cierra la sesión (en el servidor también). Un minuto antes sale un aviso.
 */
export function useSessionGuards(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    function onStorage(event: StorageEvent) {
      // `key === null` es `localStorage.clear()`.
      if ((event.key === null || event.key === ACCESS_KEY) && !getAccessToken()) {
        endSession('sesion');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let last = Date.now();
    let written = 0;
    let warned = false;
    let closing = false;

    function mark() {
      const now = Date.now();
      last = now;
      if (warned) {
        warned = false;
        toast.dismiss(WARNING_ID);
      }
      // La actividad se comparte con las demás pestañas por localStorage.
      if (now - written >= WRITE_EVERY_MS) {
        written = now;
        try {
          localStorage.setItem(ACTIVITY_KEY, String(now));
        } catch {
          // sin localStorage: solo cuenta la actividad de esta pestaña
        }
      }
    }

    function check() {
      if (closing) return;
      const idle = Date.now() - Math.max(last, readStoredActivity());
      const state = idleState(idle);
      if (state === 'expired') {
        closing = true;
        toast.dismiss(WARNING_ID);
        void logout('inactividad');
      } else if (state === 'warning' && !warned) {
        warned = true;
        toast.warning('Tu sesión se cerrará pronto por inactividad', {
          id: WARNING_ID,
          description: 'Mueve el ratón o pulsa una tecla para seguir.',
          duration: Infinity,
        });
      }
    }

    mark();
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, mark, { passive: true, capture: true });
    const timer = setInterval(check, CHECK_EVERY_MS);
    // Al volver a la pestaña (o despertar la computadora) no se espera al siguiente ciclo.
    document.addEventListener('visibilitychange', check);

    return () => {
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, mark, { capture: true });
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      toast.dismiss(WARNING_ID);
    };
  }, [enabled]);
}
