-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('applied', 'shortlisted', 'oa_assigned', 'interview', 'selected', 'rejected');

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "url" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'applied',
    "dateApplied" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);
