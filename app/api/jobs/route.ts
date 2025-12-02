// app/api/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { JobStatus, JobPriority } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any).id as string;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: { dateApplied: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
  company,
  role,
  url,
  status = "applied",
  priority = "medium",
  dateApplied,
  notes,
  tags,
  oaDeadline,
  interviewDate,
  reminderDaysBefore,
} = body as {
  company: string;
  role: string;
  url?: string;
  status?: JobStatus;
  priority?: JobPriority;
  dateApplied?: string;
  notes?: string;
  tags?: string[];
  oaDeadline?: string | null;
  interviewDate?: string | null;
  reminderDaysBefore?: number | null;
};

    if (!company || !role) {
      return NextResponse.json(
        { error: "company and role are required" },
        { status: 400 }
      );
    }

   const parsedDate =
  dateApplied && !Number.isNaN(Date.parse(dateApplied))
    ? new Date(dateApplied)
    : new Date();

    const job = await prisma.jobApplication.create({
  data: {
    company,
    role,
    url: url || null,
    status,
    priority,
    dateApplied: parsedDate,
    notes: notes || null,
    tags: tags ?? [],
    oaDeadline: oaDeadline ? new Date(oaDeadline) : null,
    interviewDate: interviewDate ? new Date(interviewDate) : null,
    reminderDaysBefore: reminderDaysBefore ?? null,
    userId,
  },
});

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
