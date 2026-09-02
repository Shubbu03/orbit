# Orbit database

PostgreSQL schema and Drizzle migrations shared by the Orbit server.

```sh
cp .env.example .env
bun run generate --name <migration-name>
bun run migrate
```

`generate` creates a reviewed migration from schema changes. `migrate` applies
all pending migrations to the database configured by `DATABASE_URL`. Prefer
migrations over `drizzle-kit push` for environments whose history must be
repeatable and reviewable.
