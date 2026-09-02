import { closeDatabaseConnection, createDatabase } from "@orbit/db";
import { websocket } from "hono/bun";

import { env } from "./env";
import { createApp } from "./app";
import { createLogger } from "./lib/logger";
import { createRateLimiter } from "./lib/rate-limit";
import { createAuthService } from "./services/auth";
import { createAssigneeService } from "./services/assignees";
import { createBoardService } from "./services/boards";
import { createCommentService } from "./services/comments";
import { createInviteService } from "./services/invite";
import { createIssueService } from "./services/issues";
import { createMembershipService } from "./services/membership";
import { createOrganisationService } from "./services/organisation";
import { createSectionService } from "./services/sections";
import { createBoardWebSocketAccess } from "./ws/access";
import { createLocalBoardEventDispatcher } from "./ws/dispatcher";
import { createBoardEventBus } from "./ws/event-bus";
import { createBoardPresenceRooms } from "./ws/rooms";

const database = createDatabase(env.DATABASE_URL);
const logger = createLogger();

const auth = createAuthService({
  apiOrigin: env.API_ORIGIN,
  database,
  secret: env.AUTH_SECRET,
  trustedOrigins: [env.TRUSTED_ORIGIN],
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
});

const organisationService = createOrganisationService(database);
const assigneeService = createAssigneeService(database);
const boardService = createBoardService(database);
const sectionService = createSectionService(database);
const issueService = createIssueService(database);
const commentService = createCommentService(database);
const inviteService = createInviteService(database);
const membershipService = createMembershipService(database);
const webSocketAccess = createBoardWebSocketAccess(database);
const webSocketRooms = createBoardPresenceRooms({
  idleTimeoutMs: env.WS_IDLE_TIMEOUT_MS,
  maxConnectionsPerBoard: env.WS_MAX_CONNECTIONS_PER_BOARD,
  maxConnectionsPerUser: env.WS_MAX_CONNECTIONS_PER_USER,
});
const localBoardEventDispatcher =
  createLocalBoardEventDispatcher(webSocketRooms);
const boardEventBus = await createBoardEventBus({
  localPublisher: localBoardEventDispatcher,
  logger,
  redisUrl: env.REDIS_URL,
});
const rateLimiter = await createRateLimiter({
  limit: env.API_RATE_LIMIT_MAX,
  logger,
  redisUrl: env.REDIS_URL,
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
});
const heartbeatTimer = setInterval(
  () => webSocketRooms.sweep(),
  env.WS_HEARTBEAT_INTERVAL_MS,
);

heartbeatTimer.unref();

const app = createApp({
  auth,
  assigneeService,
  boardEventPublisher: boardEventBus,
  boardService,
  commentService,
  inviteService,
  issueService,
  logger,
  membershipService,
  organisationService,
  sectionService,
  rateLimiter,
  trustedOrigin: env.TRUSTED_ORIGIN,
  trustProxy: env.TRUST_PROXY,
  webSocketAccess,
  webSocketRooms,
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  clearInterval(heartbeatTimer);
  logger.info("Shutting down server", { signal });

  await Promise.allSettled([
    boardEventBus.close(),
    rateLimiter.close(),
    closeDatabaseConnection(database),
  ]);
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
