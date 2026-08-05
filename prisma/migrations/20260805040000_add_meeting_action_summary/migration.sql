-- Add a dedicated column for the latest action summary (Reschedule /
-- Complete / Cancel). This keeps the meeting agenda (agenda) and scope
-- notes (scope_notes) separate from the action outcome text.

ALTER TABLE "meetings"
    ADD COLUMN "action_summary" TEXT;
