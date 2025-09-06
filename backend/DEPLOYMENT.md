# Deploying the backend to Render

1. Push the repo to GitHub.
2. Ensure `render.yaml` exists at the repo root (it is).
3. In Render, New + > Blueprint, connect the repo, allow it to create services.
4. Wait for build: it installs deps, collects static files, runs migrations.
5. The service starts with Daphne (ASGI) for Django Channels.
6. Set environment variables if needed (see `render.yaml`).
7. Verify health check at `/api/stats/`.

Frontend integration:
- In Vercel project, set VITE_API_BASE_URL to `https://<render-app-host>/api` and VITE_WS_BASE_URL to `wss://<render-app-host>`.
- Redeploy frontend.
