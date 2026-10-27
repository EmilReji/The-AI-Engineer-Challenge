# Kindling Frontend

Kindling is a small Next.js chat interface for the repository's supportive-coach FastAPI endpoint. It keeps the browser experience focused: write one honest thought, send it, and get a practical response.

## What you need

- Node.js 20.9 or newer
- npm
- The FastAPI backend running on `http://127.0.0.1:8000`

The OpenAI API key belongs to the backend only. Do not add it to this directory or expose it with a `NEXT_PUBLIC_` variable.

## Install

From the `frontend/` directory:

```bash
npm install
```

The committed `package-lock.json` keeps installs reproducible.

## Run locally

Use two terminals from the repository root.

Terminal 1 starts FastAPI:

```bash
export OPENAI_API_KEY='your-key-here'
uv run uvicorn api.index:app --reload
```

Terminal 2 starts Next.js:

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The browser posts to `/api/chat`; during local Next.js development, `next.config.ts` proxies that path to `http://127.0.0.1:8000`.

If FastAPI runs elsewhere, copy `.env.example` to `.env.local` and update its server-only origin:

```dotenv
FASTAPI_ORIGIN=http://127.0.0.1:8000
```

Restart `npm run dev` after changing the environment file. `FASTAPI_ORIGIN` is intentionally not prefixed with `NEXT_PUBLIC_`, so it is read by Next.js configuration rather than bundled into browser code.

## Quality checks

Run these from `frontend/`:

```bash
npm run lint
npm run typecheck
npm run build
```

Use `npm run start` after a successful build to preview the production build locally. Keep the FastAPI process running because the production Next.js server uses the same proxy configuration.

## Vercel routing

The root `vercel.json` defines two Vercel Services. Requests under `/api/*` reach the FastAPI service with their original paths, and all other requests reach this Next.js service. This gives the browser one same-origin `/api/chat` URL in both local development and deployment.

Set `OPENAI_API_KEY` as a server-side environment variable in the Vercel project. The frontend requires no public API key and no browser-visible backend origin.
