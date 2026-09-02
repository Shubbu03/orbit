import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { boards } from "./boards.js";
import { sections } from "./sections.js";

export const issues = pgTable(
  "issues",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    position: integer("position").default(0).notNull(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    sectionId: text("section_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("issues_board_id_idx").on(table.boardId),
    index("issues_section_id_idx").on(table.sectionId),
    index("issues_section_id_position_idx").on(table.sectionId, table.position),
    foreignKey({
      name: "issues_section_id_board_id_sections_fk",
      columns: [table.sectionId, table.boardId],
      foreignColumns: [sections.id, sections.boardId],
    }).onDelete("cascade"),
  ],
);
