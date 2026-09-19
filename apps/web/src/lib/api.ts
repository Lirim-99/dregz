const TOKEN_KEY = 'dregz_admin_token';

/** Public API origin for browser calls (required on Vercel so 100MB uploads bypass Vercel limits). */
export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return '';
  return process.env.API_URL || 'http://localhost:4000';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export type EventInfo = {
  code: string;
  title: string;
  uploadEnabled: boolean;
};

export type MediaItem = {
  id: string;
  type: string;
  mimeType: string;
  size: number;
  guestName: string | null;
  createdAt: string;
  eventCode?: string;
  eventTitle?: string;
  url: string;
  thumbUrl: string | null;
};

export async function fetchEvent(code: string): Promise<EventInfo> {
  const res = await fetch(`${getApiBase()}/api/events/${encodeURIComponent(code)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(formatApiMessage(body.message) || 'Ngjarja nuk u gjet');
  }
  return res.json();
}

export async function loginAdmin(password: string): Promise<string> {
  const res = await fetch(`${getApiBase()}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error('Fjalëkalim i pavlefshëm');
  }
  const data = await res.json();
  return data.accessToken as string;
}

export async function fetchMedia(type?: string): Promise<MediaItem[]> {
  const token = getToken();
  if (!token) throw new Error('Nuk jeni i autentikuar');
  const qs = type && type !== 'all' ? `?type=${encodeURIComponent(type)}` : '';
  const res = await fetch(`${getApiBase()}/api/media${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('Sesioni skadoi');
  }
  if (!res.ok) throw new Error('Media nuk u ngarkua');
  return res.json();
}

export async function deleteMedia(id: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Nuk jeni i autentikuar');
  const res = await fetch(`${getApiBase()}/api/media/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Fshirja dështoi');
}

export async function fetchQr(code: string): Promise<{ url: string; dataUrl: string }> {
  const token = getToken();
  if (!token) throw new Error('Nuk jeni i autentikuar');
  const res = await fetch(`${getApiBase()}/api/qr/${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('QR nuk u ngarkua');
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableUploadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('gabim rrjeti') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('abort')
  );
}

/** Upload with automatic retries for flaky mobile networks. */
export async function uploadFile(
  code: string,
  file: File,
  guestName: string | undefined,
  onProgress: (pct: number) => void,
): Promise<MediaItem> {
  let lastError: Error = new Error('Ngarkimi dështoi');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await uploadFileOnce(code, file, guestName, onProgress);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Ngarkimi dështoi');
      if (!isRetryableUploadError(err) || attempt === 2) {
        throw lastError;
      }
      onProgress(0);
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastError;
}

function uploadFileOnce(
  code: string,
  file: File,
  guestName: string | undefined,
  onProgress: (pct: number) => void,
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${getApiBase()}/api/upload/${encodeURIComponent(code)}`;
    xhr.open('POST', url);
    xhr.timeout = 15 * 60 * 1000; // 15 minutes for large videos

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Përgjigje e pavlefshme'));
        }
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(formatApiMessage(body.message) || 'Ngarkimi dështoi'));
        } catch {
          reject(new Error(`Ngarkimi dështoi (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Gabim rrjeti'));
    xhr.ontimeout = () => reject(new Error('Timeout — provo përsëri'));
    xhr.onabort = () => reject(new Error('Ngarkimi u ndërpre'));

    const form = new FormData();
    form.append('file', file);
    if (guestName) form.append('guestName', guestName);
    xhr.send(form);
  });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatApiMessage(message: unknown): string {
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return '';
}
