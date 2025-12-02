"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, BarChart, LayoutGrid, Sparkles } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Applications", icon: Briefcase },
    { href: "/board", label: "Board", icon: LayoutGrid },
    { href: "/stats", label: "Stats", icon: BarChart },
  ];

  return (
    <nav className="glass-card rounded-2xl p-1.5 flex gap-1.5 shadow-lg">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              relative flex items-center gap-2.5 px-5 py-3 rounded-xl
              font-semibold text-sm transition-all duration-300 font-display
              ${
                isActive
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span>{link.label}</span>
            {isActive && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-600/20 blur-xl -z-10" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}