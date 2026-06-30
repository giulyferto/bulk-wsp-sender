# massive-wsp-messages

WhatsApp mass messaging PoC built with Next.js 15, Firebase, Baileys.

## Dev setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in Firebase credentials (see below)
cp .env.local.example .env.local

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

## Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | Next.js 15 App Router | Full-stack; API routes + React UI in one process |
| WhatsApp | @whiskeysockets/baileys 7.x | Pure WebSocket, no Puppeteer; emits QR and delivery receipt events |
| Auth | next-auth v4 | Credentials provider; JWT sessions; verifies via Firebase Auth REST API |
| Database | Firebase Firestore | All user data stored under `users/{uid}/` subcollections |
| Auth backend | Firebase Admin SDK | User creation, session storage, all server-side Firestore writes |
| Real-time | SSE (ReadableStream) | QR delivery and message status updates |

## Key architecture decisions

**Firebase Admin SDK singleton** — Initialised once on `globalThis` to survive Next.js HMR hot reloads. See [src/lib/firebase.ts](src/lib/firebase.ts).

**Login via Firebase Auth REST API** — The next-auth `authorize` callback calls `accounts:signInWithPassword` with the Web API Key instead of comparing password hashes locally. See [src/lib/auth.ts](src/lib/auth.ts).

**Baileys singleton on globalThis** — Next.js HMR destroys modules on each file save. The Baileys socket and the SSE EventEmitter are both stored on `globalThis` to survive hot reloads in dev. See [src/lib/whatsapp/instance.ts](src/lib/whatsapp/instance.ts).

**Firestore-backed WhatsApp session** — Baileys auth state (creds + signal keys) is stored as JSON in the `whatsappSessions/{uid}` document instead of the filesystem. Sessions survive restarts without a mounted volume. See [src/lib/whatsapp/db-auth-state.ts](src/lib/whatsapp/db-auth-state.ts).

**Contact lists use memberIds array** — `ContactListMember` join table replaced by a `memberIds: string[]` field on each list document. Acceptable for a PoC.

**Phone number format** — Store numbers in E.164 format (`+541155556666`). When constructing a Baileys JID, strip the `+` and append `@s.whatsapp.net`.

**Rate limiting** — 1.5 second sleep between sends in `/api/whatsapp/send`. Personal WhatsApp numbers should stay under ~200 messages/day.

## Firestore data model

```
users/{uid}                                          { email, createdAt }
users/{uid}/contacts/{contactId}                     { name, phone, createdAt, updatedAt }
users/{uid}/lists/{listId}                           { name, createdAt, memberIds: string[] }
users/{uid}/campaigns/{campaignId}                   { listId, body, sentAt }
users/{uid}/campaigns/{campaignId}/deliveries/{id}   { contactId, waMessageId, status, updatedAt }
whatsappSessions/{uid}                               { creds: {}, keys: {}, updatedAt }
```

## Environment variables

Create `.env.local` with:

```
NEXTAUTH_SECRET=<random string>
NEXTAUTH_URL=http://localhost:3000

# Firebase Admin SDK — from Project Settings → Service accounts → Generate new private key
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Web API Key — from Project Settings → General → Web API Key
NEXT_PUBLIC_FIREBASE_API_KEY=
```

## Firebase console setup (one-time)

1. Authentication → Sign-in method → **Email/Password** → Enable
2. Firestore Database → Create database (test mode is fine for a PoC)
3. Firestore → Indexes → add a collection group index on `deliveries` / `waMessageId` ascending (required for delivery receipt updates — the server will log a link the first time you send a campaign)

## Apple Silicon note

If building a Docker image on an M-series Mac, add `--platform linux/amd64` to the build command. Baileys' `libsignal` includes platform-specific `.node` prebuilds.
