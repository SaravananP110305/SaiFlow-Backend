-- AlterTable: companies (add pincode + company type)
ALTER TABLE "companies" ADD COLUMN "pincode" VARCHAR(20);
ALTER TABLE "companies" ADD COLUMN "company_type" VARCHAR(100);

-- AlterTable: leads (add lifecycle fields)
ALTER TABLE "leads"
    ADD COLUMN "designation" VARCHAR(150),
    ADD COLUMN "alternate_phone" VARCHAR(20),
    ADD COLUMN "alternate_email" VARCHAR(255),
    ADD COLUMN "assigned_by_id" INTEGER,
    ADD COLUMN "expected_close_date" TIMESTAMP(3),
    ADD COLUMN "next_follow_up_date" TIMESTAMP(3),
    ADD COLUMN "last_activity_at" TIMESTAMP(3),
    ADD COLUMN "assigned_at" TIMESTAMP(3),
    ADD COLUMN "closed_at" TIMESTAMP(3),
    ADD COLUMN "converted_at" TIMESTAMP(3),
    ADD COLUMN "lost_reason" TEXT,
    ADD COLUMN "won_amount" DECIMAL(14,2);

-- AddForeignKey: leads.assigned_by_id -> users.id
ALTER TABLE "leads"
    ADD CONSTRAINT "leads_assigned_by_id_fkey"
    FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: clients (add commercial fields)
ALTER TABLE "clients"
    ADD COLUMN "payment_terms" VARCHAR(50),
    ADD COLUMN "credit_limit" DECIMAL(14,2),
    ADD COLUMN "relationship_manager_id" INTEGER,
    ADD COLUMN "account_manager_id" INTEGER;

-- AddForeignKey: clients.relationship_manager_id -> users.id
ALTER TABLE "clients"
    ADD CONSTRAINT "clients_relationship_manager_id_fkey"
    FOREIGN KEY ("relationship_manager_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: clients.account_manager_id -> users.id
ALTER TABLE "clients"
    ADD CONSTRAINT "clients_account_manager_id_fkey"
    FOREIGN KEY ("account_manager_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: leads
CREATE INDEX "leads_assigned_by_id_idx" ON "leads"("assigned_by_id");
CREATE INDEX "leads_source_id_idx" ON "leads"("source_id");
CREATE INDEX "leads_priority_id_idx" ON "leads"("priority_id");
CREATE INDEX "leads_company_id_idx" ON "leads"("company_id");
CREATE INDEX "leads_status_assigned_to_id_idx" ON "leads"("status", "assigned_to_id");
CREATE INDEX "leads_assigned_to_id_created_at_idx" ON "leads"("assigned_to_id", "created_at");
CREATE INDEX "leads_next_follow_up_date_idx" ON "leads"("next_follow_up_date");
