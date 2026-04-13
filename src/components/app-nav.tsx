import { Link, useRouterState } from "@tanstack/react-router";
import { Calculator, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Home, search: undefined },
  { to: "/tax-estimator", label: "Tax Estimator", icon: Calculator, search: { step: "list" as const } },
] as const;

export function AppNav() {
  const { location } = useRouterState();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-accent">
            <Sparkles className="size-3.5 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">PF Tools</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                search={item.search as any}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
