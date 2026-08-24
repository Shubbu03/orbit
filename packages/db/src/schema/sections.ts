import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { boards } from "./boards.js";

export const sections = pgTable(
	"sections",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
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
		unique("sections_board_id_id_unique").on(table.boardId, table.id),
	],
);
