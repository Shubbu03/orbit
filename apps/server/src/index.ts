import { createDatabase } from "@orbit/db";
import { websocket } from "hono/bun";

import { env } from "./env";
import { createApp } from "./app";
import { createAuthService } from "./services/auth";
import { createBoardService } from "./services/boards";
import { createCommentService } from "./services/comments";
import { createInviteService } from "./services/invite";
import { createIssueService } from "./services/issues";
import { createMembershipService } from "./services/membership";
import { createOrganisationService } from "./services/organisation";
import { createSectionService } from "./services/sections";
import { createBoardWebSocketAccess } from "./ws/access";
import { createBoardPresenceRooms } from "./ws/rooms";

const database = createDatabase(env.DATABASE_URL);

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
const boardService = createBoardService(database);
const sectionService = createSectionService(database);
const issueService = createIssueService(database);
const commentService = createCommentService(database);
const inviteService = createInviteService(database);
const membershipService = createMembershipService(database);
const webSocketAccess = createBoardWebSocketAccess(database);
const webSocketRooms = createBoardPresenceRooms();

const app = createApp({
  auth,
  boardService,
  commentService,
  inviteService,
  issueService,
  membershipService,
  organisationService,
  sectionService,
  trustedOrigin: env.TRUSTED_ORIGIN,
  webSocketAccess,
  webSocketRooms,
});

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
