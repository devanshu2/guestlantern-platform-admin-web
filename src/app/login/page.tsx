import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="panel w-full max-w-md">
        <div className="border-b border-line p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">GuestLantern</p>
          <h1 className="mt-1 text-xl font-semibold text-ink">Platform Admin</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Sign in to operate the control plane for tenant provisioning, repair, audit, and runtime diagnostics.
          </p>
        </div>
        <div className="p-5">
          <Suspense fallback={<p className="text-sm text-muted">Loading sign-in form...</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
