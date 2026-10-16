# ZeroScam — Panel de administración

Panel web (Next.js 16, React 19, Tailwind 4, axios) con el que el equipo de
ZeroScam revisa los reportes de fraude que llegan de la app, clasifica su
riesgo, administra cuentas y exporta expedientes para la Policía Cibernética.
Solo es una interfaz: todos los datos y todos los permisos viven en la API
(`backend`), que es quien decide qué se puede ver y hacer.

> **Next.js 16 no es el que conoces.** `AGENTS.md` pide leer la guía de
> `node_modules/next/dist/docs/` antes de tocar configuración. Aquí, por
> ejemplo, `middleware` se llama `proxy` (`src/proxy.ts`).

## Roles con acceso

| Rol | Entra | Qué puede hacer |
| --- | --- | --- |
| `Administrador`, `Owner` | Sí | Reportes, cambiar estado y riesgo, exportar, estadísticas, **Usuarios** (solo el `Owner` cambia roles). |
| `Policia` | Sí | Ve los reportes ya `VALIDADO`/`CANALIZADO`, estadísticas de reportes y exporta. No ve Usuarios ni los datos del denunciante. |
| `Usuario` | **No** | Es el rol de la app móvil. Tras el login el panel consulta `GET /users/me`, cierra la sesión en el servidor y muestra «Esta cuenta no tiene acceso al panel.». |

La interfaz oculta lo que el rol no puede usar (y no pinta nada hasta conocerlo),
pero eso es comodidad: el servidor responde 403 aunque alguien escriba la URL o
llame a la API a mano.

## Variables de entorno

Copia `.env.example` a `.env.local`.

| Variable | Qué es |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL de la API **vista desde el navegador** (por defecto `http://localhost:3000`). Se incrusta en el build: si la cambias, vuelve a compilar. |

- En producción debe ser `https://`. `http://` solo se acepta para `localhost` o
  `127.0.0.1`; con cualquier otra cosa **el build falla** (`next.config.ts`).
- En el backend, `CORS_ORIGINS` debe incluir el origen del panel
  (`http://localhost:3001` en local), y su `HOST`/`PORT` deben coincidir con esta URL.

## Cómo correrlo

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3001 (la API usa el 3000)
```

Producción:

```bash
npm run build
npm start          # también en el puerto 3001
```

Otros comandos:

```bash
npm test           # pruebas (vitest)
npm run lint
npx tsc --noEmit
npm run audit      # npm audit --omit=dev
```

## Qué se hizo por seguridad

- **Cabeceras** (`next.config.ts` y `src/proxy.ts`; lógica en `src/lib/security.ts`):
  CSP con nonce por petición y `strict-dynamic` (sin `unsafe-eval` en producción),
  `connect-src` solo al propio origen y a la API, `frame-ancestors 'none'`,
  `object-src 'none'`; además `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy` restrictiva,
  `Cross-Origin-Opener-Policy: same-origin`, HSTS (solo en producción con la API en
  https) y sin `X-Powered-By`. Como el nonce se genera por petición, todas las páginas
  se renderizan en cada petición.
- **Sesión**: `logout` llama a `POST /auth/logout` (revoca la sesión en el servidor,
  con tope de tiempo) y luego borra los tokens; el evento `storage` cierra todas las
  pestañas; tras 15 min sin actividad (constante `IDLE_TIMEOUT_MS` en
  `src/lib/idle.ts`) se cierra la sesión, con aviso un minuto antes. El refresh se
  coordina entre pestañas con `navigator.locks`, no se manda sin refresh token y solo
  cierra la sesión si el servidor responde 400/401.
- **Login**: mensajes fijos («Correo o contraseña incorrectos», cuenta suspendida solo
  si el servidor lo indica); el texto del servidor solo se usa para 429/5xx. El código
  de dos pasos admite 3 intentos en la interfaz y luego pide el login otra vez.
- **Evidencias**: ya no hay `<img src>` ni `<a href>` hacia la API. La ruta se valida
  (`/reports/<id>/evidence/<32hex>.jpg|pdf`), se descarga con el Bearer, se comprueban
  los primeros bytes y las imágenes se muestran desde un `blob:` que se libera al
  salir. Los PDF solo se descargan.
- **Enlaces reportados**: `defang` los desactiva (`hxxps://sitio[.]com`), quita
  caracteres de control y bidi, y marca los dominios con letras no ASCII o punycode.
  Se aplica también a descripciones, texto sospechoso y observaciones del historial.
- **Entradas**: el `id` de la URL se valida (`/^\d+$/`) y se codifica en las rutas.
- **Exportación**: el nombre del archivo se sanea y el panel avisa que contiene datos
  personales.

## Riesgos residuales

- **Tokens en `localStorage`.** El backend entrega los tokens en el cuerpo JSON, así
  que el panel no puede usar cookies `httpOnly`. Un XSS podría leerlos. Se reduce con
  el CSP, el access token de 15 min, el cierre por inactividad y la revocación en el
  servidor, pero **no se elimina**. La alternativa sólida es que la API los ponga en
  una cookie `httpOnly; Secure; SameSite=Strict` (con protección CSRF): eso exige
  un cambio en el backend y en este panel.
- **`style-src 'unsafe-inline'`.** `sonner` e `input-otp` crean `<style>` al vuelo sin
  nonce y los componentes usan `style=""`. No ejecuta código, pero un estilo inyectado
  podría alterar la apariencia o filtrar datos por CSS.
- **Las comprobaciones de rol del panel son cosméticas.** Quien tenga un token puede
  llamar a la API directamente: lo que protege los datos es el servidor.
- **`defang` ayuda, no garantiza.** Es una ayuda visual: quien copie el texto sigue
  siendo responsable. Al quitar caracteres de formato se pierde el ZWJ de algunos emojis.
- **Inactividad.** Si el navegador congela una pestaña en segundo plano, el cierre
  puede tardar hasta un minuto más. Un access token ya emitido vale hasta 15 min si no
  se pudo avisar al servidor (sin red).
- **`npm audit`.** Sin vulnerabilidades en producción (`npm run audit`); el árbol de
  desarrollo (`eslint-config-next` → `braces`) reporta avisos que no llegan al build.
- **Despliegue con IP en http.** Un build de producción con `NEXT_PUBLIC_API_URL`
  `http://192.168.x.x` falla a propósito: usa https (por ejemplo un proxy inverso con TLS).
