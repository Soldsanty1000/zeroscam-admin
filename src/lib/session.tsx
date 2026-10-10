'use client';

import { createContext, useContext } from 'react';

export type Me = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
};

export const SessionContext = createContext<Me | null>(null);

/** La cuenta con sesión abierta; `null` mientras se pide a `GET /users/me`. */
export function useMe(): Me | null {
  return useContext(SessionContext);
}

export function isStaff(me: Me | null): boolean {
  return me?.role === 'Administrador' || me?.role === 'Owner';
}
