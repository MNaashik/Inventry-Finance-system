import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  glowColor?: "primary" | "emerald" | "amber" | "rose" | "indigo";
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  glowColor = "primary",
}: StatsCardProps) {
  const glowStyles = {
    primary: "border-primary/20 hover:border-primary/40 shadow-primary/5",
    emerald: "border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5",
    amber: "border-amber-500/20 hover:border-amber-500/40 shadow-amber-500/5",
    rose: "border-rose-500/20 hover:border-rose-500/40 shadow-rose-500/5",
    indigo: "border-indigo-500/20 hover:border-indigo-500/40 shadow-indigo-500/5",
  };

  const textGlowStyles = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    rose: "text-rose-400 bg-rose-500/10",
    indigo: "text-indigo-400 bg-indigo-500/10",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-slate-900/40 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 shadow-xl",
        glowStyles[glowColor]
      )}
    >
      {/* Decorative background glow */}
      <div
        className={cn(
          "absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl opacity-20",
          glowColor === "primary" && "bg-primary",
          glowColor === "emerald" && "bg-emerald-500",
          glowColor === "amber" && "bg-amber-500",
          glowColor === "rose" && "bg-rose-500",
          glowColor === "indigo" && "bg-indigo-500"
        )}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", textGlowStyles[glowColor])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-3xl font-bold tracking-tight text-white">{value}</h3>

        {(description || trend) && (
          <div className="mt-2 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  trend.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                )}
              >
                {trend.value}
              </span>
            )}
            {description && <span className="text-xs text-slate-400">{description}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
