'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import {
  EventInfo,
  fetchEvent,
  formatBytes,
  uploadFile,
} from '@/lib/api';

type QueueItem = {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'preparing' | 'uploading' | 'done' | 'error';
  error?: string;
};

const IMAGE_MIME = /^image\//;
const VIDEO_MIME = /^video\//;

function isMediaFile(file: File): boolean {
  if (IMAGE_MIME.test(file.type) || VIDEO_MIME.test(file.type)) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|mp4|mov|webm|m4v|3gp)$/i.test(
    file.name,
  );
}

async function prepareFile(file: File): Promise<File> {
  // Skip compression for already-small photos (fast path)
  if (!IMAGE_MIME.test(file.type) || file.type === 'image/gif') {
    return file;
  }
  if (file.size <= 3 * 1024 * 1024) {
    return file;
  }

  try {
    const compressed = imageCompression(file, {
      maxSizeMB: 3,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.82,
    });
    const timeout = new Promise<File>((resolve) => {
      setTimeout(() => resolve(file), 10000);
    });
    return await Promise.race([compressed, timeout]);
  } catch {
    return file;
  }
}

type Props = {
  code: string;
};

export function GuestUpload({ code }: Props) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const uploading = useRef(false);
  const guestNameRef = useRef(guestName);
  guestNameRef.current = guestName;

  const patchQueue = useCallback(
    (updater: (prev: QueueItem[]) => QueueItem[]) => {
      setQueue((prev) => {
        const next = updater(prev);
        queueRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchEvent(code)
      .then((e) => {
        if (!cancelled) setEvent(e);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const processQueue = useCallback(async () => {
    if (uploading.current) return;
    uploading.current = true;

    try {
      while (true) {
        const next = queueRef.current.find((i) => i.status === 'pending');
        if (!next) break;

        patchQueue((prev) =>
          prev.map((i) =>
            i.id === next.id ? { ...i, status: 'preparing', progress: 0 } : i,
          ),
        );

        try {
          const prepared = await prepareFile(next.file);

          patchQueue((prev) =>
            prev.map((i) =>
              i.id === next.id ? { ...i, status: 'uploading', progress: 0 } : i,
            ),
          );

          await uploadFile(
            code,
            prepared,
            guestNameRef.current || undefined,
            (pct) => {
              patchQueue((prev) =>
                prev.map((i) =>
                  i.id === next.id ? { ...i, progress: pct } : i,
                ),
              );
            },
          );

          patchQueue((prev) =>
            prev.map((i) =>
              i.id === next.id
                ? { ...i, status: 'done', progress: 100 }
                : i,
            ),
          );
          setDoneCount((c) => c + 1);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Ngarkimi dështoi';
          patchQueue((prev) =>
            prev.map((i) =>
              i.id === next.id
                ? { ...i, status: 'error', error: message }
                : i,
            ),
          );
        }
      }
    } finally {
      uploading.current = false;
    }
  }, [code, patchQueue]);

  useEffect(() => {
    if (queue.some((i) => i.status === 'pending')) {
      void processQueue();
    }
  }, [queue, processQueue]);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter(isMediaFile);
    if (!list.length) return;
    const items: QueueItem[] = list.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
    }));
    patchQueue((prev) => [...prev, ...items]);
  }

  if (loadError) {
    return (
      <main className="page">
        <div className="panel">
          <p className="brand">
            D<span>&</span>E
          </p>
          <div className="error-banner">{loadError}</div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="page">
        <div className="panel">
          <p className="brand">
            D<span>&</span>E
          </p>
          <p className="lede muted">Duke u ngarkuar…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="panel">
        <p className="brand">
          D<span>&</span>E
        </p>
        <p className="lede">
          Ngarkoni foto dhe video nga dasma e Drenushës &amp; Egzonit.
        </p>

        {!event.uploadEnabled && (
          <div className="error-banner">
            Ngarkimet janë të mbyllura për momentin.
          </div>
        )}

        <div className="field">
          <label htmlFor="guestName">Emri juaj (opsional)</label>
          <input
            id="guestName"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="p.sh. Arben"
            autoComplete="name"
            disabled={!event.uploadEnabled}
          />
        </div>

        <div
          className={`dropzone${dragging ? ' active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (event.uploadEnabled) addFiles(e.dataTransfer.files);
          }}
        >
          <div className="hero-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!event.uploadEnabled}
              onClick={() => galleryInputRef.current?.click()}
            >
              Nga galeria
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!event.uploadEnabled}
              onClick={() => cameraInputRef.current?.click()}
            >
              Bëj foto
            </button>
          </div>
          <p>
            Foto deri në 20MB · video deri në 200MB
          </p>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*,.heic,.heif"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {doneCount > 0 && (
          <div className="toast">
            {doneCount === 1
              ? '1 skedar u ngarkua — faleminderit!'
              : `${doneCount} skedarë u ngarkuan — faleminderit!`}
          </div>
        )}

        {queue.length > 0 && (
          <ul className="file-list">
            {queue.map((item) => (
              <li key={item.id} className="file-row">
                <span className="name">{item.file.name}</span>
                <span className="meta">{formatBytes(item.file.size)}</span>
                {(item.status === 'uploading' || item.status === 'preparing') && (
                  <div className="progress">
                    <span
                      style={{
                        width: `${item.status === 'preparing' ? 8 : item.progress}%`,
                      }}
                    />
                  </div>
                )}
                {item.status === 'preparing' && (
                  <span className="meta">Duke u përgatitur…</span>
                )}
                {item.status === 'uploading' && (
                  <span className="meta">Duke u ngarkuar… {item.progress}%</span>
                )}
                {item.status === 'done' && (
                  <span className="meta status-ok">U ngarkua</span>
                )}
                {item.status === 'error' && (
                  <span className="meta status-err">{item.error}</span>
                )}
                {item.status === 'pending' && (
                  <span className="meta">Në pritje…</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
