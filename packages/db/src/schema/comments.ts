import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { issues } from "./issues.js";
import { user } from "./user.js";

export const comments = pgTable(
	"comments",
	{
		id: text("id").primaryKey(),
		issueId: text("issue_id")
			.notNull()
			.references(() => issues.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("comments_issue_id_idx").on(table.issueId)],
);
