// Política de inactividad de la sesión del panel.

/** Tiempo sin actividad antes de cerrar la sesión (15 min). Cámbialo aquí. */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
/** Cuánto antes del cierre se avisa. */
export const IDLE_WARNING_MS = 60 * 1000;

/** En qué punto está una sesión que lleva `idleMs` sin actividad. */
export function idleState(
  idleMs: number,
  timeoutMs = IDLE_TIMEOUT_MS,
  warningMs = IDLE_WARNING_MS,
): 'active' | 'warning' | 'expired' {
  if (idleMs >= timeoutMs) return 'expired';
  if (idleMs >= timeoutMs - warningMs) return 'warning';
  return 'active';
}
