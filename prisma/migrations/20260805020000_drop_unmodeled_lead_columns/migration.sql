-- Drop legacy/unmodeled columns left behind by an aborted follow-up module
-- migration. Nothing in the schema or application code references them.

ALTER TABLE "leads"
    DROP COLUMN IF EXISTS "last_contact_result",
    DROP COLUMN IF EXISTS "last_contacted_at";
