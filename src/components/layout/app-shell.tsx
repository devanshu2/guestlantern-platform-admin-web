"use client";

import { Activity, ClipboardList, FileClock, Gauge, LogOut, Search, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { logout } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { BrandMark } from "@/components/ui/brand-mark";
import { LoadingState } from "@/components/ui/data-state";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/provision", label: "Provision", icon: Store },
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/audit", label: "Audit", icon: FileClock }
];

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, loading, error } = useAuth();

  async function onLogout() {
    try {
      await logout();
    } catch (err) {
      console.error(errorMessage(err));
    } finally {
      router.replace("/login");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-md">
          <LoadingState>Loading platform admin session...</LoadingState>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-surface-raised lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-line p-4">
            <BrandMark />
          </div>
          <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-brand bg-brand-soft text-brand shadow-control"
                      : "border-transparent text-muted hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-3 border-t border-line p-3">
            <ThemeSwitcher compact />
            <div className="rounded-lg border border-line bg-surface-muted p-3">
              <p className="text-sm font-medium text-ink">{admin?.display_name ?? "Operator"}</p>
              <p className="truncate text-xs text-muted">{admin?.email}</p>
              <p className="mt-1 text-xs text-muted">Role: {admin?.role ?? "unknown"}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              icon={<LogOut aria-hidden className="h-4 w-4" />}
              className="w-full"
              onClick={onLogout}
            >
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/95 shadow-control backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <BrandMark compact />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Control Plane
                </p>
                <h1 className="text-lg font-semibold text-ink">Platform operations</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-muted sm:block lg:hidden">
                <span className="block font-medium text-ink">
                  {admin?.display_name ?? "Operator"}
                </span>
                <span className="block max-w-48 truncate">{admin?.email}</span>
              </div>
              <div className="lg:hidden">
                <ThemeSwitcher compact />
              </div>
              <Button
                type="button"
                variant="secondary"
                icon={<LogOut aria-hidden className="h-4 w-4" />}
                className="lg:hidden"
                onClick={onLogout}
              >
                Sign out
              </Button>
              <Link
                href="/dashboard#lookup"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-surface-raised px-3 py-2 text-sm font-semibold text-ink shadow-control hover:bg-surface-muted"
              >
                <Search aria-hidden className="h-4 w-4" />
                Restaurant lookup
              </Link>
              <Link
                href="/jobs"
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-on-brand shadow-control hover:bg-brand-strong"
              >
                <Activity aria-hidden className="h-4 w-4" />
                Monitor jobs
              </Link>
            </div>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto border-t border-line px-2 py-2 lg:hidden"
            aria-label="Mobile navigation"
          >
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                    active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-muted"
                  }`}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main id="main-content" className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
          {error ? (
            <Alert tone="danger" title="Session check failed">
              {error}
            </Alert>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}
