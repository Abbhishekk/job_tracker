"use client";

import { Rocket } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-10 floating">
        <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full" />
        <div className="relative glass-card rounded-3xl p-10 shadow-2xl">
          <Rocket className="w-20 h-20 text-blue-400" />
        </div>
      </div>
      <h3 className="text-3xl font-bold font-display mb-3 text-white text-shadow">{title}</h3>
      <p className="text-slate-300 text-center max-w-md mb-8 text-lg">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary px-8 py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 hover:scale-105"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}