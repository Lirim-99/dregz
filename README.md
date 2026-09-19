# Dregz — Aplikacion dasme me QR

Të ftuarit skanojnë QR → hapet faqja kryesore → ngarkojnë foto/video.
Admini hap manualisht `/admin` dhe fut fjalëkalimin.

## Lokal

```bash
npm run setup
npm run dev:api
npm run dev:web
```

- Të ftuarit: http://localhost:3000
- Admin: http://localhost:3000/admin
- Fjalëkalimi: `kosovarepublik99`

## Deploy (Railway)

1. Lidhu me Railway dhe krijo projekt + volume në `/data`
2. Vendos env:

```
ADMIN_PASSWORD=kosovarepublik99
JWT_SECRET=<secret-i-fortë>
EVENT_CODE=wedding
EVENT_TITLE=Drenusha & Egzon
PUBLIC_WEB_URL=https://YOUR-APP.up.railway.app
CORS_ORIGIN=https://YOUR-APP.up.railway.app
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
DATABASE_URL=file:/data/dregz.db
API_PORT=4000
API_URL=http://127.0.0.1:4000
PORT=3000
```

3. Deploy nga GitHub ose `railway up`

Pas deploy, printoni QR nga `/admin` (Shfaq QR / Shkarko QR).
