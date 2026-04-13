import type { ReactNode } from "react";

interface EquityLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function EquityLayout({ sidebar, children }: EquityLayoutProps) {
  return (
    <div className="flex gap-6">
      <aside className="w-72 shrink-0">
        <div className="sticky top-20 space-y-4">{sidebar}</div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
