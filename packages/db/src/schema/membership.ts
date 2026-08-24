import { index, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { organisation } from "./organisation.js";
import { user } from "./user.js";

export const roleEnum = pgEnum("roles", ["member", "admin"]);

export const membership = pgTable(
	"membership",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organisationId: text("organisation_id")
			.notNull()
			.references(() => organisation.id, { onDelete: "cascade" }),
		role: roleEnum().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("membership_organisation_id_idx").on(table.organisationId),
		unique("membership_user_id_organisation_id_unique").on(
			table.userId,
			table.organisationId,
		),
	],
);
