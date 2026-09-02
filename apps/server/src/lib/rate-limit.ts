import { createClient } from "redis";

import type { Logger } from "./logger";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAfterMs: number;
};

export type RateLimiter = {
  close: () => Promise<void>;
  consume: (key: string) => Promise<RateLimitResult>;
};

type CreateRateLimiterOptions = {
  limit: number;
  logger: Logger;
  redisUrl?: string;
  windowMs: number;
};

const consumeScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {count, ttl}
`;

function resultFor(count: number, limit: number, resetAfterMs: number) {
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAfterMs: Math.max(0, resetAfterMs),
  };
}

function createMemoryRateLimiter(limit: number, windowMs: number): RateLimiter {
  const maximumEntries = 10_000;
  const entries = new Map<string, { count: number; resetAt: number }>();

  return {
    close: () => Promise.resolve(),
    consume: (key) => {
      const now = Date.now();
      const current = entries.get(key);

      if (!current || current.resetAt <= now) {
        entries.set(key, { count: 1, resetAt: now + windowMs });
        return Promise.resolve(resultFor(1, limit, windowMs));
      }

      current.count += 1;

      if (entries.size > maximumEntries) {
        for (const [entryKey, entry] of entries) {
          if (entry.resetAt <= now) {
            entries.delete(entryKey);
          }
        }

        while (entries.size > maximumEntries) {
          const oldestKey = entries.keys().next().value;

          if (!oldestKey) {
            break;
          }

          entries.delete(oldestKey);
        }
      }

      return Promise.resolve(
        resultFor(current.count, limit, current.resetAt - now),
      );
    },
  };
}

export async function createRateLimiter({
  limit,
  logger,
  redisUrl,
  windowMs,
}: CreateRateLimiterOptions): Promise<RateLimiter> {
  if (!redisUrl) {
    return createMemoryRateLimiter(limit, windowMs);
  }

  const client = createClient({ url: redisUrl });

  client.on("error", (error) => {
    logger.error("Redis rate-limiter error", {
      error: error instanceof Error ? error.message : "Unknown Redis error",
    });
  });
  await client.connect();

  return {
    close: () => client.close(),
    consume: async (key) => {
      const response = await client.eval(consumeScript, {
        arguments: [String(windowMs)],
        keys: [`orbit:rate-limit:v1:${key}`],
      });

      if (
        !Array.isArray(response) ||
        typeof response[0] !== "number" ||
        typeof response[1] !== "number"
      ) {
        throw new Error("Redis returned an invalid rate-limit response");
      }

      return resultFor(response[0], limit, response[1]);
    },
  };
}
