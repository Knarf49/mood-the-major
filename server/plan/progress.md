# Whiteboard Project — To-Do List

## 1. Setup
- [ ] Setup MongoDB
- [ ] Setup Zustand (access token in memory only — do NOT persist to localStorage)
- [ ] Setup shadcn & Tailwind
- [ ] Confirm hosting: Render for both frontend (static site) and backend (web service)

## 2. DB Models
- [ ] `user` model
  - `id: uuid`
  - `username: string` (unique index)
  - `passwordHash: string`
  - `role: 'user' | 'admin'`
  - `createdAt: Date`
- [ ] `post` model
  - `id: uuid`
  - `content: string`
  - `major: string`
  - `moodType: enum`
  - `ownerId: uuid` (FK -> user.id)
  - `createdAt: Date`
  - `updatedAt: Date`
- [ ] No separate `board` model — single implicit board, `GET /posts` returns everything

## 3. API Routes
- [ ] `POST /auth/signup`
- [ ] `POST /auth/login`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/forgot-password` — send reset code via email, rate-limited, code TTL ~15min
- [ ] `POST /auth/reset-password` — code is single-use
- [ ] `GET /posts` — list all
- [ ] `POST /posts` — auth required, ownerId from verified JWT (never from client body)
- [ ] `PATCH /posts/:id` — auth required, ownership OR admin check
- [ ] `DELETE /posts/:id` — auth required, ownership OR admin check
- [ ] Add zod validation on every route body

## 4. Auth
- [ ] Implement refresh + access token flow
- [ ] Auth middleware: verify JWT, attach `req.user`
- [ ] Refresh token → httpOnly cookie, `sameSite: "none"`, `secure: true`
- [ ] Rate limit `/auth/login`
- [ ] Rate limit `/auth/forgot-password`

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