"use client";

import {
  Activity,
  ClipboardList,
  FileClock,
  Gauge,
  LogOut,
  Search,
  ShieldCheck,
  Store
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { logout } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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
      <main className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="panel max-w-md p-5 text-sm text-muted" role="status">
          Loading platform admin session...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-line p-4">
            <div className="flex items-center gap-2 text-base font-semibold text-ink">
              <ShieldCheck aria-hidden className="h-5 w-5 text-brand" />
              GuestLantern
            </div>
            <p className="mt-1 text-xs text-muted">Platform Admin Console</p>
          </div>
          <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-50 text-brand"
                      : "text-slate-700 hover:bg-slate-100 hover:text-ink"
                  }`}
                  style={{ borderRadius: 6 }}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-line p-3">
            <div className="mb-3 rounded-md bg-slate-50 p-3">
              <p className="text-sm font-medium text-ink">{admin?.display_name ?? "Operator"}</p>
              <p className="truncate text-xs text-muted">{admin?.email}</p>
              <p className="mt-1 text-xs text-muted">Role: {admin?.role ?? "unknown"}</p>
            </div>
            <Button type="button" variant="secondary" icon={<LogOut aria-hidden className="h-4 w-4" />} className="w-full" onClick={onLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Control Plane</p>
              <h1 className="text-lg font-semibold text-ink">Platform operations</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard#lookup"
                className="inline-flex min-h-10 items-center gap-2 border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-slate-50"
                style={{ borderRadius: 6 }}
              >
                <Search aria-hidden className="h-4 w-4" />
                Restaurant lookup
              </Link>
              <Link
                href="/jobs"
                className="inline-flex min-h-10 items-center gap-2 bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-[#1d4b51]"
                style={{ borderRadius: 6 }}
              >
                <Activity aria-hidden className="h-4 w-4" />
                Monitor jobs
              </Link>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-line px-2 py-2 lg:hidden" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-10 items-center gap-2 px-3 py-2 text-sm font-medium ${
                    active ? "bg-cyan-50 text-brand" : "text-slate-700"
                  }`}
                  style={{ borderRadius: 6 }}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl space-y-4 p-4">
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
