import { OrderSource, OrderStatus } from "@/types";
import { MessageSquare, Instagram, Facebook, Phone, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrderSourceBadge({ source }: { source: string }) {
  const config: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: any }
  > = {
    WHATSAPP: {
      label: "WhatsApp",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      icon: MessageSquare,
    },
    INSTAGRAM: {
      label: "Instagram",
      bg: "bg-pink-500/10",
      text: "text-pink-400",
      border: "border-pink-500/20",
      icon: Instagram,
    },
    FACEBOOK: {
      label: "Facebook",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/20",
      icon: Facebook,
    },
    PHONE: {
      label: "Phone",
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
      border: "border-indigo-500/20",
      icon: Phone,
    },
    WALK_IN: {
      label: "Walk-in",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
      icon: Footprints,
    },
  };

  const current = config[source.toUpperCase()] || {
    label: source,
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    icon: Phone,
  };

  const Icon = current.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm",
        current.bg,
        current.text,
        current.border
      )}
    >
      <Icon className="h-3 w-3" />
      {current.label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    ORDERED: {
      label: "Ordered",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/20",
    },
    PROCESSING: {
      label: "Processing",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
    },
    SHIPPED: {
      label: "Shipped",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/20",
    },
    DELIVERED: {
      label: "Delivered",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    CANCELLED: {
      label: "Cancelled",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/20",
    },
  };

  const current = config[status.toUpperCase()] || {
    label: status,
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm",
        current.bg,
        current.text,
        current.border
      )}
    >
      {current.label}
    </span>
  );
}
