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
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  blocked: {
    label: "Blocked",
    icon: CircleX,
    className: "border-red-400/30 bg-red-400/10 text-red-300",
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
