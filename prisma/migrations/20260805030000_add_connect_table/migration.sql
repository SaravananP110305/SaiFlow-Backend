-- CreateTable
-- The "connect" table stores all Contact & Follow-up page details: contact
-- outcomes (CONTACTED / INTERESTED / CALL_LATER / NOT_INTERESTED), summaries,
-- scheduled follow-up date/time/type and lifecycle status, with denormalized
-- lead display fields so the module pages need no joins.
CREATE TABLE "connect" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(150),
    "phone" VARCHAR(20),
    "assigned_to" VARCHAR(150),
    "outcome" VARCHAR(30),
    "summary" TEXT,
    "follow_up_type" VARCHAR(30),
    "follow_up_date" VARCHAR(10),
    "follow_up_time" VARCHAR(10),
    "status" VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "connect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connect_lead_id_idx" ON "connect"("lead_id");

-- CreateIndex
CREATE INDEX "connect_status_idx" ON "connect"("status");

-- CreateIndex
CREATE INDEX "connect_created_by_id_idx" ON "connect"("created_by_id");

-- AddForeignKey
ALTER TABLE "connect" ADD CONSTRAINT "connect_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connect" ADD CONSTRAINT "connect_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
