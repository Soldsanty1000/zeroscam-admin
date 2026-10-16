import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { canAccessPanel, NO_PANEL_ACCESS_MESSAGE, type Me } from './access';
import { GENERIC_LOGIN_MESSAGE, loginErrorMessage, type LoginNotice, type LoginStep } from './login-errors';
import { DEFAULT_API_URL } from './security';

// next.config.ts ya comprobó en el build que esta URL sea https (o local).
export const API_URL = (process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, '');

// ---------- Guardado ----------
//
// Los tokens viven en localStorage porque el servidor los entrega en el cuerpo
// JSON y no en una cookie httpOnly. Cualquier XSS podría leerlos: por eso el
// access token dura 15 minutos, la sesión se cierra por inactividad y el CSP
// (ver proxy.ts) limita qué código puede correr. Detalle en el README.

export const ACCESS_KEY = 'accessToken';
export const REFRESH_KEY = 'refreshToken';

export function saveTokens(tokens: {
  accessToken: string;
  refreshToken?: string;
}): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ---------- Cliente ----------

export const api = axios.create({ baseURL: API_URL, timeout: 30_000 });

// ---------- Envío: el Bearer en cada petición ----------

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------- Refresco: 401 → refresh → reintento ----------

const REFRESH_LOCK = 'zeroscam-refresh';
const REFRESH_TIMEOUT_MS = 10_000;

/** No hay refresh token guardado: no se manda nada al servidor. */
class NoRefreshTokenError extends Error {}

let refreshing: Promise<void> | null = null;

/** Corre `task` con el candado entre pestañas; sin `navigator.locks`, a secas. */
async function underLock(task: () => Promise<void>): Promise<void> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    await navigator.locks.request(REFRESH_LOCK, task);
    return;
  }
  await task();
}

async function renewTokens(staleToken: string | null): Promise<void> {
  // Otra pestaña pudo renovar mientras esta esperaba el candado: se usa su token
  // en vez de gastar el refresh token una segunda vez.
  const current = getAccessToken();
  if (current && current !== staleToken) return;

  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new NoRefreshTokenError();
  // axios "pelón": esta petición no pasa por los interceptores de `api`
  const { data } = await axios.post<{ accessToken: string }>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { timeout: REFRESH_TIMEOUT_MS },
  );
  saveTokens(data);
}

/**
 * Renueva el access token. Dentro de la pestaña, las peticiones que fallan a la
 * vez comparten una sola renovación; entre pestañas, `navigator.locks` las pone
 * en fila para que solo una gaste el refresh token.
 */
function refreshAccessToken(staleToken: string | null): Promise<void> {
  refreshing ??= underLock(() => renewTokens(staleToken)).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const is401 = error.response?.status === 401;
    const isAuthRoute = original?.url?.startsWith('/auth/');
    if (!is401 || !original || original._retry || isAuthRoute) {
      return Promise.reject(error);
    }

    original._retry = true;
    const staleToken = String(original.headers?.Authorization ?? '').replace(/^Bearer /, '') || null;
    try {
      await refreshAccessToken(staleToken);
    } catch (e) {
      if (e instanceof NoRefreshTokenError) {
        endSession('sesion');
        return Promise.reject(error);
      }
      // Solo un 400/401 dice que la sesión terminó. Si el servidor está apagado,
      // limita el ritmo (429) o falla (5xx), los tokens se conservan.
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status === 400 || status === 401) endSession('sesion');
      return Promise.reject(e);
    }
    return api(original);
  },
);

// ---------- Cierre de sesión ----------

const LOGOUT_TIMEOUT_MS = 3_000;
/** Tope de todo el intento de avisarle al servidor; pasado esto se cierra igual. */
const REVOKE_BUDGET_MS = 5_000;

/**
 * Le pide al servidor que revoque la sesión (`POST /auth/logout`): sus access y
 * refresh tokens dejan de valer al instante. Es de mejor esfuerzo: sin red o
 * con el servidor caído, el cierre local sigue adelante.
 */
async function revokeOnServer(): Promise<void> {
  const post = (token: string) =>
    axios.post(`${API_URL}/auth/logout`, undefined, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: LOGOUT_TIMEOUT_MS,
    });

  const attempt = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await post(token);
    } catch (e) {
      // Un access token vencido no puede cerrar nada: se renueva una vez y se reintenta.
      if (axios.isAxiosError(e) && e.response?.status === 401 && getRefreshToken()) {
        try {
          await refreshAccessToken(token);
          const fresh = getAccessToken();
          if (fresh) await post(fresh);
        } catch {
          // mejor esfuerzo
        }
      }
    }
  };

  await Promise.race([attempt(), new Promise<void>((resolve) => setTimeout(resolve, REVOKE_BUDGET_MS))]);
}

/** Limpia los tokens de ESTA pestaña (las demás se enteran por el evento `storage`) y va al login. */
export function endSession(reason?: LoginNotice): void {
  clearTokens();
  window.location.replace(reason ? `/login?aviso=${reason}` : '/login');
}

/** Cierra la sesión: primero en el servidor (mejor esfuerzo) y luego aquí. */
export async function logout(reason?: LoginNotice): Promise<void> {
  await revokeOnServer();
  endSession(reason);
}

// ---------- Inicio de sesión ----------

/** Lo que regresa el login cuando la cuenta tiene verificación en dos pasos. */
export type TwoFactorChallenge = {
  challengeId: string;
  /** Correo enmascarado al que se mandó el código. */
  destination: string;
};

type Tokens = { accessToken: string; refreshToken: string };

/** La cuenta es válida, pero su rol no entra al panel (por ejemplo, `Usuario`). */
export class PanelAccessError extends Error {
  constructor() {
    super(NO_PANEL_ACCESS_MESSAGE);
    this.name = 'PanelAccessError';
  }
}

/**
 * Con los tokens recién guardados, pregunta quién es la cuenta (`GET /users/me`).
 * Si el rol no entra al panel, o no se pudo saber, cierra la sesión en el
 * servidor, borra los tokens y falla: un token de la app móvil no debe quedarse
 * guardado en el panel.
 */
async function enterPanel(): Promise<void> {
  let allowed = false;
  try {
    const { data } = await api.get<Me>('/users/me');
    allowed = canAccessPanel(data.role);
  } catch (e) {
    await revokeOnServer();
    clearTokens();
    throw e;
  }
  if (allowed) return;
  await revokeOnServer();
  clearTokens();
  throw new PanelAccessError();
}

/**
 * Inicia sesión. Si la cuenta tiene verificación en dos pasos no hay tokens
 * todavía: regresa el desafío, que se canjea con `verifyCode`.
 */
export async function login(
  email: string,
  password: string,
): Promise<TwoFactorChallenge | null> {
  const { data } = await api.post<
    Tokens | ({ twoFactorRequired: true } & TwoFactorChallenge)
  >('/auth/login', { email, password });
  if ('twoFactorRequired' in data) {
    return { challengeId: data.challengeId, destination: data.destination };
  }
  saveTokens(data);
  await enterPanel();
  return null;
}

/** Segundo paso del login: el código de 6 dígitos del desafío. */
export async function verifyCode(
  challengeId: string,
  code: string,
): Promise<void> {
  const { data } = await api.post<Tokens>('/auth/two-factor/verify', {
    challengeId,
    code,
  });
  saveTokens(data);
  await enterPanel();
}

// ---------- Errores ----------

/** Código HTTP de un error de axios, o `undefined` si no hubo respuesta. */
export function httpStatus(e: unknown): number | undefined {
  return axios.isAxiosError(e) ? e.response?.status : undefined;
}

/** Texto fijo para un fallo del login; ver `loginErrorMessage` para el criterio. */
export function describeLoginError(e: unknown, step: LoginStep = 'password', attemptsLeft?: number): string {
  if (e instanceof PanelAccessError) return e.message;
  if (axios.isAxiosError(e)) {
    const body = e.response?.data as { message?: unknown } | undefined;
    return loginErrorMessage(e.response?.status, body?.message, step, attemptsLeft);
  }
  return GENERIC_LOGIN_MESSAGE;
}

export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) return 'No se pudo conectar con el servidor';
    const message = (e.response.data as { message?: string | string[] })
      ?.message;
    if (message) return Array.isArray(message) ? message.join(', ') : message;
  }
  return 'Ocurrió un error inesperado';
}
