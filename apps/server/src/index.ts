import { createDatabase } from "@orbit/db";

import { env } from "./env";
import { createApp } from "./app";
import { createAuthService } from "./services/auth";
import { createBoardService } from "./services/boards";
import { createCommentService } from "./services/comments";
import { createIssueService } from "./services/issues";
import { createOrganisationService } from "./services/organisation";
import { createSectionService } from "./services/sections";

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

const app = createApp({
  auth,
  boardService,
  commentService,
  issueService,
  organisationService,
  sectionService,
  trustedOrigin: env.TRUSTED_ORIGIN,
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
