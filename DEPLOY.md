# Deploy — hapa të shkurtër (Railway + Vercel)

## A) Railway = API + fotot/videot (bëje së pari)

1. Në Railway: **New Project** → **Deploy from GitHub repo**
2. Zgjidh repo-n **dregz** (llogaria `lirimh-myNime`)
3. Nëse pyet për Dockerfile, zgjidh **Dockerfile.api**
4. Shto **Volume**:
   - Mount path: `/data`
   - Size: **10 GB** (ose më shumë)
5. **Settings → Networking → Generate Domain**  
   Kopjo URL-në, p.sh. `https://dasma-api-production-xxxx.up.railway.app`
6. **Variables** → shto këto (zëvendëso `API_URL_JOTE` me domain-in e hapit 5):

```
ADMIN_PASSWORD=kosovarepublik99
JWT_SECRET=ndryshoje-me-nje-fjale-te-gjate-te-rastit
EVENT_CODE=wedding
EVENT_TITLE=Drenusha & Egzon
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
DATABASE_URL=file:/data/dregz.db
MAX_CONCURRENT_UPLOADS=6
MAX_VIDEO_BYTES=209715200
PUBLIC_WEB_URL=https://dasma-drenushes-dhe-egzonit.vercel.app
CORS_ORIGIN=https://dasma-drenushes-dhe-egzonit.vercel.app
PUBLIC_API_URL=https://API_URL_JOTE
```

7. **Redeploy** një herë pas Variables
8. Test: hap `https://API_URL_JOTE/api/events/wedding`  
   Duhet të shohësh: `{"code":"wedding","title":"Drenusha & Egzon",...}`

---

## B) Vercel = faqja me emrin e bukur

URL e synuar: **https://dasma-drenushes-dhe-egzonit.vercel.app**

Në Vercel → projekti **dasma-drenushes-dhe-egzonit** → **Settings → Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://API_URL_JOTE
NEXT_PUBLIC_EVENT_CODE=wedding
```

Pastaj **Deployments → Redeploy** (Production).

---

## C) Kur të dyja janë gati

- Të ftuarit: https://dasma-drenushes-dhe-egzonit.vercel.app  
- Admin: https://dasma-drenushes-dhe-egzonit.vercel.app/admin  
- Fjalëkalimi: `kosovarepublik99`  
- Printoni QR nga admin

---

## Nëse përdor Render në vend të Railway

1. **New → Blueprint** → lidh repo **dregz** (`render.yaml` është gati)
2. Shërbimi `dasma-api` + disk `/data`
3. Vendos `PUBLIC_API_URL` me domain-in që të jep Render
4. Po ashtu vendos `NEXT_PUBLIC_API_URL` në Vercel

**Këshillë:** bëj **vetëm një** (Railway OSE Render), jo të dyja.
