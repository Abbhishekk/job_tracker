// app/board/BoardClient.tsx
"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useMemo, useState } from "react";

type JobStatus =
  | "applied"
  | "shortlisted"
  | "oa_assigned"
  | "interview"
  | "selected"
  | "rejected";

type JobPriority = "low" | "medium" | "high";

interface BoardJob {
  id: string;
  company: string;
  role: string;
  status: JobStatus;
  priority: JobPriority;
  dateApplied: string;
  oaDeadline: string | null;
  interviewDate: string | null;
  tags: string[];
}

const STATUS_ORDER: JobStatus[] = [
  "applied",
  "shortlisted",
  "oa_assigned",
  "interview",
  "selected",
  "rejected",
];

const STATUS_LABELS: Record<JobStatus, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  oa_assigned: "OA Assigned",
  interview: "Interview",
  selected: "Selected",
  rejected: "Rejected",
};

const COLUMN_COLORS: Record<JobStatus, string> = {
  applied: "border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-transparent",
  shortlisted: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent",
  oa_assigned: "border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent",
  interview: "border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-transparent",
  selected: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent",
  rejected: "border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent",
};

export default function BoardClient({ jobs }: { jobs: BoardJob[] }) {
  const [boardJobs, setBoardJobs] = useState<BoardJob[]>(jobs);

  const columns = useMemo(() => {
    const map: Record<JobStatus, BoardJob[]> = {
      applied: [],
      shortlisted: [],
      oa_assigned: [],
      interview: [],
      selected: [],
      rejected: [],
    };
    boardJobs.forEach((job) => {
      map[job.status].push(job);
    });
    // optional: sort inside column by dateApplied
    STATUS_ORDER.forEach((s) =>
      map[s].sort(
        (a, b) =>
          new Date(a.dateApplied).getTime() - new Date(b.dateApplied).getTime()
      )
    );
    return map;
  }, [boardJobs]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as JobStatus;
    const destStatus = destination.droppableId as JobStatus;

    // optimistic UI update
    setBoardJobs((prev) =>
      prev.map((job) =>
        job.id === draggableId ? { ...job, status: destStatus } : job
      )
    );

    // persist to backend
    try {
      const res = await fetch(`/api/jobs/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch (err) {
      console.error(err);
      // revert if needed: here we just log, but you could re-fetch.
      alert("Failed to update status on server.");
      setBoardJobs((prev) =>
        prev.map((job) =>
          job.id === draggableId ? { ...job, status: sourceStatus } : job
        )
      );
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => {
          const items = columns[status];
          return (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex min-w-[280px] max-w-sm flex-1 flex-col rounded-2xl border glass-card px-4 py-4 text-sm ${
                    COLUMN_COLORS[status]
                  } ${
                    snapshot.isDraggingOver
                      ? "ring-2 ring-primary/60 scale-105"
                      : "ring-0"
                  } transition-all duration-300`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold text-sm uppercase tracking-wide text-slate-100 font-display">
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((job, index) => (
                      <Draggable
                        key={job.id}
                        draggableId={job.id}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`rounded-xl glass-card p-4 shadow-lg border border-white/10 space-y-2 transition-all duration-200 hover:border-primary/30 ${
                              dragSnapshot.isDragging
                                ? "ring-2 ring-primary shadow-2xl shadow-primary/50 scale-105"
                                : ""
                            }`}
                          >
                            <div className="text-sm font-semibold font-display">
                              {job.company}
                            </div>
                            <div className="text-xs text-slate-300">
                              {job.role}
                            </div>

                            {/* priority pill */}
                            <PriorityPill priority={job.priority} />

                            {/* tags */}
                            {job.tags && job.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {job.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="rounded-full bg-slate-800 px-2 py-[1px] text-[10px] text-slate-200"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* deadlines */}
                            <DeadlineRow job={job} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}

function PriorityPill({ priority }: { priority: JobPriority }) {
  const label =
    priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low";
  const classes =
    priority === "high"
      ? "bg-rose-500/20 text-rose-200"
      : priority === "medium"
      ? "bg-amber-500/20 text-amber-200"
      : "bg-emerald-500/20 text-emerald-200";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-[2px] text-[10px] font-medium ${classes}`}
    >
      {label} priority
    </span>
  );
}

function DeadlineRow({ job }: { job: BoardJob }) {
  const now = new Date();
  const warnDays = (target: Date) =>
    Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const oa =
    job.oaDeadline && !Number.isNaN(Date.parse(job.oaDeadline))
      ? new Date(job.oaDeadline)
      : null;
  const interview =
    job.interviewDate && !Number.isNaN(Date.parse(job.interviewDate))
      ? new Date(job.interviewDate)
      : null;

  if (!oa && !interview) return null;

  return (
    <div className="mt-1 space-y-1 text-[10px]">
      {oa && (
        <DeadlineBadge
          label="OA"
          date={oa}
          daysLeft={warnDays(oa)}
        />
      )}
      {interview && (
        <DeadlineBadge
          label="Interview"
          date={interview}
          daysLeft={warnDays(interview)}
        />
      )}
    </div>
  );
}

function DeadlineBadge({
  label,
  date,
  daysLeft,
}: {
  label: string;
  date: Date;
  daysLeft: number;
}) {
  const dateStr = date.toISOString().slice(0, 10);
  let color = "bg-slate-800 text-slate-200";
  if (daysLeft <= 0) {
    color = "bg-rose-600/80 text-white";
  } else if (daysLeft <= 2) {
    color = "bg-amber-500/80 text-black";
  } else if (daysLeft <= 7) {
    color = "bg-sky-500/80 text-black";
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[2px] ${color}`}>
      <span>{label} by {dateStr}</span>
      <span>({daysLeft}d)</span>
    </span>
  );
}
