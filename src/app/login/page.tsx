import { Suspense } from "react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { BrandMark } from "@/components/ui/brand-mark";
import { LoadingState } from "@/components/ui/data-state";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-canvas p-4 text-ink">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col justify-center gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BrandMark />
          <ThemeSwitcher compact />
        </div>
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_420px]">
          <section className="hidden rounded-lg border border-line bg-surface-raised p-6 shadow-panel lg:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Operator control plane
            </p>
            <h2 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-ink">
              Secure access for provisioning, repair, and audit operations.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Tenant readiness", "Job timeline", "Scoped audit"].map((item) => (
                <div key={item} className="rounded-lg border border-line bg-surface-muted p-3">
                  <p className="text-sm font-semibold text-ink">{item}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">Platform admin workflow</p>
                </div>
              ))}
            </div>
          </section>
          <section className="panel w-full">
            <div className="border-b border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                GuestLantern
              </p>
              <h1 className="mt-1 text-xl font-semibold text-ink">Platform Admin</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Sign in with a platform-admin account to continue.
              </p>
            </div>
            <div className="p-5">
              <Suspense fallback={<LoadingState>Loading sign-in form...</LoadingState>}>
                <LoginForm />
              </Suspense>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
