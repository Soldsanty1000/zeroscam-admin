// Qué puede hacer cada rol en el panel. Es la misma regla que aplica el
// servidor (`@Roles(...)`), repetida aquí solo para decidir qué se muestra:
// lo que de verdad protege los datos es el servidor, no esta interfaz.

export type Me = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
};

/** Roles con acceso al panel. `Usuario` (la app móvil) no entra. */
export const PANEL_ROLES: readonly string[] = ['Administrador', 'Owner', 'Policia'];

/** Roles que ven y editan cuentas (`/usuarios`). */
const USER_ADMIN_ROLES: readonly string[] = ['Administrador', 'Owner'];

/** Roles que cambian el estado y el riesgo de un reporte. */
const MODERATOR_ROLES: readonly string[] = ['Administrador', 'Owner'];

// Todas las reglas fallan cerradas: sin rol (aún no se sabe, o el servidor no
// lo mandó) la respuesta es "no".

export function canAccessPanel(role: string | null | undefined): boolean {
  return typeof role === 'string' && PANEL_ROLES.includes(role);
}

export function canManageUsers(role: string | null | undefined): boolean {
  return typeof role === 'string' && USER_ADMIN_ROLES.includes(role);
}

export function canModerate(role: string | null | undefined): boolean {
  return typeof role === 'string' && MODERATOR_ROLES.includes(role);
}

/** Texto que se le muestra a una cuenta que no puede entrar al panel. */
export const NO_PANEL_ACCESS_MESSAGE = 'Esta cuenta no tiene acceso al panel.';
