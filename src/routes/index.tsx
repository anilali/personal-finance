import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, TrendingUp, ArrowRight } from "lucide-react";

const utilities = [
  {
    to: "/tax-estimator",
    title: "Tax Estimator",
    description:
      "Estimate your federal and state taxes with a guided, step-by-step wizard.",
    icon: Calculator,
    tag: "Finance",
    search: { step: "list" as const },
  },
  {
    to: "/equity-tracker",
    title: "Equity Tracker",
    description:
      "Track your stock options, RSUs, and equity grants across vesting schedules.",
    icon: TrendingUp,
    tag: "Equity",
    search: undefined,
  },
] as const;

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      {/* Hero */}
      <div className="relative mb-12">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
          Personal Finance
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Tools that help you{" "}
          <span className="text-gradient">plan smarter</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          A collection of personal finance utilities to help you make informed
          decisions about taxes, investments, and more.
        </p>
      </div>

      {/* Utility cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {utilities.map((util) => (
          <Link
            key={util.to}
            to={util.to}
            search={util.search as any}
            className="group relative rounded-xl border border-border bg-white p-6 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-accent shadow-sm">
                <util.icon className="size-5 text-white" />
              </div>
              <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {util.tag}
              </span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">{util.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {util.description}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Get started
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
