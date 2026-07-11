# Repository Instructions

## Project Shape
- Root uses npm workspaces: `shared`, `server`, `client`; install from root with `npm install` so root `package-lock.json` stays source of truth.
- `server/src/server.ts` loads `dotenv/config`, connects Mongo, starts Express on `PORT` default `8000`, and attaches Socket.IO namespace `/whiteboard`.
- `server/src/app.ts` is Express app used by tests; auth routes mount at root (`/signup`, `/login`, `/refresh`, etc.), not under `/auth`; posts mount under `/posts`.
- `client` is React Router v8 SSR app; route table lives in `client/app/routes.ts`; app alias `~/*` points to `client/app/*` only.
- `shared/schemas.ts` holds DTO Zod schemas/types used by both sides. Existing TS imports intentionally use `.js` suffix for shared TS files; Jest maps `shared/*.js` to TS in `server/jest.config.cjs`.

## Commands
- Start dev servers in separate terminals: `npm run dev:server` and `npm run dev:client`.
- Build all: `npm run build` (`server` first, then `client`). Focused builds: `npm run build -w server`, `npm run build -w client`.
- Client typecheck: `npm run typecheck -w client` (`react-router typegen && tsc`). Current Node `v22.14.0` warns because React Router wants `>22.22.0`, but typecheck/build completed in this environment.
- Client tests: `npm run test:client`; focused example: `npm run test -w client -- test/AuthProvider.test.tsx`.
- Server tests: `npm test -w server`; focused example: `npm test -w server -- test/post.test.ts --runInBand`.
- No lint, formatter, or CI workflow found; do not invent one as verification.

## Env And Services
- Server env keys are documented in `server/.env.example`: `FRONTEND_URL`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`.
- Client code expects `VITE_API_URL`; checked-in `.env` files exist, but do not read or print secret-bearing env files.
- Refresh auth uses httpOnly cookie `refreshToken` with `secure: true` and `sameSite: "none"`; client `/login` and `/refresh` fetches must keep `credentials: "include"`, and server CORS must match `FRONTEND_URL`.
- `docker-compose.yml` builds `server/Dockerfile`, reads `server/.env`, overrides `MONGO_URI=mongodb://mongo:27017/whiteboard`, and exposes backend `8000`, Mongo `27017`, mongo-express `8081`.

## Test Gotchas
- Server Jest uses `setupFiles: ["./test/setup.ts"]`; setup loads `server/.env` before modules read JWT secrets.
- Server integration tests use `mongodb-memory-server`; no real Mongo is required, but first run can be slow if Mongo binaries must download.
- Some server tests exercise signup paths that call Resend email helpers; controllers catch send failures, but a network stall can make Jest appear hung.
- Current `npm test -w server` timed out after 180s before reporting results in this environment; treat server test status as unverified until rerun successfully.
