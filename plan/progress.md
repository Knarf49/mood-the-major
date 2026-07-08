# Whiteboard Project — To-Do List

## Current Progress

- [ ] Setup Zustand
- [ ] implement Zustand login Session persist

## 1. Setup

- [x] Setup MongoDB
- [ ] Setup Zustand (access token in memory only — do NOT persist to localStorage)
- [x] Setup shadcn & Tailwind
- [x] Confirm hosting: Render for both frontend (static site) and backend (web service)
- [ ] setup react router with required route

## 2. DB Models

- [x] `user` model
  - `id: uuid`
  - `username: string` (unique index)
  - `passwordHash: string`
  - `role: 'user' | 'admin'`
  - `createdAt: Date`
- [x] `post` model
  - `id: uuid`
  - `content: string`
  - `major: string`
  - `moodType: enum`
  - `ownerId: uuid` (FK -> user.id)
  - `createdAt: Date`
  - `updatedAt: Date`
- [x] No separate `board` model — single implicit board, `GET /posts` returns everything

## 3. API Routes

- [x] `POST /signup`
- [x] `POST /login`
- [x] `POST /refresh`
- [x] `POST /forgot-password` — send reset code via email, rate-limited, code TTL ~15min
- [x] `POST /reset-password` — code is single-use
- [x] `GET /posts` — list all
- [x] `POST /posts` — auth required, ownerId from verified JWT (never from client body)
- [x] `PATCH /posts/:id` — auth required, ownership OR admin check
- [x] `DELETE /posts/:id` — auth required, ownership OR admin check
- [x] Add zod validation on every route body

## 4. Auth

- [x] Implement refresh + access token flow
- [x] Auth middleware: verify JWT, attach `req.user`
- [ ] Refresh token → httpOnly cookie, `sameSite: "none"`, `secure: true`
- [x] Rate limit `/login`
- [x] Rate limit `/forgot-password`

## 5. Permissions

- [ ] Create permission helpers (`isOwner(post, userId)`, `isAdmin(user)`)
- [ ] Enforce server-side in PATCH/DELETE handlers
- [ ] Enforce client-side on access-control page (hide admin UI from non-admins)

## 6. Realtime Whiteboard

- [ ] REST routes are the single source of truth for writes (create/edit/delete)
- [ ] Socket.io is broadcast-only — emit `post:add` / `post:update` / `post:delete` from inside REST route handlers after successful write
- [ ] Client re-syncs full state via `init` event on (re)connect

## 7. CORS

- [ ] Configure CORS on Express:
  ```ts
  app.use(cors({ origin: process.env.FRONTEND_URL!, credentials: true }));
  ```
- [ ] Apply same origin rule to Socket.io server config

## 8. Pages

- [ ] Discovery page — search/filter posts by `major` / `moodType`
  - [ ] Add Mongo index: `db.posts.createIndex({ major: 1, moodType: 1 })`
  - [ ] Add text index on `content` if full-text search is wanted
- [ ] Access-control page
  - [ ] Users can post/edit/delete their own posts
  - [ ] Admins can delete any post (content moderation)

## 9. Polish

- [ ] Use CLI agent skill for UI/animation refinement

## 10. Deploy

- [ ] Backend → Render Web Service
- [ ] Frontend → Render Static Site
- [ ] Note: free tier spins down after ~15min idle (~30-50s cold start) — fine for personal project, avoid surprises during live demo

---

**Build order:** Auth → Models/Routes → Realtime layer → UI polish → Deploy config
