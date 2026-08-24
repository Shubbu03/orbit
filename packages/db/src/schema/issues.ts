import { foreignKey, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { boards } from "./boards.js";
import { sections } from "./sections.js";

export const issues = pgTable(
	"issues",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		description: text("description").notNull(),
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
		foreignKey({
			name: "issues_board_id_section_id_sections_fk",
			columns: [table.boardId, table.sectionId],
			foreignColumns: [sections.boardId, sections.id],
		}).onDelete("cascade"),
	],
);
