'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Download, FileText, ImageOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api';
import { saveBlob } from '@/lib/download';
import { EVIDENCE_MIME, matchesSignature, parseEvidence, type Evidence } from '@/lib/evidence';

type Props = { reportId: string; paths: string[] };

const tile =
  'grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-sunk outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10';
const shared =
  'block w-full rounded-lg text-left outline-none transition-transform duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-ink';

/**
 * Pide una evidencia con el Bearer y la entrega como `Blob` con el tipo que
 * se espera por su extensión (no el que diga el servidor). Si los primeros
 * bytes no son los de un JPEG o un PDF, no se usa.
 */
async function fetchEvidence(evidence: Evidence, signal?: AbortSignal): Promise<Blob> {
  const { data } = await api.get<Blob>(evidence.path, { responseType: 'blob', signal });
  const head = new Uint8Array(await data.slice(0, 8).arrayBuffer());
  if (!matchesSignature(evidence.kind, head)) throw new Error('El archivo no es del tipo que dice ser');
  return new Blob([data], { type: EVIDENCE_MIME[evidence.kind] });
}

type Loaded = { url: string } | { error: string } | null;

/**
 * Las evidencias del reporte. Ya no son públicas: se piden con `api` (lleva el
 * Bearer) y las imágenes se muestran desde `URL.createObjectURL`, que se
 * libera al salir. Los PDF no se abren en la página ni en una pestaña con el
 * origen de la API: solo se descargan.
 */
export function EvidenceGallery({ reportId, paths }: Props) {
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {paths.map((path, index) => {
          // La ruta viene del servidor, pero se valida antes de pedirla.
          const evidence = parseEvidence(path, reportId);
          return (
            <li key={`${index}-${path}`}>
              {evidence ? (
                evidence.kind === 'image' ? (
                  <ImageTile evidence={evidence} onOpen={(url) => setPreview({ url, name: evidence.name })} />
                ) : (
                  <PdfTile evidence={evidence} />
                )
              ) : (
                <InvalidTile />
              )}
            </li>
          );
        })}
      </ul>

      <Dialog.Root open={preview !== null} onOpenChange={(open) => !open && closePreview()}>
        <Dialog.Portal>
          <Dialog.Backdrop className="backdrop fixed inset-0 z-50 bg-[#050a1c]/80" />
          <Dialog.Popup className="modal fixed inset-0 z-50 grid place-items-center p-6 outline-none" onClick={closePreview}>
            <Dialog.Title className="sr-only">Evidencia</Dialog.Title>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element -- es un blob local descargado con el Bearer
              <img
                src={preview.url}
                alt="Evidencia adjunta al reporte"
                className="max-h-full max-w-full rounded-lg object-contain shadow-pop"
                onClick={(event) => event.stopPropagation()}
              />
            )}
            <Dialog.Close
              aria-label="Cerrar"
              className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-white/10 text-white transition-[background-color,transform] duration-150 hover:bg-white/20 active:scale-[0.97]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function Caption({ name }: { name: string }) {
  return <span className="mt-1.5 block truncate font-mono text-[11px] text-muted">{name}</span>;
}

function InvalidTile() {
  return (
    <div role="img" aria-label="Archivo de evidencia no válido">
      <span className={tile}>
        <ImageOff className="size-6 text-muted" />
      </span>
      <Caption name="Archivo no válido" />
    </div>
  );
}

function ImageTile({ evidence, onOpen }: { evidence: Evidence; onOpen: (url: string) => void }) {
  const { path, kind, name } = evidence;
  const [state, setState] = useState<Loaded>(null);

  // Depende de los datos y no del objeto: `parseEvidence` crea uno nuevo en cada render.
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    fetchEvidence({ path, kind, name }, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setState({ error: errorMessage(e) });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, kind, name]);

  const content = (
    <>
      <span className={tile}>
        {state === null ? (
          <Skeleton className="size-full rounded-none" />
        ) : 'url' in state ? (
          // eslint-disable-next-line @next/next/no-img-element -- es un blob local descargado con el Bearer
          <img src={state.url} alt="" className="size-full object-cover" />
        ) : (
          <ImageOff className="size-6 text-muted" />
        )}
      </span>
      <Caption name={evidence.name} />
    </>
  );

  if (state && 'url' in state) {
    return (
      <button type="button" className={shared} aria-label={`Ver evidencia ${evidence.name}`} onClick={() => onOpen(state.url)}>
        {content}
      </button>
    );
  }
  return (
    <div title={state && 'error' in state ? state.error : undefined} aria-busy={state === null || undefined}>
      {content}
    </div>
  );
}

function PdfTile({ evidence }: { evidence: Evidence }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      saveBlob(await fetchEvidence(evidence), evidence.name);
    } catch (e) {
      toast.error(errorMessage(e));
    }
    setLoading(false);
  }

  return (
    <button type="button" className={shared} disabled={loading} aria-label={`Descargar evidencia ${evidence.name}`} onClick={download}>
      <span className={tile}>
        <span className="grid justify-items-center gap-1.5 text-muted">
          <FileText className="size-6" />
          <span className="flex items-center gap-1 text-xs">
            <Download aria-hidden className="size-3" />
            {loading ? 'Descargando…' : 'Descargar'}
          </span>
        </span>
      </span>
      <Caption name={evidence.name} />
    </button>
  );
}
