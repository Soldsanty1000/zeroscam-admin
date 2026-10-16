// Las evidencias ya no son archivos públicos: el servidor las entrega solo con
// el Bearer en `/reports/<id>/evidence/<archivo>`. Un `<img src>` o un `<a href>`
// no pueden mandarlo, así que se piden con `api` y se muestran desde un blob.
// Lo que sigue es lo que se comprueba ANTES de pedir o mostrar nada.

/** Ruta autenticada de una evidencia; solo JPG o PDF, con nombre de 32 hex. */
export const EVIDENCE_PATH = /^\/reports\/\d+\/evidence\/[0-9a-f]{32}\.(jpg|pdf)$/;

export type EvidenceKind = 'image' | 'pdf';

export type Evidence = {
  path: string;
  kind: EvidenceKind;
  /** `<32hex>.<jpg|pdf>`, el nombre que se le enseña a quien revisa. */
  name: string;
};

/**
 * Valida una ruta de evidencia que mandó el servidor.
 *
 * @param path - Lo que llegó en `evidenceUrls`; puede ser cualquier cosa.
 * @param reportId - Si se da, la ruta debe pertenecer a ese reporte.
 * @returns La evidencia, o `null` si la ruta no es una de las permitidas.
 */
export function parseEvidence(path: unknown, reportId?: string | number): Evidence | null {
  if (typeof path !== 'string') return null;
  const match = EVIDENCE_PATH.exec(path);
  if (!match) return null;
  if (reportId !== undefined && path.split('/')[2] !== String(reportId)) return null;
  return {
    path,
    kind: match[1] === 'pdf' ? 'pdf' : 'image',
    name: path.slice(path.lastIndexOf('/') + 1),
  };
}

/** Tipo MIME con el que se arma el blob; no se confía en el del servidor. */
export const EVIDENCE_MIME: Record<EvidenceKind, string> = {
  image: 'image/jpeg',
  pdf: 'application/pdf',
};

/** ¿Los primeros bytes son los de un JPEG (FF D8 FF) o de un PDF (%PDF-)? */
export function matchesSignature(kind: EvidenceKind, head: Uint8Array): boolean {
  if (kind === 'image') {
    return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  }
  const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return head.length >= pdf.length && pdf.every((byte, i) => head[i] === byte);
}
