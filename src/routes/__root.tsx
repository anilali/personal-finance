/// <reference types="vite/client" />
import { createRootRoute, Outlet, HeadContent, Scripts } from "@tanstack/react-router";
import { AppNav } from "@/components/app-nav";
import { Toaster } from "@/components/ui/sonner";
import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PF Tools" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="relative min-h-screen bg-slate-50/50">
          <AppNav />
          <main className="relative container mx-auto px-6 py-10">
            <Outlet />
          </main>
        </div>
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
