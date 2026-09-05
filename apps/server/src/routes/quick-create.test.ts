import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createIssueInputSchema,
  createIssueResponseSchema,
  createOrganisationInputSchema,
  createOrganisationResponseSchema,
} from "@orbit/contracts/entities";
import { createIssueRoutes } from "./issues";
import { createOrganisationRoutes } from "./organisation";

const boardId = "00000000-0000-4000-8000-000000000001";
const sectionId = "00000000-0000-4000-8000-000000000002";
const entityId = "00000000-0000-4000-8000-000000000003";
const auth = { getSession: () => Promise.resolve({ user: { id: "user" } }) };
const eventPublisher = { publish: () => undefined };
function unexpected(): Promise<never> {
  return Promise.reject(new Error("Unexpected service call"));
}
const issueInput = {
  boardId,
  sectionId,
  title: "A quick card",
  description: "",
};

function issueApp() {
  return createIssueRoutes({
    auth,
    eventPublisher,
    issueService: {
      create: (input) =>
        Promise.resolve({
          boardId: input.boardId,
          sectionId: input.sectionId,
          title: input.title,
          description: input.description,
          id: entityId,
          createdAt: new Date(),
          updatedAt: new Date(),
          position: 0,
        }),
      update: (input) =>
        Promise.resolve({
          id: input.issueId,
          boardId,
          sectionId,
          title: input.title,
          description: input.description,
          createdAt: new Date(),
          updatedAt: new Date(),
          position: 0,
        }),
      getById: unexpected,
      listForUser: unexpected,
      move: unexpected,
      deleteIssue: unexpected,
    },
  });
}

void test("quick card creation accepts an empty description through the route and response contract", async () => {
  const parsed = createIssueInputSchema.parse(issueInput);
  const response = await issueApp().request("/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  assert.equal(response.status, 201);
  const result = createIssueResponseSchema.parse(await response.json());
  assert.equal(result.issue.description, "");
});

void test("a card description can be cleared without removing title validation", async () => {
  const app = issueApp();
  const response = await app.request(`/issues/${entityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "A card", description: "" }),
  });
  assert.equal(response.status, 200);
  for (const input of [
    { ...issueInput, title: "  " },
    { ...issueInput, description: "x".repeat(5001) },
  ]) {
    const invalid = await app.request("/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    assert.equal(invalid.status, 400);
  }
});

void test("an organization can be created with only a name in the form", async () => {
  const input = createOrganisationInputSchema.parse({
    name: "Team",
    description: "",
  });
  const app = createOrganisationRoutes({
    auth,
    eventPublisher,
    organisationService: {
      create: (value) =>
        Promise.resolve({
          id: entityId,
          name: value.name,
          description: value.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      deleteOrganisation: unexpected,
      getById: unexpected,
      listForUser: unexpected,
    },
  });
  const response = await app.request("/organisation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  assert.equal(response.status, 201);
  assert.equal(
    createOrganisationResponseSchema.parse(await response.json()).organization
      .description,
    "",
  );
});
