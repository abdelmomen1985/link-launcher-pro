# Koyeb Deployment Guide (Bun + Docker)

## 1) Prerequisites

- A Koyeb account
- This repository pushed to GitHub
- Turso database URL and auth token

## 2) Required project files

Make sure these files exist in your repo root:

- `Dockerfile`
- `.dockerignore`
- `koyeb.yaml`

## 3) Dockerfile (Bun runtime)

Your app should run with Bun, not Node buildpacks.

- Build frontend during image build
- Start backend with `bun run start`
- Bind API to `0.0.0.0` and use `PORT` env variable

## 4) Koyeb config (`koyeb.yaml`)

Use Docker builder and define runtime env mapping at service level.

```yaml
name: link-launcher-pro
services:
  - name: web
    instance_type: nano
    ports:
      - port: 8000
        protocol: http
    git:
      branch: main
      repository: github.com/abdelmomen1985/link-launcher-pro
      builder: docker
      dockerfile: Dockerfile
    env:
      - name: TURSO_DATABASE_URL
        value: "{{ secret.TURSO_DATABASE_URL }}"
      - name: TURSO_AUTH_TOKEN
        value: "{{ secret.TURSO_AUTH_TOKEN }}"
```

> Important: use `name` (not `key`) for env entries.

## 5) Set environment variables via Koyeb Dashboard (recommended)

> `koyeb.yaml` env vars only apply when deploying via Koyeb CLI. If you created the service via the **web dashboard**, you must set env vars there directly.

1. Go to **Koyeb Dashboard** > your service > **Settings** > **Environment variables**
2. Click **Add Variable** and add each:

| Name | Type | Value |
|------|------|-------|
| `TURSO_DATABASE_URL` | Secret | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Secret | your Turso auth token |

3. Click **Save** and **Redeploy**

### Alternative: Create org-level secrets first

1. Go to **Koyeb Dashboard** > **Secrets** (left sidebar)
2. Create two secrets:
   - Name: `TURSO_DATABASE_URL` / Value: your libsql URL
   - Name: `TURSO_AUTH_TOKEN` / Value: your token
3. Then in your service env vars, reference them as type **Secret** with the matching name

## 6) Deploy steps

1. Create a new Koyeb service from your GitHub repo.
2. Select **Dockerfile** as the builder (not buildpacks).
3. Set env vars as described in step 5.
4. Deploy.

## 7) Verify deployment

After deploy succeeds:

- Open app URL
- Check health endpoint:

```bash
curl -s https://<your-app-domain>/api/health
```

Expected:

```json
{"ok":true,"dbConfigured":true}
```

## 8) Troubleshooting

### App exits with:
`Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN`

- Confirm secrets exist with exact names.
- Confirm `koyeb.yaml` uses `env.name` and secret interpolation.
- Confirm latest commit is deployed.

### Buildpack error: missing lockfile

- Koyeb is using Node buildpacks instead of Docker.
- Ensure `git.builder: docker` and `dockerfile: Dockerfile` are set.

### Health returns `dbConfigured: false`

- Secret injection failed or wrong secret names/values.
- Re-check secrets and redeploy.

## 9) Security note

If credentials were exposed in logs/chat, rotate `TURSO_AUTH_TOKEN` immediately and update Koyeb secret.
