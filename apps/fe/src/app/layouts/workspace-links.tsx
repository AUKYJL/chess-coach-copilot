import { Link } from "@tanstack/react-router";
import { Activity, ChessPawn } from "lucide-react";

import { cn } from "@/shared/lib/cn";

const workspaceLinks = [
  {
    to: "/students",
    label: "Students",
    exact: false,
  },
  {
    to: "/activity",
    label: "Activity",
    exact: true,
  },
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
        const Icon = link.to === "/students" ? ChessPawn : Activity;

        return (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{
              exact: link.exact ?? false,
            }}
            activeProps={{
              className: "bg-nav-active text-nav-active-foreground",
            }}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-surface hover:text-foreground",
              linkClassName,
            )}
          >
            <Icon aria-hidden="true" className="size-[1.05rem] shrink-0" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
