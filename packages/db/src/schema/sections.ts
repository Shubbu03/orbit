import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { boards } from "./boards.js";

export const sections = pgTable(
  "sections",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    position: integer("position").default(0).notNull(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("sections_board_id_idx").on(table.boardId),
    index("sections_board_id_position_idx").on(table.boardId, table.position),
    unique("sections_id_board_id_unique").on(table.id, table.boardId),
  ],
);
