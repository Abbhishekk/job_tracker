-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "interviewDate" TIMESTAMP(3),
ADD COLUMN     "oaDeadline" TIMESTAMP(3),
ADD COLUMN     "reminderDaysBefore" INTEGER;
