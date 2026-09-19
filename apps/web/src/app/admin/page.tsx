'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  MediaItem,
  clearToken,
  deleteMedia,
  fetchMedia,
  fetchQr,
  getApiBase,
  getToken,
  loginAdmin,
  setToken,
} from '@/lib/api';

type Filter = 'all' | 'image' | 'video';

const EVENT_CODE = process.env.NEXT_PUBLIC_EVENT_CODE || 'wedding';

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchMedia(filter);
      setItems(data);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ngarkimi dështoi';
      setError(msg);
      if (
        msg === 'Sesioni skadoi' ||
        msg === 'Nuk jeni i autentikuar' ||
        msg === 'Session expired' ||
        msg === 'Not authenticated'
      ) {
        clearToken();
        setAuthed(false);
      }
    }
  }, [filter]);

  useEffect(() => {
    if (!authed) return;
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [authed, load]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const token = await loginAdmin(password);
      setToken(token);
      setPassword('');
      setAuthed(true);
    } catch {
      setLoginError('Fjalëkalimi është i gabuar. Provoni përsëri.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Të fshihet ky skedar?')) return;
    await deleteMedia(id);
    setSelected(null);
    await load();
  }

  async function toggleQr() {
    if (showQr) {
      setShowQr(false);
      return;
    }
    try {
      const data = await fetchQr(EVENT_CODE);
      setQr(data);
      setShowQr(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QR dështoi');
    }
  }

  function logout() {
    clearToken();
    setAuthed(false);
    setItems([]);
    setShowQr(false);
  }

  if (authed === null) {
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

  if (!authed) {
    return (
      <main className="page">
        <div className="panel">
          <p className="brand">
            D<span>&</span>E
          </p>
          <p className="lede">Hyrja e administratorit në galeri.</p>

          <form className="login-card" onSubmit={onLogin}>
            <div className="field">
              <label htmlFor="password">Fjalëkalimi</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {loginError && <div className="error-banner">{loginError}</div>}
            <div className="hero-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading ? 'Duke u futur…' : 'Hap galerinë'}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="page wide">
      <div className="panel-admin">
      <div className="admin-bar">
        <div>
          <p className="brand" style={{ fontSize: '2rem', textAlign: 'left' }}>
            D<span>&</span>E
          </p>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            {items.length === 1
              ? '1 skedar · përditësohet live'
              : `${items.length} skedarë · përditësohet live`}
          </p>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-ghost" onClick={toggleQr}>
            {showQr ? 'Fshih QR' : 'Shfaq QR'}
          </button>
          <a
            className="btn btn-ghost"
            href={`${getApiBase()}/api/qr/${EVENT_CODE}/image`}
            download={`dasma-${EVENT_CODE}-qr.png`}
            target="_blank"
            rel="noreferrer"
          >
            Shkarko QR
          </a>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Dil
          </button>
        </div>
      </div>

      {showQr && qr && (
        <div className="qr-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.dataUrl} alt="Kodi QR për ngarkim" />
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            Të ftuarit skanojnë këtë → {qr.url}
          </p>
        </div>
      )}

      <div className="filters" style={{ marginBottom: '1rem' }}>
        {(['all', 'image', 'video'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`chip${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Të gjitha' : f === 'image' ? 'Foto' : 'Video'}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {items.length === 0 && !error ? (
        <p className="lede muted">
          Nuk ka media ende. Ndani kodin QR me të ftuarit.
        </p>
      ) : (
        <div className="gallery">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tile"
              onClick={() => setSelected(item)}
            >
              {item.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbUrl || item.url}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <video src={item.url} muted preload="metadata" />
              )}
              <span className="badge">
                {item.type === 'video' ? 'Video' : 'Foto'}
                {item.guestName ? ` · ${item.guestName}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            {selected.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.url} alt="" />
            ) : (
              <video src={selected.url} controls autoPlay />
            )}
            <div className="lightbox-actions">
              <a
                className="btn btn-primary"
                href={selected.url}
                download
                target="_blank"
                rel="noreferrer"
              >
                Shkarko
              </a>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void onDelete(selected.id)}
              >
                Fshi
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelected(null)}
              >
                Mbyll
              </button>
            </div>
            {selected.guestName && (
              <p className="muted" style={{ textAlign: 'center' }}>
                Nga {selected.guestName}
              </p>
            )}
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
