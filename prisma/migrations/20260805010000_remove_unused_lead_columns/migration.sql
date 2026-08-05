-- Remove unused/unwanted columns from the leads table.
-- Dropping columns also removes their dependent indexes automatically.

ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_assigned_by_id_fkey";

ALTER TABLE "leads"
    DROP COLUMN IF EXISTS "assigned_by_id",
    DROP COLUMN IF EXISTS "budget",
    DROP COLUMN IF EXISTS "currency",
    DROP COLUMN IF EXISTS "won_amount",
    DROP COLUMN IF EXISTS "lost_reason",
    DROP COLUMN IF EXISTS "expected_close_date",
    DROP COLUMN IF EXISTS "next_follow_up_date",
    DROP COLUMN IF EXISTS "last_activity_at",
    DROP COLUMN IF EXISTS "closed_at",
    DROP COLUMN IF EXISTS "converted_at";
