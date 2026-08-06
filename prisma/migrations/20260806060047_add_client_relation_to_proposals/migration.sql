/*
  Warnings:

  - You are about to drop the column `description` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `is_system` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `navigation_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permission_modules` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "pan_number" VARCHAR(100),
ADD COLUMN     "preferred_communication" VARCHAR(50);

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "phone" VARCHAR(20);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "kickoff_date" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "target_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "client_id" INTEGER,
ADD COLUMN     "estimation" JSONB,
ADD COLUMN     "pricing" JSONB,
ADD COLUMN     "quotation" JSONB,
ADD COLUMN     "requirements" JSONB,
ALTER COLUMN "lead_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "description",
DROP COLUMN "is_system",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "first_name",
DROP COLUMN "last_name",
ADD COLUMN     "department" VARCHAR(100),
ADD COLUMN     "name" VARCHAR(200) NOT NULL;

-- DropTable
DROP TABLE "navigation_items";

-- DropTable
DROP TABLE "permission_modules";

-- CreateTable
CREATE TABLE "proposal_phases" (
    "id" SERIAL NOT NULL,
    "proposal_id" INTEGER NOT NULL,
    "phase_name" VARCHAR(200) NOT NULL,
    "overview" TEXT,
    "estimated_timeline" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_phase_objectives" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "proposal_phase_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_phase_technical_requirements" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "proposal_phase_technical_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_phase_deliverables" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "proposal_phase_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_phase_assumptions" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "proposal_phase_assumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_phase_constraints" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "proposal_phase_constraints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_phase_line_items" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(14,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "proposal_phase_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "updated_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_name" VARCHAR(150) NOT NULL,
    "message" VARCHAR(255) NOT NULL,
    "target_name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(30) NOT NULL DEFAULT 'System',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposal_phases_proposal_id_idx" ON "proposal_phases"("proposal_id");

-- CreateIndex
CREATE INDEX "proposal_phase_objectives_phase_id_idx" ON "proposal_phase_objectives"("phase_id");

-- CreateIndex
CREATE INDEX "proposal_phase_technical_requirements_phase_id_idx" ON "proposal_phase_technical_requirements"("phase_id");

-- CreateIndex
CREATE INDEX "proposal_phase_deliverables_phase_id_idx" ON "proposal_phase_deliverables"("phase_id");

-- CreateIndex
CREATE INDEX "proposal_phase_assumptions_phase_id_idx" ON "proposal_phase_assumptions"("phase_id");

-- CreateIndex
CREATE INDEX "proposal_phase_constraints_phase_id_idx" ON "proposal_phase_constraints"("phase_id");

-- CreateIndex
CREATE INDEX "proposal_phase_line_items_phase_id_idx" ON "proposal_phase_line_items"("phase_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_phases" ADD CONSTRAINT "proposal_phases_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_phase_objectives" ADD CONSTRAINT "proposal_phase_objectives_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "proposal_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_phase_technical_requirements" ADD CONSTRAINT "proposal_phase_technical_requirements_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "proposal_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_phase_deliverables" ADD CONSTRAINT "proposal_phase_deliverables_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "proposal_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_phase_assumptions" ADD CONSTRAINT "proposal_phase_assumptions_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "proposal_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_phase_constraints" ADD CONSTRAINT "proposal_phase_constraints_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "proposal_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_phase_line_items" ADD CONSTRAINT "proposal_phase_line_items_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "proposal_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
