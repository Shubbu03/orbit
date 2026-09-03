import { z } from "zod";

import { pageSchema } from "./api";

export const roleSchema = z.enum(["admin", "member"]);

export const personSchema = z
  .object({
    id: z.string().min(1).max(255),
    image: z.url().nullable(),
    name: z.string().min(1).max(255),
  })
  .strict();

const timestampsSchema = z.object({
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const organisationRecordSchema = timestampsSchema
  .extend({
    description: z.string().min(1).max(500),
    id: z.uuid(),
    name: z.string().min(1).max(100),
  })
  .strict();

export const organisationSchema = organisationRecordSchema
  .extend({
    role: roleSchema,
  })
  .strict();

export const createOrganisationInputSchema = z
  .object({
    description: z.string().trim().min(1).max(500),
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const createOrganisationResponseSchema = z
  .object({
    organization: organisationRecordSchema,
  })
  .strict();

export const membershipSchema = timestampsSchema
  .extend({
    accepted: z.boolean(),
    id: z.string().min(1),
    organisationId: z.uuid(),
    role: roleSchema,
    userId: z.string().min(1).max(255),
  })
  .strict();

export const inviteMemberInputSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    organisationId: z.uuid(),
  })
  .strict();

export const inviteMemberResponseSchema = z
  .object({
    invitation: membershipSchema,
  })
  .strict();

export const boardRecordSchema = timestampsSchema
  .extend({
    id: z.uuid(),
    organisationId: z.uuid(),
    title: z.string().min(1).max(100),
  })
  .strict();

export const boardSchema = boardRecordSchema
  .extend({
    role: roleSchema,
  })
  .strict();

export const createBoardInputSchema = z
  .object({
    organisationId: z.uuid(),
    title: z.string().trim().min(1).max(100),
  })
  .strict();

export const createBoardResponseSchema = z
  .object({
    board: boardRecordSchema,
  })
  .strict();

export const updateBoardInputSchema = createBoardInputSchema.pick({
  title: true,
});

export const boardRecordResponseSchema = z
  .object({
    board: boardRecordSchema,
  })
  .strict();

export const sectionSchema = timestampsSchema
  .extend({
    boardId: z.uuid(),
    id: z.uuid(),
    position: z.number().int().min(0),
    title: z.string().min(1).max(100),
  })
  .strict();

export const createSectionInputSchema = z
  .object({
    boardId: z.uuid(),
    title: z.string().trim().min(1).max(100),
  })
  .strict();

export const createSectionResponseSchema = z
  .object({
    section: sectionSchema,
  })
  .strict();

export const updateSectionInputSchema = createSectionInputSchema.pick({
  title: true,
});

export const moveSectionInputSchema = z
  .object({
    position: z.number().int().min(0),
  })
  .strict();

export const sectionResponseSchema = z
  .object({
    section: sectionSchema,
  })
  .strict();

export const issueSchema = timestampsSchema
  .extend({
    boardId: z.uuid(),
    description: z.string().max(5_000),
    id: z.uuid(),
    position: z.number().int().min(0),
    sectionId: z.uuid(),
    title: z.string().min(1).max(200),
  })
  .strict();

export const createIssueInputSchema = z
  .object({
    boardId: z.uuid(),
    description: z.string().trim().min(1).max(5_000),
    sectionId: z.uuid(),
    title: z.string().trim().min(1).max(200),
  })
  .strict();

export const createIssueResponseSchema = z
  .object({
    issue: issueSchema,
  })
  .strict();

export const updateIssueInputSchema = createIssueInputSchema.pick({
  description: true,
  title: true,
});

export const moveIssueInputSchema = z
  .object({
    position: z.number().int().min(0),
    sectionId: z.uuid(),
  })
  .strict();

export const issueRecordResponseSchema = z
  .object({
    issue: issueSchema,
  })
  .strict();

export const commentSchema = timestampsSchema
  .extend({
    author: personSchema,
    content: z.string().min(1).max(5_000),
    id: z.uuid(),
    issueId: z.uuid(),
    userId: z.string().min(1).max(255),
  })
  .strict();

export const createCommentInputSchema = z
  .object({
    content: z.string().trim().min(1).max(5_000),
    issueId: z.uuid(),
  })
  .strict();

export const updateCommentInputSchema = createCommentInputSchema.pick({
  content: true,
});

export const commentMutationSchema = commentSchema.extend({
  boardId: z.uuid(),
});

export const commentMutationResponseSchema = z
  .object({ comment: commentMutationSchema })
  .strict();

export const commentsResponseSchema = z
  .object({ comments: z.array(commentSchema), page: pageSchema })
  .strict();

export const boardIssueSchema = issueSchema.extend({
  assignees: z.array(personSchema),
});

export const boardSectionSchema = sectionSchema.extend({
  issues: z.array(boardIssueSchema),
});

export const boardDetailsSchema = boardSchema.extend({
  sections: z.array(boardSectionSchema),
});

export const issueDetailsSchema = issueSchema.extend({
  assignees: z.array(personSchema),
  comments: z.array(commentSchema),
  commentsPage: pageSchema,
});

export const issueResponseSchema = z
  .object({ issue: issueDetailsSchema })
  .strict();

export const assignmentSchema = z
  .object({
    issueId: z.uuid(),
    user: personSchema,
  })
  .strict();

export const assignIssueInputSchema = z
  .object({ userId: z.string().trim().min(1).max(255) })
  .strict();

export const assignmentResponseSchema = z
  .object({ assignment: assignmentSchema })
  .strict();

export const membershipUserSchema = personSchema.extend({
  email: z.email(),
});

export const membershipDetailsSchema = membershipSchema.extend({
  user: membershipUserSchema,
});

export const membershipsResponseSchema = z
  .object({ memberships: z.array(membershipDetailsSchema), page: pageSchema })
  .strict();

export const removeMembershipInputSchema = z
  .object({
    organisationId: z.uuid(),
    userId: z.string().trim().min(1).max(255),
  })
  .strict();

export const acceptInvitationInputSchema = inviteMemberInputSchema.pick({
  organisationId: true,
});

export const acceptInvitationResponseSchema = z
  .object({ membership: membershipSchema })
  .strict();

export const organisationsResponseSchema = z
  .object({
    organizations: z.array(organisationSchema),
    page: pageSchema,
  })
  .strict();

export const organisationResponseSchema = z
  .object({ organization: organisationSchema })
  .strict();

export const boardsResponseSchema = z
  .object({
    boards: z.array(boardSchema),
    page: pageSchema,
  })
  .strict();

export const boardResponseSchema = z
  .object({ board: boardDetailsSchema })
  .strict();

export type Role = z.infer<typeof roleSchema>;
export type Person = z.infer<typeof personSchema>;
export type CreateOrganisationInput = z.infer<
  typeof createOrganisationInputSchema
>;
export type CreateOrganisationResponse = z.infer<
  typeof createOrganisationResponseSchema
>;
export type InviteMemberInput = z.infer<typeof inviteMemberInputSchema>;
export type InviteMemberResponse = z.infer<typeof inviteMemberResponseSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type OrganisationRecord = z.infer<typeof organisationRecordSchema>;
export type Organisation = z.infer<typeof organisationSchema>;
export type OrganisationResponse = z.infer<typeof organisationResponseSchema>;
export type OrganisationsResponse = z.infer<typeof organisationsResponseSchema>;
export type BoardRecord = z.infer<typeof boardRecordSchema>;
export type Board = z.infer<typeof boardSchema>;
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;
export type CreateBoardResponse = z.infer<typeof createBoardResponseSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardInputSchema>;
export type BoardRecordResponse = z.infer<typeof boardRecordResponseSchema>;
export type BoardsResponse = z.infer<typeof boardsResponseSchema>;
export type BoardDetails = z.infer<typeof boardDetailsSchema>;
export type BoardResponse = z.infer<typeof boardResponseSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type CreateSectionInput = z.infer<typeof createSectionInputSchema>;
export type CreateSectionResponse = z.infer<typeof createSectionResponseSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionInputSchema>;
export type MoveSectionInput = z.infer<typeof moveSectionInputSchema>;
export type SectionResponse = z.infer<typeof sectionResponseSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type CreateIssueInput = z.infer<typeof createIssueInputSchema>;
export type CreateIssueResponse = z.infer<typeof createIssueResponseSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;
export type MoveIssueInput = z.infer<typeof moveIssueInputSchema>;
export type IssueRecordResponse = z.infer<typeof issueRecordResponseSchema>;
export type IssueDetails = z.infer<typeof issueDetailsSchema>;
export type IssueResponse = z.infer<typeof issueResponseSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentInputSchema>;
export type CommentMutationResponse = z.infer<
  typeof commentMutationResponseSchema
>;
export type CommentsResponse = z.infer<typeof commentsResponseSchema>;
export type AssignIssueInput = z.infer<typeof assignIssueInputSchema>;
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export type MembershipDetails = z.infer<typeof membershipDetailsSchema>;
export type MembershipsResponse = z.infer<typeof membershipsResponseSchema>;
export type RemoveMembershipInput = z.infer<typeof removeMembershipInputSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>;
export type AcceptInvitationResponse = z.infer<
  typeof acceptInvitationResponseSchema
>;
