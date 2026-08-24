import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "./user.js";

export const oauthAccounts = pgTable(
	"oauth_accounts",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		provider: text("provider").notNull(),
		providerAccountId: text("provider_account_id").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("oauth_accounts_user_id_idx").on(table.userId),
		unique("oauth_accounts_provider_account_id_unique").on(
			table.provider,
			table.providerAccountId,
		),
	],
);
