# Orbit server

Hono/Bun API for Orbit. Authentication is handled by Better Auth with Google
OAuth; application routes use the session cookie created by Better Auth.

## Run locally

```sh
cp .env.example .env
bun install
bun run dev
```

The API listens on `http://localhost:3001` by default. Apply pending database
migrations from `packages/db` before starting it.

Redis is optional for a single server process. Set `REDIS_URL` in production to
share board events and rate-limit counters between instances. Presence itself is
kept in process, so multiple instances should use sticky WebSocket routing.

## HTTP API

All application endpoints are under `/api` and require a valid session.
Collection endpoints accept `limit` (1-100, default 50) and `offset` (default
0). Better Auth is mounted at `/api/auth/*`.

- Organizations: `POST /organisation`, `GET /organisation`,
  `DELETE /organisation/:organisationId`
- Boards: `POST /boards`, `GET /boards`, `GET /boards/:boardId`,
  `PUT /boards/:boardId`, `DELETE /boards/:boardId`
- Sections: `POST /sections`, `GET /sections`, `PUT /sections/:sectionId`,
  `PUT /sections/:sectionId/move`, `DELETE /sections/:sectionId`
- Issues: `POST /issues`, `GET /issues`, `GET /issues/:issueId`,
  `PUT /issues/:issueId`, `PUT /issues/:issueId/move`,
  `DELETE /issues/:issueId`
- Assignees: `POST /issues/:issueId/assignees`,
  `DELETE /issues/:issueId/assignees/:userId`
- Comments: `POST /comments`, `GET /issues/:issueId/comments`,
  `PUT /comments/:commentId`, `DELETE /comments/:commentId`
- Memberships: `GET /memberships`, `DELETE /membership`, `POST /invite`,
  `POST /accept`

## WebSocket API

Connect to `/ws/boards/:boardId` with the Better Auth session cookie and the
configured trusted origin. The server authorizes accepted board membership
before upgrading the connection.

Server events cover presence, board/section/issue/comment changes, issue
assignees, membership changes, and heartbeat pings. Reply to `system.ping` with
`{"type":"system.pong"}`. Invalid messages or revoked memberships close the
connection.

## Verification

```sh
bun run check-types
bun run lint
bun run test
bun run build
```
