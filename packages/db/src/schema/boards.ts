import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organisation } from "./organisation.js";

export const boards = pgTable(
	"boards",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		organisationId: text("organisation_id")
			.notNull()
			.references(() => organisation.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("boards_organisation_id_idx").on(table.organisationId)],
);
