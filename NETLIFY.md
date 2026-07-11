# Deploy Frontend on Netlify

Next.js 15 app with the official [Netlify Next.js runtime](https://docs.netlify.com/frameworks/next-js/overview/).

## 1. Push to GitHub

Ensure this `frontend` folder is in a GitHub repo (root of the repo, or set **Base directory** in Netlify).

## 2. Create Netlify site

1. [Netlify](https://app.netlify.com/) → **Add new site** → **Import an existing project**
2. Connect GitHub and select the repo
3. If the repo root is `construction-saas`, set **Base directory** to `frontend`
4. Build settings (auto-detected from `netlify.toml`):
   - **Build command:** `npm run build`
   - **Plugin:** `@netlify/plugin-nextjs` (handles publish + SSR routes)

## 3. Environment variables

In Netlify → **Site configuration** → **Environment variables**, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.yourdomain.com/api` |

Use your EC2 API URL (GoDaddy subdomain from backend deploy).

Redeploy after changing env vars.

## 4. Backend CORS

On the EC2 backend `.env`, include your Netlify URL(s):

```env
CORS_ALLOWED_ORIGINS=https://your-app.netlify.app,https://app.yourdomain.com
```

Replace with your Netlify subdomain and custom domain after setup.

## 5. Custom domain (GoDaddy)

### Option A — Subdomain (recommended)

Example: `app.yourdomain.com`

1. Netlify → **Domain management** → **Add domain** → enter `app.yourdomain.com`
2. Netlify shows a DNS target (usually a CNAME)
3. GoDaddy → **DNS** → Add record:

| Type | Name | Value |
|------|------|-------|
| CNAME | app | `<your-site>.netlify.app` |

### Option B — Apex domain

Example: `yourdomain.com`

GoDaddy → Add **A** records Netlify provides, or use Netlify DNS nameservers.

HTTPS is automatic once DNS propagates (5–30 minutes).

## 6. Verify

1. Open the Netlify URL → should redirect to `/login`
2. Sign in against the live API
3. Check browser DevTools → Network: API calls go to `NEXT_PUBLIC_API_BASE_URL`, not `localhost`

## Local vs production

| | Local | Netlify |
|---|-------|---------|
| API URL | `http://localhost:8000/api` | `https://api.yourdomain.com/api` |
| Env file | `.env.local` | Netlify dashboard env vars |

Copy `.env.example` to `.env.local` for local dev only — never commit secrets.
