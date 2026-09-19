# Dasma Drenusha & Egzon — Deploy

## Arkitektura (e rëndësishme për video 100MB)

Vercel **nuk** mund të pranojë upload 100MB përmes proxy-t (limit ~4.5MB).
Prandaj:

| Pjesa | Ku | URL |
|--------|-----|-----|
| Web (faqja + QR) | **Vercel** | `https://dasma-drenushes-dhe-egzonit.vercel.app` |
| API + fotot/videot | **Railway** (Docker + disk `/data`) | `https://….up.railway.app` |

Të ftuarit hapin Vercel. Uploadet shkojnë **direkt** te Railway (`NEXT_PUBLIC_API_URL`).

## Stabilitet (2 persona × 100MB video)

- Skedarët ruhen në disk (jo në RAM)
- SQLite WAL + busy_timeout (shkrim i njëkohshëm)
- Deri në 6 upload “finalize” paralel; stream i shumë klientëve në disk
- Timeout 15 minuta për video të mëdha
- Klienti riprovon automatikisht 3 herë në gabim rrjeti
- Emri i përkohshëm unik për çdo skedar (pa mbivendosje)

## 1) Railway (API) — së pari

1. https://railway.app/new → GitHub → repo **dregz**
2. Volume mount: `/data` (min. 5GB)
3. Variables:

```
ADMIN_PASSWORD=kosovarepublik99
JWT_SECRET=ndryshoje-me-dicka-te-gjate
EVENT_CODE=wedding
EVENT_TITLE=Drenusha & Egzon
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
DATABASE_URL=file:/data/dregz.db
API_PORT=4000
API_URL=http://127.0.0.1:4000
PORT=3000
MAX_CONCURRENT_UPLOADS=6
MAX_VIDEO_BYTES=209715200
PUBLIC_API_URL=https://API-URL-JA-NGA-RAILWAY
CORS_ORIGIN=https://dasma-drenushes-dhe-egzonit.vercel.app
PUBLIC_WEB_URL=https://dasma-drenushes-dhe-egzonit.vercel.app
```

4. Generate Domain për shërbimin (kjo është `PUBLIC_API_URL`)

> Në Railway, nëse Docker ekspozon portin 3000 (web+api së bashku),  
> `PUBLIC_API_URL` = i njëjti domain Railway.  
> Nëse deploy vetëm API, ekspozo portin e API.

## 2) Vercel (web) — emri i bukur

```bash
cd apps/web
npx vercel --name dasma-drenushes-dhe-egzonit --yes
```

Env në Vercel:

```
NEXT_PUBLIC_API_URL=https://API-URL-JA-NGA-RAILWAY
NEXT_PUBLIC_EVENT_CODE=wedding
```

Production URL: **https://dasma-drenushes-dhe-egzonit.vercel.app**

## 3) QR

Admin → https://dasma-drenushes-dhe-egzonit.vercel.app/admin  
Fjalëkalimi: `kosovarepublik99` → Shkarko QR  

QR hap faqen Vercel (jo Railway).
