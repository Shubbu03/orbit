# Orbit

Kanban-style issue tracker for teams.

## Local development

1. Copy `apps/server/.env.example` to `apps/server/.env` and add the database,
   Better Auth, and Google OAuth credentials.
2. Copy `apps/web/.env.example` to `apps/web/.env`.
3. In Google Cloud, register
   `http://localhost:3001/api/auth/callback/google` as an authorized redirect
   URI.
4. Apply the database migrations, then run `bun run dev` from the repository
   root.

The web app runs on `http://localhost:3000`; the API runs on
`http://localhost:3001`.
