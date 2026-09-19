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
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

const IMAGE_MIME = /^image\//;
const VIDEO_MIME = /^video\//;

async function prepareFile(file: File): Promise<File> {
  if (!IMAGE_MIME.test(file.type) || file.type === 'image/gif') {
    return file;
  }
  try {
    return await imageCompression(file, {
      maxSizeMB: 3,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.82,
    });
  } catch {
    return file;
  }
}

type Props = {
  code: string;
};

export function GuestUpload({ code }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const uploading = useRef(false);

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

    while (true) {
      let next: QueueItem | undefined;
      setQueue((prev) => {
        next = prev.find((i) => i.status === 'pending');
        return prev;
      });
      if (!next) break;

      const item = next;
      setQueue((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i,
        ),
      );

      try {
        const prepared = await prepareFile(item.file);
        await uploadFile(code, prepared, guestName || undefined, (pct) => {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, progress: pct } : i,
            ),
          );
        });
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'done', progress: 100 }
              : i,
          ),
        );
        setDoneCount((c) => c + 1);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Ngarkimi dështoi';
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'error', error: message } : i,
          ),
        );
      }
    }

    uploading.current = false;
  }, [code, guestName]);

  useEffect(() => {
    if (queue.some((i) => i.status === 'pending')) {
      void processQueue();
    }
  }, [queue, processQueue]);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter(
      (f) => IMAGE_MIME.test(f.type) || VIDEO_MIME.test(f.type),
    );
    if (!list.length) return;
    const items: QueueItem[] = list.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
    }));
    setQueue((prev) => [...prev, ...items]);
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
          <button
            type="button"
            className="btn btn-primary"
            disabled={!event.uploadEnabled}
            onClick={() => inputRef.current?.click()}
          >
            Zgjidhni foto &amp; video
          </button>
          <p>
            Ose hidhni skedarët këtu · foto deri në 20MB · video deri në 200MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
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
                {item.status === 'uploading' && (
                  <div className="progress">
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
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
