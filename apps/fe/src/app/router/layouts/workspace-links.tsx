import { Activity, ChessPawn } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/shared/lib/cn";

const workspaceLinks = [
  { to: "/students/demo-student", label: "Students", icon: ChessPawn },
  { to: "/activity", label: "Activity", icon: Activity },
] as const;

type WorkspaceLinksProps = {
  className?: string;
  linkClassName?: string;
};

export function WorkspaceLinks({
  className,
  linkClassName,
}: WorkspaceLinksProps) {
  return (
    <nav className={cn("space-y-2", className)} aria-label="Primary">
      {workspaceLinks.map((link) => {
        const Icon = link.icon;

        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-nav-active text-nav-active-foreground"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
                linkClassName,
              )
            }
          >
            <Icon aria-hidden="true" className="size-[1.05rem] shrink-0" />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
