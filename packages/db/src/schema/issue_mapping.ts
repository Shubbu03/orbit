import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { issues } from "./issues.js";
import { user } from "./user.js";

export const issueMapping = pgTable(
	"issue_mapping",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		issueId: text("issue_id")
			.notNull()
			.references(() => issues.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("issue_mapping_issue_id_idx").on(table.issueId),
		unique("issue_mapping_user_id_issue_id_unique").on(
			table.userId,
			table.issueId,
		),
	],
);
