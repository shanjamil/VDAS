import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

export const Logo = ({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand shadow-glow-cyan">
      <Car className="h-4 w-4 text-white" strokeWidth={2.5} />
    </div>
    {!iconOnly && (
      <span className="text-lg font-bold tracking-tight gradient-text">V-DAS</span>
    )}
  </div>
);
