import { describe, expect, it } from 'vitest';
import {
  BAD_CREDENTIALS_MESSAGE,
  GENERIC_LOGIN_MESSAGE,
  LOGIN_NOTICES,
  OFFLINE_MESSAGE,
  SERVER_FAILURE_MESSAGE,
  SUSPENDED_MESSAGE,
  TOO_MANY_REQUESTS_MESSAGE,
  isLoginNotice,
  loginErrorMessage,
} from './login-errors';

describe('loginErrorMessage', () => {
  it('muestra siempre el mismo texto fijo para 400 y 401, sin importar lo que diga el servidor', () => {
    expect(loginErrorMessage(401, 'Correo o contraseña incorrectos')).toBe(BAD_CREDENTIALS_MESSAGE);
    expect(loginErrorMessage(401, 'El usuario no existe')).toBe(BAD_CREDENTIALS_MESSAGE);
    expect(loginErrorMessage(400, ['email must be an email'])).toBe(BAD_CREDENTIALS_MESSAGE);
    expect(loginErrorMessage(401)).toBe(BAD_CREDENTIALS_MESSAGE);
  });

  it('dice que la cuenta está suspendida solo si el 403 lo indica', () => {
    expect(loginErrorMessage(403, 'La cuenta está suspendida')).toBe(SUSPENDED_MESSAGE);
    expect(loginErrorMessage(403, 'Forbidden resource')).toBe(GENERIC_LOGIN_MESSAGE);
    expect(loginErrorMessage(403)).toBe(GENERIC_LOGIN_MESSAGE);
  });

  it('usa el mensaje del servidor únicamente para 429 y 5xx', () => {
    expect(loginErrorMessage(429, 'Demasiados intentos. Intenta de nuevo en 4 min.')).toBe(
      'Demasiados intentos. Intenta de nuevo en 4 min.',
    );
    expect(loginErrorMessage(503, 'Servicio en mantenimiento')).toBe('Servicio en mantenimiento');
    expect(loginErrorMessage(429)).toBe(TOO_MANY_REQUESTS_MESSAGE);
    expect(loginErrorMessage(500)).toBe(SERVER_FAILURE_MESSAGE);
    // Un 404 o un 409 no filtran su texto.
    expect(loginErrorMessage(404, 'No existe la ruta /auth/login')).toBe(GENERIC_LOGIN_MESSAGE);
  });

  it('descarta mensajes del servidor muy largos o con caracteres de control', () => {
    expect(loginErrorMessage(500, 'x'.repeat(500))).toBe(SERVER_FAILURE_MESSAGE);
    expect(loginErrorMessage(429, 'Espera‮ un rato')).toBe('Espera  un rato');
    expect(loginErrorMessage(500, { stack: 'at …' })).toBe(SERVER_FAILURE_MESSAGE);
  });

  it('sin respuesta del servidor avisa que no hay conexión', () => {
    expect(loginErrorMessage(undefined)).toBe(OFFLINE_MESSAGE);
  });

  it('en el paso del código cuenta los intentos que quedan', () => {
    expect(loginErrorMessage(401, 'cualquier cosa', 'code', 2)).toBe('El código no es válido o ya expiró. Te quedan 2 intentos.');
    expect(loginErrorMessage(401, undefined, 'code', 1)).toBe('El código no es válido o ya expiró. Te queda 1 intento.');
    expect(loginErrorMessage(401, undefined, 'code')).toBe('El código no es válido o ya expiró.');
  });
});

describe('isLoginNotice', () => {
  it('solo acepta avisos conocidos', () => {
    expect(isLoginNotice('inactividad')).toBe(true);
    expect(isLoginNotice('sin-acceso')).toBe(true);
    expect(isLoginNotice('<script>alert(1)</script>')).toBe(false);
    expect(isLoginNotice('constructor')).toBe(false);
    expect(isLoginNotice('__proto__')).toBe(false);
    expect(isLoginNotice(null)).toBe(false);
  });

  it('el aviso de sin acceso usa el texto pedido', () => {
    expect(LOGIN_NOTICES['sin-acceso']).toBe('Esta cuenta no tiene acceso al panel.');
  });
});
