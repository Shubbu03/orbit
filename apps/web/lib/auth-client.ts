import { createAuthClient } from "better-auth/react";

import { apiOrigin } from "./api/origin";

export const authClient = createAuthClient({
  baseURL: apiOrigin,
});
