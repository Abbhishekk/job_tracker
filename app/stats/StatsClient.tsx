// app/stats/StatsClient.tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type JobStatus =
  | "applied"
  | "shortlisted"
  | "oa_assigned"
  | "interview"
  | "selected"
  | "rejected";

type JobPriority = "low" | "medium" | "high";

interface ApplicationLite {
  id: string;
  status: JobStatus;
  priority: JobPriority;
  dateApplied: string; // ISO
  createdAt: string; // ISO
}

export default function StatsClient({
  applications,
}: {
  applications: ApplicationLite[];
}) {
  // ---- Applications per week (last 8 weeks) ----
  const now = new Date();
  const weeks: { label: string; count: number }[] = [];

  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const weekLabel = `${d.getFullYear()}-W${getWeekNumber(d)}`;
    weeks.push({ label: weekLabel, count: 0 });
  }

  applications.forEach((app) => {
    const d = new Date(app.dateApplied);
    const label = `${d.getFullYear()}-W${getWeekNumber(d)}`;
    const target = weeks.find((w) => w.label === label);
    if (target) target.count += 1;
  });

  // ---- Offer rate ----
  const total = applications.length;
  const offers = applications.filter((a) => a.status === "selected").length;
  const rejections = applications.filter((a) => a.status === "rejected").length;

  const offerRate = total ? Math.round((offers / total) * 100) : 0;
  const rejectionRate = total ? Math.round((rejections / total) * 100) : 0;

  // ---- Status distribution ----
  const statusCounts: Record<JobStatus, number> = {
    applied: 0,
    shortlisted: 0,
    oa_assigned: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
  };

  applications.forEach((a) => {
    statusCounts[a.status] += 1;
  });

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  const statusLabelMap: Record<JobStatus, string> = {
    applied: "Applied",
    shortlisted: "Shortlisted",
    oa_assigned: "OA Assigned",
    interview: "Interview",
    selected: "Selected",
    rejected: "Rejected",
  };

  const colors = [
    "#38bdf8",
    "#a855f7",
    "#f97316",
    "#22c55e",
    "#ef4444",
    "#eab308",
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card title="Total Applications" value={total.toString()} />
        <Card title="Offer Rate" value={`${offerRate}%`} />
        <Card title="Rejection Rate" value={`${rejectionRate}%`} />
      </section>

      {/* Applications per week */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold font-display gradient-text">Applications per Week</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Status distribution */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold font-display gradient-text">Status Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  label={(entry: any) =>
                    `${statusLabelMap[entry.status as JobStatus]}`
                  }
                >
                  {statusData.map((entry, index) => (
                    <Cell key={entry.status} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline / cumulative line */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold font-display gradient-text">Cumulative Applications</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buildCumulativeData(applications)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function getWeekNumber(d: Date): number {
  // simple ISO-ish week calc
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function buildCumulativeData(apps: ApplicationLite[]) {
  const sorted = [...apps].sort(
    (a, b) =>
      new Date(a.dateApplied).getTime() - new Date(b.dateApplied).getTime()
  );
  let count = 0;
  const map = new Map<string, number>();

  sorted.forEach((a) => {
    const date = a.dateApplied.slice(0, 10);
    count += 1;
    map.set(date, count);
  });

  return Array.from(map.entries()).map(([date, c]) => ({
    date,
    count: c,
  }));
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="stat-card glass-card glass-card-hover rounded-2xl px-6 py-4">
      <div className="text-sm text-slate-400 font-medium">{title}</div>
      <div className="mt-2 text-3xl font-bold font-display gradient-text">{value}</div>
    </div>
  );
}
