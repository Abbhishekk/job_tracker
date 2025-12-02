"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Briefcase,
  Target,
  TrendingUp,
  Sparkles,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";

type JobStatus =
  | "applied"
  | "shortlisted"
  | "oa_assigned"
  | "interview"
  | "selected"
  | "rejected";

type JobPriority = "low" | "medium" | "high";

interface JobApplication {
  id: string;
  company: string;
  role: string;
  url?: string | null;
  status: JobStatus;
  priority: JobPriority;
  dateApplied: string;
  notes?: string | null;
  tags: string[];
  oaDeadline?: string | null;
  interviewDate?: string | null;
  reminderDaysBefore?: number | null;
  createdAt: string;
  lastUpdated: string;
}

const STATUS_LABELS: Record<JobStatus, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  oa_assigned: "OA Assigned",
  interview: "Interview",
  selected: "Selected",
  rejected: "Rejected",
};

const PRIORITY_LABELS: Record<JobPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  applied: "bg-blue-100 text-blue-800",
  shortlisted: "bg-amber-100 text-amber-800",
  oa_assigned: "bg-purple-100 text-purple-800",
  interview: "bg-indigo-100 text-indigo-800",
  selected: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

function exportJobsToCSV(jobs: JobApplication[]) {
  if (!jobs.length) {
    alert("No jobs to export.");
    return;
  }

  const headers = [
    "Company",
    "Role",
    "Status",
    "Priority",
    "DateApplied",
    "OADeadline",
    "InterviewDate",
    "Tags",
    "Notes",
    "CreatedAt",
    "LastUpdated",
    "URL",
  ];

  const rows = jobs.map((j) => [
    j.company,
    j.role,
    j.status,
    j.priority,
    j.dateApplied.slice(0, 10),
    j.oaDeadline ? j.oaDeadline.slice(0, 10) : "",
    j.interviewDate ? j.interviewDate.slice(0, 10) : "",
    j.tags?.join("; ") ?? "",
    j.notes ?? "",
    j.createdAt.slice(0, 10),
    j.lastUpdated.slice(0, 10),
    j.url ?? "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `job_applications_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function JobTrackerPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status: authStatus } = useSession();

  // filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<JobStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<JobPriority | "all">(
    "all"
  );

  // form state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<JobStatus>("applied");
  const [priority, setPriority] = useState<JobPriority>("medium");
  const [dateApplied, setDateApplied] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [oaDeadline, setOaDeadline] = useState<string>("");
  const [interviewDate, setInterviewDate] = useState<string>("");
  const [reminderDaysBefore, setReminderDaysBefore] = useState<string>("2");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // ───────────────────────────── fetch data ─────────────────────────────
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fetchJobs = async () => {
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = (await res.json()) as JobApplication[];
        setJobs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [authStatus]);

  // ───────────────────────────── derived stats ─────────────────────────────
  const stats = useMemo(() => {
    const base: Record<JobStatus, number> = {
      applied: 0,
      shortlisted: 0,
      oa_assigned: 0,
      interview: 0,
      selected: 0,
      rejected: 0,
    };
    jobs.forEach((job) => {
      base[job.status] += 1;
    });
    return base;
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    return jobs
      .filter((job) =>
        filterStatus === "all" ? true : job.status === filterStatus
      )
      .filter((job) =>
        filterPriority === "all" ? true : job.priority === filterPriority
      )
      .filter((job) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          job.company.toLowerCase().includes(q) ||
          job.role.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime()
      );
  }, [jobs, filterStatus, filterPriority, search]);

  // ───────────────────────────── upcoming reminders ─────────────────────────────
  const upcoming = useMemo(() => {
    const now = new Date();
    return jobs
      .map((job) => {
        const reminderDays = job.reminderDaysBefore ?? 2;
        const deadlines: { label: string; date: Date }[] = [];

        if (job.oaDeadline && !Number.isNaN(Date.parse(job.oaDeadline))) {
          deadlines.push({ label: "OA", date: new Date(job.oaDeadline) });
        }
        if (
          job.interviewDate &&
          !Number.isNaN(Date.parse(job.interviewDate))
        ) {
          deadlines.push({
            label: "Interview",
            date: new Date(job.interviewDate),
          });
        }

        const entries = deadlines
          .map((d) => {
            const diffDays = Math.ceil(
              (d.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            return { ...d, diffDays };
          })
          .filter((d) => d.diffDays <= reminderDays && d.diffDays >= -1);

        if (entries.length === 0) return null;
        return { job, entries };
      })
      .filter(Boolean) as {
      job: JobApplication;
      entries: { label: string; date: Date; diffDays: number }[];
    }[];
  }, [jobs]);

  // ───────────────────────────── helpers ─────────────────────────────
  const resetForm = () => {
    setCompany("");
    setRole("");
    setUrl("");
    setStatus("applied");
    setPriority("medium");
    setDateApplied(new Date().toISOString().slice(0, 10));
    setNotes("");
    setTagsInput("");
    setOaDeadline("");
    setInterviewDate("");
    setReminderDaysBefore("2");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const reminderDays =
      reminderDaysBefore.trim() === "" ? null : Number(reminderDaysBefore) || null;

    try {
      if (editingId) {
        const res = await fetch(`/api/jobs/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: company.trim(),
            role: role.trim(),
            url: url.trim() || null,
            status,
            priority,
            dateApplied,
            notes: notes.trim() || null,
            tags,
            oaDeadline: oaDeadline || null,
            interviewDate: interviewDate || null,
            reminderDaysBefore: reminderDays,
          }),
        });

        if (!res.ok) throw new Error("Failed to update job");
        const updated = (await res.json()) as JobApplication;

        setJobs((prev) =>
          prev.map((j) => (j.id === updated.id ? updated : j))
        );
      } else {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: company.trim(),
            role: role.trim(),
            url: url.trim() || null,
            status,
            priority,
            dateApplied,
            notes: notes.trim() || null,
            tags,
            oaDeadline: oaDeadline || null,
            interviewDate: interviewDate || null,
            reminderDaysBefore: reminderDays,
          }),
        });

        if (!res.ok) throw new Error("Failed to create job");
        const created = (await res.json()) as JobApplication;
        setJobs((prev) => [created, ...prev]);
      }

      resetForm();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Check console for details.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this job?")) return;

    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete job.");
    }
  };

  const handleEdit = (job: JobApplication) => {
    setEditingId(job.id);
    setCompany(job.company);
    setRole(job.role);
    setUrl(job.url || "");
    setStatus(job.status);
    setPriority(job.priority);
    setDateApplied(job.dateApplied.slice(0, 10));
    setNotes(job.notes || "");
    setOaDeadline(job.oaDeadline ? job.oaDeadline.slice(0, 10) : "");
    setInterviewDate(
      job.interviewDate ? job.interviewDate.slice(0, 10) : ""
    );
    setReminderDaysBefore(
      job.reminderDaysBefore != null ? String(job.reminderDaysBefore) : "2"
    );
    setTagsInput(job.tags?.join(", ") ?? "");
    setShowForm(true);
  };

  const handleStatusChange = async (id: string, newStatus: JobStatus) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = (await res.json()) as JobApplication;
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  // ───────────────────────────── auth states ─────────────────────────────
  if (authStatus === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" />
          <p className="text-sm text-slate-300">Loading your data...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600/10 text-sky-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Career Compass
            </h1>
            <p className="text-sm text-slate-400">
              Sign in to start tracking your job applications and stay on top of
              deadlines.
            </p>
          </div>
          <button
            onClick={() => signIn("github")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            <Sparkles className="h-4 w-4" />
            Continue with GitHub
          </button>
        </div>
      </main>
    );
  }

  // ───────────────────────────── main UI ─────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Top bar */}
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Career Compass
            </h1>
            <p className="text-sm text-slate-400">
              Welcome back,{" "}
              <span className="font-medium text-slate-100">
                {session.user?.name ?? session.user?.email}
              </span>
              .
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportJobsToCSV(jobs)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Optional nav (stats / board / list) */}
        <Navigation />

        {/* Stats */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Applications"
            value={jobs.length}
            icon={Briefcase}
            color="primary"
          />
          <StatCard
            title="In Progress"
            value={
              stats.applied +
              stats.shortlisted +
              stats.oa_assigned +
              stats.interview
            }
            icon={Target}
            color="accent"
          />
          <StatCard
            title="Offers Received"
            value={stats.selected}
            icon={Sparkles}
            color="success"
          />
          <StatCard
            title="Success Rate"
            value={
              jobs.length > 0
                ? `${Math.round((stats.selected / jobs.length) * 100)}%`
                : "0%"
            }
            icon={TrendingUp}
            color="purple"
          />
        </section>

        {/* Upcoming deadlines */}
        {upcoming.length > 0 && (
          <section className="rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-medium text-amber-50">
                Upcoming deadlines
              </h2>
            </div>
            <div className="space-y-1 text-xs text-amber-100">
              {upcoming.map(({ job, entries }) => (
                <div key={job.id} className="flex flex-wrap gap-2">
                  <span className="font-medium">{job.company}</span>
                  <span className="text-amber-300/70">·</span>
                  <span>{job.role}</span>
                  {entries.map((e, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-amber-500/20 px-2 py-[2px]"
                    >
                      {e.label} in {e.diffDays} days
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Toolbar */}
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" />
              Add application
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
                placeholder="Search company or role"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Priority filter */}
            <select
              className="w-full md:w-auto rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
              value={filterPriority}
              onChange={(e) =>
                setFilterPriority(
                  e.target.value === "all"
                    ? "all"
                    : (e.target.value as JobPriority)
                )
              }
            >
              <option value="all">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </div>
        </section>

        {/* Status filter pills */}
        <section className="flex flex-wrap gap-2">
          <button
            className={`rounded-full px-3 py-1 text-xs ${
              filterStatus === "all"
                ? "bg-sky-600 text-white"
                : "border border-slate-700 bg-slate-900 text-slate-200"
            }`}
            onClick={() => setFilterStatus("all")}
          >
            All ({jobs.length})
          </button>
          {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
            <button
              key={s}
              className={`rounded-full px-3 py-1 text-xs ${
                filterStatus === s
                  ? `${STATUS_COLORS[s]} border border-transparent`
                  : "border border-slate-700 bg-slate-900 text-slate-200"
              }`}
              onClick={() => setFilterStatus(s)}
            >
              {STATUS_LABELS[s]} ({stats[s]})
            </button>
          ))}
        </section>

        {/* Add / edit form */}
        {showForm && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {editingId ? "Edit application" : "New application"}
              </h2>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-100"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
            >
              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Company <span className="text-rose-400">*</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Role <span className="text-rose-400">*</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Job URL</label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Status</label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as JobStatus)}
                >
                  {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Priority</label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as JobPriority)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Date applied</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={dateApplied}
                  onChange={(e) => setDateApplied(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  OA deadline (optional)
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={oaDeadline}
                  onChange={(e) => setOaDeadline(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Interview date (optional)
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Remind me (days before)
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={reminderDaysBefore}
                  onChange={(e) => setReminderDaysBefore(e.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <label className="text-xs text-slate-300">
                  Tags{" "}
                  <span className="text-[10px] text-slate-500">
                    (comma separated)
                  </span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="frontend, remote, startup"
                />
              </div>

              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <label className="text-xs text-slate-300">Notes</label>
                <textarea
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any details, interview feedback, etc."
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  {editingId ? "Save changes" : "Add application"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Jobs list */}
        <section className="rounded-xl border border-slate-800 bg-slate-900">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              Loading applications...
            </div>
          ) : visibleJobs.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Start adding your job applications to see them here."
              action={{
                label: "Add your first application",
                onClick: () => setShowForm(true),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Tags</th>
                    <th className="px-4 py-3 text-left">Applied</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-slate-800 last:border-0 hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-100">
                            {job.company}
                          </span>
                          {job.url && (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
                            >
                              View job
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {job.notes && (
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {job.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-200">
                        {job.role}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <select
                          value={job.status}
                          onChange={(e) =>
                            handleStatusChange(
                              job.id,
                              e.target.value as JobStatus
                            )
                          }
                          className={`rounded-full px-2 py-1 text-xs font-medium border border-transparent ${STATUS_COLORS[job.status]} outline-none`}
                        >
                          {(Object.keys(STATUS_LABELS) as JobStatus[]).map(
                            (s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-[2px] text-xs font-medium ${
                            job.priority === "high"
                              ? "bg-rose-100 text-rose-700"
                              : job.priority === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {PRIORITY_LABELS[job.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {job.tags && job.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {job.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-slate-800 px-2 py-[2px] text-[11px] text-slate-100"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-300">
                        {job.dateApplied.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={() => handleEdit(job)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-800"
                          >
                            <Edit2 className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-700 px-2 py-1 text-rose-300 hover:bg-rose-900/40"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
