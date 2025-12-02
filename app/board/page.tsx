// app/board/page.tsx
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import BoardClient from "./BoardClient";

export default async function BoardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    redirect("/");
  }

  const jobs = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const serialized = jobs.map((j) => ({
    id: j.id,
    company: j.company,
    role: j.role,
    status: j.status,
    priority: j.priority,
    dateApplied: j.dateApplied.toISOString(),
    oaDeadline: j.oaDeadline?.toISOString() ?? null,
    interviewDate: j.interviewDate?.toISOString() ?? null,
    tags: j.tags,
  }));

  return (
    <main className="min-h-screen pb-20">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 relative z-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-display gradient-text">
            Kanban Board
          </h1>
          <p className="text-slate-400">
            Drag and drop cards to update application status
          </p>
        </div>
        <BoardClient jobs={serialized} />
      </div>
    </main>
  );
}
