"use client";

import { LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { login } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {error ? (
        <Alert tone="danger" title="Sign in failed" live>
          {error}
        </Alert>
      ) : null}
      <Field
        label="Platform admin email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="username"
        helper="Use a platform-admin account. Tenant admin and customer credentials are intentionally rejected here. Example: admin@example.com."
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        helper="Enter the platform-admin password configured in the control plane. This app never stores it in browser storage."
        required
      />
      <Button type="submit" loading={loading} icon={<LogIn aria-hidden className="h-4 w-4" />} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
