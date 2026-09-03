# Orbit web

The Orbit frontend is a Next.js App Router application. It uses Tailwind CSS
v4, TanStack Query, Xior, Zod, Phosphor Icons, and Better Auth.

## Local development

Copy `.env.example` to `.env.local`, then start the monorepo from its root:

```bash
bun run dev
```

The web app expects the API at `NEXT_PUBLIC_API_ORIGIN` and sends session
cookies with every browser request.

## Structure

- `app/` owns routes, layouts, providers, and route-level states.
- `features/` owns user-facing feature composition and UI.
- `lib/api/` owns browser/server Xior clients, runtime response validation, and
  normalized API errors.
- `@orbit/contracts` is the shared source of truth for API entities and
  WebSocket messages.

## Checks

Run these from the monorepo root:

```bash
bun run check-types
bun run lint
bun run test
bun run build
```
