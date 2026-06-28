# massive-wsp-messages

WhatsApp mass messaging PoC built with Next.js 15, Prisma 7, Baileys, and PostgreSQL.

## Dev setup

```bash
# 1. Start the database (port 5433 to avoid conflicts)
docker compose up db -d

# 2. Install dependencies
npm install

# 3. Run migrations
npx prisma migrate dev

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

## Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | Next.js 15 App Router | Full-stack; API routes + React UI in one process |
| WhatsApp | @whiskeysockets/baileys 7.x | Pure WebSocket, no Puppeteer; emits QR and delivery receipt events |
| ORM | Prisma 7 | Uses new `prisma.config.ts` instead of `url` in schema |
| DB adapter | @prisma/adapter-pg + pg | Required in Prisma 7 for direct Postgres connections |
| Auth | next-auth v4 | Credentials provider; JWT sessions |
| Passwords | bcryptjs | Pure JS, no native bindings |
| Real-time | SSE (ReadableStream) | QR delivery and message status updates |

## Key architecture decisions

**Prisma 7 adapter pattern** — Prisma 7 removed the "library" binary engine. Direct Postgres connections now require `@prisma/adapter-pg`. See [src/lib/prisma.ts](src/lib/prisma.ts). The DATABASE_URL goes in `prisma.config.ts` (loaded via dotenv) for migrations, and in `.env.local` for the Next.js runtime.

**Baileys singleton on globalThis** — Next.js HMR destroys modules on each file save. The Baileys socket and the SSE EventEmitter are both stored on `globalThis` to survive hot reloads in dev. See [src/lib/whatsapp/instance.ts](src/lib/whatsapp/instance.ts).

**DB-backed WhatsApp session** — Baileys auth state (creds + signal keys) is stored as JSON in the `WhatsappSession` table instead of the filesystem. Sessions survive container restarts without a mounted volume. See [src/lib/whatsapp/db-auth-state.ts](src/lib/whatsapp/db-auth-state.ts).

**Phone number format** — Store numbers in E.164 format (`+541155556666`) in the database. When constructing a Baileys JID, strip the `+` and append `@s.whatsapp.net`.

**Rate limiting** — 1 second sleep between sends in `/api/whatsapp/send`. Personal WhatsApp numbers should stay under ~200 messages/day.

## Environment variables

Copy `.env.example` to `.env.local`:

```
DATABASE_URL=postgresql://wsp:wsp@localhost:5433/wsp
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

Prisma CLI also reads `.env` (not `.env.local`) via dotenv in `prisma.config.ts`.

## Docker

```bash
# Dev: only run the DB in Docker
docker compose up db -d

# Production: full stack
docker compose up --build
```

The `app` service uses a multi-stage build. `output: 'standalone'` is set in `next.config.ts`.

## Apple Silicon note

If building the Docker image on an M-series Mac, add `--platform linux/amd64` to the build command. Baileys' `libsignal` includes platform-specific `.node` prebuilds.
