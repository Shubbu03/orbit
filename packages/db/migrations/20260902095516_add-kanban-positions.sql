ALTER TABLE "issues" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH "ranked_sections" AS (
	SELECT
		"id",
		(ROW_NUMBER() OVER (
			PARTITION BY "board_id"
			ORDER BY "created_at", "id"
		) - 1)::integer AS "position"
	FROM "sections"
)
UPDATE "sections"
SET "position" = "ranked_sections"."position"
FROM "ranked_sections"
WHERE "sections"."id" = "ranked_sections"."id";--> statement-breakpoint
WITH "ranked_issues" AS (
	SELECT
		"id",
		(ROW_NUMBER() OVER (
			PARTITION BY "section_id"
			ORDER BY "created_at", "id"
		) - 1)::integer AS "position"
	FROM "issues"
)
UPDATE "issues"
SET "position" = "ranked_issues"."position"
FROM "ranked_issues"
WHERE "issues"."id" = "ranked_issues"."id";--> statement-breakpoint
CREATE INDEX "issues_section_id_position_idx" ON "issues" USING btree ("section_id","position");--> statement-breakpoint
CREATE INDEX "sections_board_id_position_idx" ON "sections" USING btree ("board_id","position");
