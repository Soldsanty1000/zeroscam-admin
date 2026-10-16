'use client';

import { createContext, useContext } from 'react';
import type { Me } from './access';

export type { Me };

export type Session = {
  /**
   * La cuenta con sesión abierta. El layout del panel no pinta nada hasta
   * conocerla, así que dentro del panel nunca es `null`; el contexto lo admite
   * solo por su valor inicial.
   */
  me: Me | null;
  /** Reportes RECIBIDO o EN_REVISION; `null` mientras no se sabe. */
  pending: number | null;
  setPending: (count: number) => void;
  openCommand: () => void;
};

export const SessionContext = createContext<Session>({
  me: null,
  pending: null,
  setPending: () => undefined,
  openCommand: () => undefined,
});

export function useSession(): Session {
  return useContext(SessionContext);
}

export function useMe(): Me | null {
  return useContext(SessionContext).me;
}
