import { relations } from "drizzle-orm";

import { boards } from "./boards.js";
import { comments } from "./comments.js";
import { issueMapping } from "./issue_mapping.js";
import { issues } from "./issues.js";
import { membership } from "./membership.js";
import { oauthAccounts } from "./oauth_accounts.js";
import { organisation } from "./organisation.js";
import { sections } from "./sections.js";
import { sessions } from "./sessions.js";
import { user } from "./user.js";

export const userRelations = relations(user, ({ many }) => ({
	memberships: many(membership),
	issueMappings: many(issueMapping),
	comments: many(comments),
	oauthAccounts: many(oauthAccounts),
	sessions: many(sessions),
}));

export const oauthAccountRelations = relations(oauthAccounts, ({ one }) => ({
	user: one(user, {
		fields: [oauthAccounts.userId],
		references: [user.id],
	}),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(user, {
		fields: [sessions.userId],
		references: [user.id],
	}),
}));

export const organisationRelations = relations(organisation, ({ many }) => ({
	memberships: many(membership),
	boards: many(boards),
}));

export const membershipRelations = relations(membership, ({ one }) => ({
	user: one(user, {
		fields: [membership.userId],
		references: [user.id],
	}),
	organisation: one(organisation, {
		fields: [membership.organisationId],
		references: [organisation.id],
	}),
}));

export const boardRelations = relations(boards, ({ many, one }) => ({
	organisation: one(organisation, {
		fields: [boards.organisationId],
		references: [organisation.id],
	}),
	sections: many(sections),
	issues: many(issues),
}));

export const sectionRelations = relations(sections, ({ many, one }) => ({
	board: one(boards, {
		fields: [sections.boardId],
		references: [boards.id],
	}),
	issues: many(issues),
}));

export const issueRelations = relations(issues, ({ many, one }) => ({
	board: one(boards, {
		fields: [issues.boardId],
		references: [boards.id],
	}),
	section: one(sections, {
		fields: [issues.sectionId],
		references: [sections.id],
	}),
	assignees: many(issueMapping),
	comments: many(comments),
}));

export const issueMappingRelations = relations(issueMapping, ({ one }) => ({
	user: one(user, {
		fields: [issueMapping.userId],
		references: [user.id],
	}),
	issue: one(issues, {
		fields: [issueMapping.issueId],
		references: [issues.id],
	}),
}));

export const commentRelations = relations(comments, ({ one }) => ({
	issue: one(issues, {
		fields: [comments.issueId],
		references: [issues.id],
	}),
	user: one(user, {
		fields: [comments.userId],
		references: [user.id],
	}),
}));
