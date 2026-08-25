import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { DatabaseConnection } from "@orbit/db";
import * as schema from "@orbit/db/schema";
import { betterAuth } from "better-auth/minimal";

type AuthModuleOptions = {
  apiOrigin: string;
  database: DatabaseConnection;
  google: { clientId: string; clientSecret: string };
  secret: string;
  trustedOrigins: string[];
};

export function createAuthModule(options: AuthModuleOptions) {
  const auth = betterAuth({
    appName: "Orbit",
    basePath: "/api/auth",
    baseURL: options.apiOrigin,
    database: drizzleAdapter(options.database.database, {
      provider: "pg",
      schema,
    }),
    account: {
      encryptOAuthTokens: true,
    },
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: options.google.clientId,
        clientSecret: options.google.clientSecret,
        prompt: "select_account",
      },
    },
    rateLimit: {
      enabled: true,
      max: 100,
      storage: "database",
      window: 60,
      customRules: {
        "/sign-in/social": {
          max: 10,
          window: 60,
        },
      },
    },
    secret: options.secret,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      freshAge: 60 * 5,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
        strategy: "jwe",
      },
    },
    advanced: {
      cookiePrefix: "orbit",
      useSecureCookies: options.apiOrigin.startsWith("https://"),
    },
    trustedOrigins: options.trustedOrigins,
  });

  return {
    handler: auth.handler,
    api: auth.api,
    getSession: async (headers: Headers) => {
      const result = await auth.api.getSession({ headers });
      return result ?? null;
    },
  };
}

export type AuthModule = ReturnType<typeof createAuthModule>;
