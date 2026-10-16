import { NO_PANEL_ACCESS_MESSAGE } from './access';

// Qué se le dice a quien falla al iniciar sesión. El texto del servidor no se
// muestra tal cual: un mensaje distinto por caso le diría a un atacante si la
// cuenta existe, está suspendida o solo falló la contraseña.

/** Intentos del código de verificación antes de volver a pedir el login. */
export const MAX_CODE_ATTEMPTS = 3;

export const BAD_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos';
export const SUSPENDED_MESSAGE =
  'Tu cuenta está suspendida. Comunícate con la administración para reactivarla.';
export const OFFLINE_MESSAGE = 'No se pudo conectar con el servidor';
export const GENERIC_LOGIN_MESSAGE = 'No se pudo iniciar sesión. Intenta de nuevo.';
export const TOO_MANY_REQUESTS_MESSAGE = 'Demasiados intentos. Espera unos minutos antes de volver a intentar.';
export const SERVER_FAILURE_MESSAGE = 'El servidor tuvo un problema. Intenta de nuevo más tarde.';
export const CODE_EXHAUSTED_MESSAGE = 'Agotaste los intentos del código. Inicia sesión de nuevo.';

export type LoginStep = 'password' | 'code';

/** El mensaje del servidor solo se acepta si es un texto corto y sin caracteres de control. */
function cleanServerMessage(message: unknown): string | null {
  const text = Array.isArray(message) ? message.join(', ') : message;
  if (typeof text !== 'string') return null;
  const clean = text.replace(/[\p{Cc}\p{Cf}]/gu, ' ').trim();
  return clean.length > 0 && clean.length <= 200 ? clean : null;
}

/**
 * Mensaje de interfaz para un fallo del login.
 *
 * @param status - Código HTTP, o `undefined` si el servidor no respondió.
 * @param serverMessage - `message` del cuerpo del error, si lo hubo.
 * @param step - `password` es el login; `code` es el código de dos pasos.
 * @param attemptsLeft - Intentos del código que quedan, para avisarlos.
 */
export function loginErrorMessage(
  status: number | undefined,
  serverMessage?: unknown,
  step: LoginStep = 'password',
  attemptsLeft?: number,
): string {
  if (status === undefined) return OFFLINE_MESSAGE;

  // Solo estos dos casos usan el texto del servidor: es de límite de ritmo o
  // de una caída, no revela nada de la cuenta.
  if (status === 429) return cleanServerMessage(serverMessage) ?? TOO_MANY_REQUESTS_MESSAGE;
  if (status >= 500) return cleanServerMessage(serverMessage) ?? SERVER_FAILURE_MESSAGE;

  if (status === 400 || status === 401) {
    if (step === 'code') {
      const left =
        attemptsLeft !== undefined && attemptsLeft > 0
          ? ` Te ${attemptsLeft === 1 ? 'queda 1 intento' : `quedan ${attemptsLeft} intentos`}.`
          : '';
      return `El código no es válido o ya expiró.${left}`;
    }
    return BAD_CREDENTIALS_MESSAGE;
  }

  // El 403 del login solo significa "cuenta suspendida" si el servidor lo dice.
  if (status === 403 && typeof serverMessage === 'string' && /suspendid/i.test(serverMessage)) {
    return SUSPENDED_MESSAGE;
  }

  return GENERIC_LOGIN_MESSAGE;
}

/** Avisos que otra pantalla deja en `/login?aviso=…`; solo se aceptan estos. */
export const LOGIN_NOTICES = {
  inactividad: 'Cerramos tu sesión por inactividad. Inicia sesión de nuevo.',
  'sin-acceso': NO_PANEL_ACCESS_MESSAGE,
  sesion: 'Tu sesión terminó. Inicia sesión de nuevo.',
} as const;

export type LoginNotice = keyof typeof LOGIN_NOTICES;

export function isLoginNotice(value: unknown): value is LoginNotice {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LOGIN_NOTICES, value);
}
