import { CircleCheck, CircleX, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PolicyDecision } from "@/lib/policy";

const statusConfig = {
  allowed: {
    label: "Allowed",
    icon: CircleCheck,
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  review: {
    label: "Needs approval",
    icon: Clock3,
    className: "border-amber-500/30 bg-amber-50 text-amber-800",
  },
  blocked: {
    label: "Blocked",
    icon: CircleX,
    className: "border-red-500/30 bg-red-50 text-red-700",
  },
};

export function DecisionBadge({ status }: { status: PolicyDecision["status"] }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("h-6", config.className)}>
      <Icon data-icon="inline-start" />
      {config.label}
    </Badge>
  );
}
