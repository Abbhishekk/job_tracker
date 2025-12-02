"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export default function StatCard({ title, value, icon: Icon, trend, color = "primary" }: StatCardProps) {
  const colorClasses = {
    primary: "from-blue-500/10 via-blue-600/5 to-transparent border-blue-500/20",
    success: "from-green-500/10 via-green-600/5 to-transparent border-green-500/20",
    accent: "from-cyan-500/10 via-cyan-600/5 to-transparent border-cyan-500/20",
    purple: "from-purple-500/10 via-purple-600/5 to-transparent border-purple-500/20",
    amber: "from-amber-500/10 via-amber-600/5 to-transparent border-amber-500/20",
    rose: "from-rose-500/10 via-rose-600/5 to-transparent border-rose-500/20",
  };

  const iconBgClasses = {
    primary: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
    success: "bg-gradient-to-br from-green-500/20 to-green-600/10",
    accent: "bg-gradient-to-br from-cyan-500/20 to-cyan-600/10",
    purple: "bg-gradient-to-br from-purple-500/20 to-purple-600/10",
    amber: "bg-gradient-to-br from-amber-500/20 to-amber-600/10",
    rose: "bg-gradient-to-br from-rose-500/20 to-rose-600/10",
  };

  const iconColorClasses = {
    primary: "text-blue-400",
    success: "text-green-400",
    accent: "text-cyan-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };

  return (
    <div className={`stat-card glass-card glass-card-hover rounded-2xl p-6 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary} shadow-xl`}>
      <div className="flex items-start justify-between mb-5">
        <div className={`p-3.5 rounded-xl ${iconBgClasses[color as keyof typeof iconBgClasses] || iconBgClasses.primary} shadow-lg`}>
          <Icon className={`w-6 h-6 ${iconColorClasses[color as keyof typeof iconColorClasses] || iconColorClasses.primary}`} />
        </div>
        {trend && (
          <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            trend.isPositive 
              ? "bg-green-500/20 text-green-300 border border-green-500/30" 
              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
          }`}>
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-400 font-medium tracking-wide">{title}</p>
        <p className="text-4xl font-bold font-display text-white">{value}</p>
      </div>
    </div>
  );
}