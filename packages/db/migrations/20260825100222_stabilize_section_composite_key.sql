ALTER TABLE "issues" DROP CONSTRAINT "issues_board_id_section_id_sections_fk";--> statement-breakpoint
ALTER TABLE "sections" DROP CONSTRAINT "sections_board_id_id_unique";
--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_id_board_id_unique" UNIQUE("id","board_id");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_section_id_board_id_sections_fk" FOREIGN KEY ("section_id","board_id") REFERENCES "public"."sections"("id","board_id") ON DELETE cascade ON UPDATE no action;
