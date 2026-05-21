/// <reference types="vite/client" />
import { createRootRoute, Outlet, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { ArrowLeft } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
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
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </Button>
    </div>
  );
}

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="relative min-h-screen bg-page">
            <AppNav />
            <main className="relative container mx-auto px-6 py-10">
              <Outlet />
            </main>
          </div>
          <Toaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
