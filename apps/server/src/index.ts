import { createApp } from "./app";

const port = Number(process.env.PORT) || 3000;
const trustedOrigin = process.env.TRUSTED_ORIGIN || "http://localhost:3001";

const app = createApp(trustedOrigin);

export default {
  port,
  fetch: app.fetch,
};