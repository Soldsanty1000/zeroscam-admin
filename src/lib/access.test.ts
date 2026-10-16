import { describe, expect, it } from 'vitest';
import { canAccessPanel, canManageUsers, canModerate } from './access';

describe('guarda por rol', () => {
  it('canAccessPanel: Administrador, Owner y Policia entran; Usuario no', () => {
    expect(canAccessPanel('Administrador')).toBe(true);
    expect(canAccessPanel('Owner')).toBe(true);
    expect(canAccessPanel('Policia')).toBe(true);
    expect(canAccessPanel('Usuario')).toBe(false);
  });

  it('canManageUsers: solo Administrador y Owner (no Policia ni Usuario)', () => {
    expect(canManageUsers('Administrador')).toBe(true);
    expect(canManageUsers('Owner')).toBe(true);
    expect(canManageUsers('Policia')).toBe(false);
    expect(canManageUsers('Usuario')).toBe(false);
  });

  it('canModerate: solo Administrador y Owner cambian estado y riesgo', () => {
    expect(canModerate('Administrador')).toBe(true);
    expect(canModerate('Owner')).toBe(true);
    expect(canModerate('Policia')).toBe(false);
    expect(canModerate('Usuario')).toBe(false);
  });

  it('falla cerrada: sin rol, o con un rol desconocido o disfrazado, todo es "no"', () => {
    for (const role of [undefined, null, '', 'administrador', 'ADMINISTRADOR', ' Owner', 'Owner ', 'Root', 'constructor']) {
      expect(canAccessPanel(role)).toBe(false);
      expect(canManageUsers(role)).toBe(false);
      expect(canModerate(role)).toBe(false);
    }
  });
});
