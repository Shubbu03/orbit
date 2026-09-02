import { createClient } from "redis";
import { z } from "zod";

import type { Logger } from "../lib/logger";
import {
  publishedBoardEventSchema,
  type PublishedBoardEvent,
} from "./protocol";
import type { BoardEventPublisher } from "./publisher";

const BOARD_EVENTS_CHANNEL = "orbit:board-events:v1";

const eventEnvelopeSchema = z.object({
  event: publishedBoardEventSchema,
  sourceId: z.uuid(),
});

type CreateBoardEventBusOptions = {
  localPublisher: { publish: (event: PublishedBoardEvent) => void };
  logger: Logger;
  redisUrl?: string;
};

function parseEnvelope(message: string) {
  try {
    return eventEnvelopeSchema.safeParse(JSON.parse(message) as unknown);
  } catch {
    return eventEnvelopeSchema.safeParse(null);
  }
}

export async function createBoardEventBus({
  localPublisher,
  logger,
  redisUrl,
}: CreateBoardEventBusOptions): Promise<
  BoardEventPublisher & { close: () => Promise<void> }
> {
  if (!redisUrl) {
    return {
      close: () => Promise.resolve(),
      publish: (event) => localPublisher.publish(event),
    };
  }

  const publisher = createClient({ url: redisUrl });
  const subscriber = publisher.duplicate();
  const sourceId = crypto.randomUUID();

  publisher.on("error", (error) => {
    logger.error("Redis board-event publisher error", {
      error: error instanceof Error ? error.message : "Unknown Redis error",
    });
  });
  subscriber.on("error", (error) => {
    logger.error("Redis board-event subscriber error", {
      error: error instanceof Error ? error.message : "Unknown Redis error",
    });
  });

  await publisher.connect();
  await subscriber.connect();
  await subscriber.subscribe(BOARD_EVENTS_CHANNEL, (message) => {
    const parsedEnvelope = parseEnvelope(message);

    if (!parsedEnvelope.success) {
      logger.warn("Discarded invalid Redis board event");
      return;
    }

    if (parsedEnvelope.data.sourceId !== sourceId) {
      localPublisher.publish(parsedEnvelope.data.event);
    }
  });

  return {
    close: async () => {
      await subscriber.unsubscribe(BOARD_EVENTS_CHANNEL);
      await Promise.all([publisher.close(), subscriber.close()]);
    },
    publish: (event) => {
      localPublisher.publish(event);
      void publisher
        .publish(BOARD_EVENTS_CHANNEL, JSON.stringify({ event, sourceId }))
        .catch((error: unknown) => {
          logger.error("Failed to publish Redis board event", {
            error:
              error instanceof Error ? error.message : "Unknown Redis error",
            eventType: event.type,
          });
        });
    },
  };
}
