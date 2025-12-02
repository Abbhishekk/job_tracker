// app/api/jobs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { JobStatus, JobPriority } from "@prisma/client";

interface Params {
  params: { id: string };
}


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
  company,
  role,
  url,
  status,
  priority,
  dateApplied,
  notes,
  tags,
  oaDeadline,
  interviewDate,
  reminderDaysBefore,
} = body as {
  company?: string;
  role?: string;
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

    // Ensure the job belongs to this user
    const existing = await prisma.jobApplication.findFirst({
      where: { id: jobId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data: any = {};
    if (company !== undefined) data.company = company;
    if (role !== undefined) data.role = role;
    if (url !== undefined) data.url = url || null;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (notes !== undefined) data.notes = notes || null;
    if (tags !== undefined) data.tags = tags;
    if (dateApplied !== undefined && !Number.isNaN(Date.parse(dateApplied))) {
      data.dateApplied = new Date(dateApplied);
    }
    if (oaDeadline !== undefined) {
  data.oaDeadline = oaDeadline ? new Date(oaDeadline) : null;
}
if (interviewDate !== undefined) {
  data.interviewDate = interviewDate ? new Date(interviewDate) : null;
}
if (reminderDaysBefore !== undefined) {
  data.reminderDaysBefore = reminderDaysBefore;
}

    const updated = await prisma.jobApplication.update({
      where: { id: jobId }, // ✅ only the unique field
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  try {
    // Ensure it belongs to this user
    const existing = await prisma.jobApplication.findFirst({
      where: { id: jobId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await prisma.jobApplication.delete({
      where: { id: jobId }, // ✅ only id here
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
