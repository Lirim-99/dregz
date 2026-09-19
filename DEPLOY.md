# Deploy — çfarë të bësh tani (Render kërkoi kartë)

## Pse doli “Payment Information Required”?

Blueprint-i i vjetër kërkonte **disk të paguar** (që fotot të mos humbin).
E ndryshova në **plan falas**.

---

## Hapat (tani)

### 1) Në popup-in e kartës
Kliko **Cancel**

### 2) Push është gati — në Render
1. Kliko **Retry** (nëse e sheh), ose fillo Blueprint përsëri me **`Lirim-99 / dregz`**
2. Duhet të shfaqet plan **free** (pa disk)
3. **Apply / Create** → prit derisa `dasma-api` të jetë **Live**
4. Kopjo URL-në e shërbimit

### 3) Vercel Blob (që fotot/videot të mos humbin në free plan)
1. Hap: https://vercel.com/dashboard → projekti **dasma-drenushes-dhe-egzonit**
2. **Storage → Create → Blob** → emër p.sh. `dasma-media`
3. Kopjo **`BLOB_READ_WRITE_TOKEN`**
4. Në Render → `dasma-api` → **Environment** shto:
   ```
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
   PUBLIC_API_URL=https://URL-JA-JOTE-NGA-RENDER
   ```
5. Redeploy në Render

### 4) Lidh Vercel me API
Në Vercel → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://URL-JA-JOTE-NGA-RENDER
NEXT_PUBLIC_EVENT_CODE=wedding
```
Pastaj **Redeploy**.

---

## Opsion me kartë (më i thjeshtë për dasmën)
Nëse do disk të qëndrueshëm pa Blob: shto kartën (auth $1, nuk të tarifon qëllimisht), pastaj përdor disk. Për dasmën rekomandohet **Blob falas** si më sipër.
