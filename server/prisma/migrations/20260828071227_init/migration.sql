-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('pending', 'running', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "UrlStatus" AS ENUM ('queued', 'checking', 'success', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'pending',
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urls" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "UrlStatus" NOT NULL DEFAULT 'queued',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "http_status" INTEGER,
    "response_time_ms" INTEGER,
    "page_title" TEXT,
    "error_message" TEXT,
    "job_id" TEXT,
    "job_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "batch_id" TEXT NOT NULL,

    CONSTRAINT "urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "urls_batch_id_idx" ON "urls"("batch_id");

-- CreateIndex
CREATE INDEX "urls_batch_id_status_idx" ON "urls"("batch_id", "status");

-- AddForeignKey
ALTER TABLE "urls" ADD CONSTRAINT "urls_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
