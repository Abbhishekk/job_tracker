// app/stats/page.tsx
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import StatsClient from "./StatsClient";

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    redirect("/"); // or /signin page if you create one
  }

  const apps = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: { dateApplied: "asc" },
  });

  const serialized = apps.map((a) => ({
    id: a.id,
    status: a.status,
    priority: a.priority,
    dateApplied: a.dateApplied.toISOString(),
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen pb-20">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 relative z-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-display gradient-text">
            Analytics & Insights
          </h1>
          <p className="text-slate-400">
            Track your progress and visualize your job search journey
          </p>
        </div>
        <StatsClient applications={serialized} />
      </div>
    </main>
  );
}
