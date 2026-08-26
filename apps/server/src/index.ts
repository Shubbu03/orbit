import { createDatabase } from "@orbit/db";

import { env } from "./env";
import { createApp } from "./app";
import { createAuthService } from "./services/auth";
import { createBoardService } from "./services/boards";
import { createIssueService } from "./services/issues";
import { createOrganisationService } from "./services/organisation";

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
const issueService = createIssueService(database);

const app = createApp({
  auth,
  boardService,
  issueService,
  organisationService,
  trustedOrigin: env.TRUSTED_ORIGIN,
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
