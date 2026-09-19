# Deploy — Render Disk (10 GB) për fotot/videot

App-i ruan media në disk te Render (pa Cloudflare).
**Free plan nuk lejon disk** — duhet **Starter ($7/muaj)**.

---

## Hap 1 — Upgrade në Starter

1. Hap: https://dashboard.render.com → kliko **dasma-api**
2. Te **Compute** (ku shkruan Free · $0) kliko **Edit**
3. Zgjidh **Starter** → **$7 / month** (0.5 CPU, 512 MB)
4. Ruaj / Confirm (përdor kartën që ke te Render)

Prit derisa statusi të jetë përsëri **Live**.

---

## Hap 2 — Shto Disk 10 GB

1. Në `dasma-api` → sidebar majtas: **Disks** (ose **Settings** → **Disk**)
2. **Add Disk** / **Create Disk**
3. Plotëso:
   - **Name:** `dasma-data`
   - **Mount Path:** `/opt/render/project/src/data`
   - **Size:** `10` GB (~$2.50/muaj ekstra)
4. Ruaj

Render do të bëjë redeploy automatikisht.

---

## Hap 3 — Environment Variables

1. `dasma-api` → **Environment**
2. Sigurohu që ekzistojnë (shto nëse mungojnë):

```
UPLOAD_DIR=/opt/render/project/src/data/uploads
DATA_DIR=/opt/render/project/src/data
DATABASE_URL=file:/opt/render/project/src/data/dregz.db
PUBLIC_API_URL=https://dasma-api-s6nu.onrender.com
PUBLIC_WEB_URL=https://dasma-drenushes-dhe-egzonit.vercel.app
CORS_ORIGIN=https://dasma-drenushes-dhe-egzonit.vercel.app
ADMIN_PASSWORD=kosovarepublik99
EVENT_CODE=wedding
```

3. **Fshi** këto nëse i ke (përndryshe app përdor Blob/R2, jo diskun):
   - `BLOB_READ_WRITE_TOKEN`
   - `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL`

4. **Save Changes**

---

## Hap 4 — Manual Deploy

1. Lart djathtas: **Manual Deploy** → **Deploy latest commit**
2. Prit **Live**
3. **Logs** → duhet të shohësh: `Storage: local disk`

---

## Hap 5 — Test

1. Hap: https://dasma-drenushes-dhe-egzonit.vercel.app
2. Ngarko 1 foto nga galeria
3. Hap `/admin` → password `kosovarepublik99` → duhet të dalë fotoja

---

## Kosto e përafërt

| Gjë | Çmimi |
|-----|--------|
| Render Starter | ~$7/muaj |
| Disk 10 GB | ~$2.50/muaj |
| Vercel (site) | $0 |
| **Total** | **~$9.50/muaj** |

Pas dasmës mund ta fshish shërbimin që të mos paguash më.
