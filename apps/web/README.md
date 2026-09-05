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

## Workspace interaction

The dashboard opens the last accessible organization. Switch organizations in
the top bar; create a board to open it immediately. Add lists and cards inline
with Enter, use Shift+Enter for a line break, and Escape to cancel. Card
descriptions are optional. Invites and organization settings are available
beside the board grid; members are also accessible from a board.

Drag any part of a card with a mouse. On touch screens, hold briefly to drag,
or swipe without holding to scroll. Keyboard users can focus a card, press
Space, use arrow keys, and press Space to drop or Escape to cancel. The List
selector in card details provides a non-drag alternative. Card details open
over the board; Escape or the close button returns to the same scroll position.

Moves render locally before the server responds. The move queue saves them in
gesture order, removes failed operations, and replays the remaining operations
on confirmed data. Board refetches are deferred during dragging and saving.

## Manual verification

Browser checks are user-owned. After updating, restart both the web app and API
so quick-create uses the matching validation contracts, then verify:

- At 320px, 390px, tablet, and desktop widths: the top bar stays usable, lists
  scroll horizontally, long lists scroll vertically, and dialogs fit the screen.
- Create an organization using only a name, create a board, then add several
  lists and cards with Enter. Failed creation should keep the entered text.
- Reorder up/down, move between lists and into an empty list, move a card twice
  quickly, cancel a drag, and reload to confirm saved ordering.
- Check mouse, touch hold/scroll, and keyboard dragging. Check the List selector
  in card details as well.
- Open a card, edit its title/description, comment, assign a member, and close
  it. The board should remain in place. Verify both admin and member accounts.
- With network throttling or a failed move request, cards should move immediately;
  a failed save should show an error and restore only the failed move. Verify
  live updates in two sessions and after reconnecting.

The automated tests exercise ordering, delayed/rejected move requests, and
quick-create route validation. They do not measure browser frame rate or replace
manual touch, layout, or database integration checks.
