# Si ta publikojmë Dregz (online)

Kodi është në GitHub (privat): https://github.com/lirimh-myNime/dregz

## Opsioni i rekomanduar: Railway (5–10 minuta)

1. Hap: https://railway.app/new  
2. Hyr me **GitHub**  
3. Zgjidh repo-n **dregz**  
4. Railway e njeh `Dockerfile` automatikisht  
5. Shto **Volume**:
   - Mount path: `/data`
   - Size: 5 GB (ose më shumë nëse pret shumë video)
6. Te **Variables** shto:

```
ADMIN_PASSWORD=kosovarepublik99
JWT_SECRET=vendos-dicka-te-gjate-dhe-te-rastit
EVENT_CODE=wedding
EVENT_TITLE=Drenusha & Egzon
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
DATABASE_URL=file:/data/dregz.db
API_PORT=4000
API_URL=http://127.0.0.1:4000
PORT=3000
```

7. Kliko **Generate Domain** (Settings → Networking)  
8. Kopjo URL-në (p.sh. `https://dregz-production.up.railway.app`) dhe shto edhe:

```
PUBLIC_WEB_URL=https://URL-JA-JOTE
CORS_ORIGIN=https://URL-JA-JOTE
```

9. Redeploy një herë që QR të përdorë URL-në e saktë  

### Pas deploy
- Të ftuarit: `https://URL-JA-JOTE`
- Admin: `https://URL-JA-JOTE/admin`
- Fjalëkalimi: `kosovarepublik99`
- Printoni QR nga admin → **Shkarko QR**

## Opsioni tjetër: Render

1. Hap https://dashboard.render.com/select-repo?type=blueprint  
2. Lidh GitHub → zgjidh **dregz** (ka `render.yaml`)  
3. Vendos `PUBLIC_WEB_URL` dhe `CORS_ORIGIN` me domain-in që të jep Render  
4. Disku `/data` ruan fotot

## Shënim
Fotot ruhen në disk (`/data`). Pa volume, fotot humbin kur ristartohet serveri.
