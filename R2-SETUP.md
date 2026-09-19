# Cloudflare R2 (10 GB falas) — setup

Kodi tani preferon **R2** kur i jep kredencialet (para Vercel Blob).

## 1) Krijo R2 te Cloudflare

1. Hap: https://dash.cloudflare.com → regjistrohu / hyr  
2. Në sidebar: **R2 Object Storage** → **Purchase** / Enable R2 (plani falas)  
3. **Create bucket** → emër: `dasma-media`  
4. Hap bucket → **Settings** → **Public access** → **Allow Access** / Enable **R2.dev subdomain**  
5. Kopjo **Public bucket URL** (si `https://pub-xxxxx.r2.dev`)

## 2) API tokens

1. R2 → **Manage R2 API Tokens** → **Create API token**  
2. Permission: **Object Read & Write**  
3. Bucket: `dasma-media`  
4. Kopjo:
   - **Access Key ID**
   - **Secret Access Key**
5. **Account ID** e gjen në faqen kryesore të R2 (djathtas)

## 3) Vendos te Render (`dasma-api` → Environment)

```
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=dasma-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
PUBLIC_API_URL=https://dasma-api-s6nu.onrender.com
```

Pastaj **Manual Deploy**.

Në logs duhet të shohësh: `Storage: Cloudflare R2 enabled`

## Limite falas (përafërsisht)
- **10 GB** storage  
- Mjafton për shumë foto + disa video  
- Pastaj pagesa e R2 është shumë e lirë krahasuar me Vercel Blob
