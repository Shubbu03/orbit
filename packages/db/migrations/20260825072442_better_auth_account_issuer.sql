DROP INDEX "account_providerId_accountId_idx";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "account"
SET "issuer" = 'https://accounts.google.com'
WHERE "provider_id" = 'google';--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "account" WHERE "issuer" IS NULL) THEN
		RAISE EXCEPTION 'Cannot infer issuer for every existing account; backfill those rows before continuing';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" USING btree ("issuer","account_id");
