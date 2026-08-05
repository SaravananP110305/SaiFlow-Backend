-- Redesign: Lead Management no longer uses the Company table.
-- The leads table now stores all company/address details directly.

-- Drop the lead -> company relation
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_company_id_fkey";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "company_id";

-- Denormalize company/address fields onto leads
ALTER TABLE "leads"
    ADD COLUMN "website" VARCHAR(255),
    ADD COLUMN "industry_id" INTEGER,
    ADD COLUMN "company_type" VARCHAR(100),
    ADD COLUMN "address" TEXT,
    ADD COLUMN "country_id" INTEGER,
    ADD COLUMN "state_id" INTEGER,
    ADD COLUMN "city_id" INTEGER,
    ADD COLUMN "pincode" VARCHAR(20);

-- Foreign keys -> master_items (industry, country, state, city)
ALTER TABLE "leads"
    ADD CONSTRAINT "leads_industry_id_fkey"
    FOREIGN KEY ("industry_id") REFERENCES "master_items"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads"
    ADD CONSTRAINT "leads_country_id_fkey"
    FOREIGN KEY ("country_id") REFERENCES "master_items"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads"
    ADD CONSTRAINT "leads_state_id_fkey"
    FOREIGN KEY ("state_id") REFERENCES "master_items"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads"
    ADD CONSTRAINT "leads_city_id_fkey"
    FOREIGN KEY ("city_id") REFERENCES "master_items"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "leads_title_idx" ON "leads"("title");
CREATE INDEX "leads_industry_id_idx" ON "leads"("industry_id");
CREATE INDEX "leads_country_id_idx" ON "leads"("country_id");
CREATE INDEX "leads_state_id_idx" ON "leads"("state_id");
CREATE INDEX "leads_city_id_idx" ON "leads"("city_id");
