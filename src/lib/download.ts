// Descargas que arma el propio panel (el expediente y las evidencias): el
// archivo se pide con `api`, que lleva el Bearer, y aquí solo se entrega.

/**
 * Nombre de archivo seguro para el expediente que baja el navegador. El folio
 * viene del servidor, pero se trata como entrada no confiable: solo
 * `[A-Za-z0-9_.-]`, sin puntos al inicio ni rutas.
 */
export function exportFileName(folio: unknown, extension = 'json'): string {
  const base =
    String(folio ?? '')
      .replace(/[^A-Za-z0-9_.-]/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 64) || 'expediente';
  return `${base}.${extension}`;
}

/** Cuánto vive el enlace temporal: el navegador necesita tiempo para empezar a guardar. */
export const REVOKE_DELAY_MS = 10_000;

/** Guarda un blob como archivo. Nunca lo abre: es una descarga, no una navegación. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Soltarlo de inmediato cancela la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
