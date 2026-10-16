// El `id` de una URL es texto que escribe cualquiera: se valida antes de usarlo
// y se codifica al armar la ruta de la API.

/** Identificador numérico (reportes). */
export function isNumericId(value: unknown): value is string {
  return typeof value === 'string' && /^\d+$/.test(value);
}

/** Ruta de la API con un segmento variable ya codificado: `pathWithId('/users/', id)`. */
export function pathWithId(prefix: string, id: string | number, suffix = ''): string {
  return `${prefix}${encodeURIComponent(String(id))}${suffix}`;
}
