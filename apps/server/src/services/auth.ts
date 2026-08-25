import type { DatabaseConnection } from "@orbit/db";

import { createAuthModule, type AuthModule } from "../lib/auth";

type CreateAuthServiceOptions = {
  apiOrigin: string;
  database: DatabaseConnection;
  secret: string;
  trustedOrigins: string[];
  google: { clientId: string; clientSecret: string };
};

export function createAuthService(
  options: CreateAuthServiceOptions,
): AuthModule {
  return createAuthModule({
    apiOrigin: options.apiOrigin,
    database: options.database,
    google: options.google,
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
  });
}

export type { AuthModule } from "../lib/auth";
